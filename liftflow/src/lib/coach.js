import { getWorkouts } from "./workoutStorage";
import { getBaseExercise, getLiftSets, getWorkoutItems, normalizeExerciseName } from "./workoutAnalytics";

const BAR_WEIGHT = 45;
const MIN_MACHINE_LOAD = 5;

export function buildCoachRecommendation(lift, workouts = getWorkouts()) {
  const baseExercise = getBaseExercise(lift);
  const history = collectLiftHistory(workouts, baseExercise);
  const target = parseRepTarget(lift.reps);
  const increment = getIncrement(lift);
  const minimumLoad = getMinimumLoad(lift);

  if (history.length === 0) {
    return {
      status: "empty",
      headline: "Set starting weight",
      detail: "Log this lift once and coach recommendations will use your history.",
      warmups: [],
      workingWeight: null,
      workingSetPlan: "Flat sets by default.",
      nextAction: "Choose a weight you can control for the programmed reps.",
    };
  }

  const latest = history[0];
  const latestSets = latest.sets;
  const latestTopWeight = Math.max(...latestSets.map((set) => Number(set.weight || 0)), 0);
  const context = buildHistoryContext(latest, target);
  const setCount = parseSetCount(lift.sets);
  const grade = gradeLatestSession(latestSets, latestTopWeight, target, setCount);

  const workingWeight = recommendWorkingWeight(latestTopWeight, grade, increment, context, minimumLoad);
  const direction = workingWeight > latestTopWeight ? "increase" : workingWeight < latestTopWeight ? "reduce" : "hold";

  return {
    status: "ready",
    headline: `${workingWeight} lb`,
    detail: buildDetail(direction, latestTopWeight, grade, target, context),
    warmups: buildWarmupRamp(workingWeight, target, minimumLoad),
    warmupLabel: "Ramp-up sets",
    workingWeight,
    latestTopWeight,
    target,
    grade,
    increment,
    minimumLoad,
    confidence: context.confidence,
    contextNotes: context.notes,
    workingSetPlan: "Flat sets by default. Adjust only if reps fall off or it is clearly too light.",
    nextAction: buildNextAction(workingWeight, lift),
  };
}

export function buildLiveSetRecommendation(lift, loggedSets, coach) {
  const sets = getLiftSets({ sets: loggedSets });
  if (!coach?.workingWeight || sets.length === 0) return null;

  const target = coach.target || parseRepTarget(lift.reps);
  const increment = coach.increment || getIncrement(lift);
  const minimumLoad = coach.minimumLoad || getMinimumLoad(lift);
  const last = sets[sets.length - 1];
  const lastWeight = Number(last.weight || 0);
  const lastReps = Number(last.reps || 0);

  if (!lastWeight || !lastReps) return null;

  const knownPr = Math.max(Number(lift?.prRecord?.weight || 0), Number(coach.latestTopWeight || 0));
  if (knownPr > 0 && lastWeight > knownPr) {
    return {
      label: `New PR: ${lastWeight} lb`,
      detail: "You moved more weight than your previous best. Rest longer before deciding whether to repeat it.",
      tone: "up",
    };
  }

  if (lastReps > target.max) {
    return {
      label: `Next set: ${roundToNearest(lastWeight + increment, increment)} lb`,
      detail: `You exceeded the target range at ${lastWeight} lb.`,
      tone: "up",
    };
  }

  if (lastReps < target.min) {
    return {
      label: `Next set: ${Math.max(minimumLoad, roundToNearest(lastWeight - increment, increment))} lb`,
      detail: `You missed the low end of the range. Reduce slightly or rest longer.`,
      tone: "down",
    };
  }

  return {
    label: `Next set: stay at ${lastWeight} lb`,
    detail: lastReps === target.max
      ? "You hit the top of the range. Hold this weight for the workout; progress next time if the sets stay strong."
      : "You are inside the target range.",
    tone: "hold",
  };
}

function collectLiftHistory(workouts, baseExercise) {
  const targetExercise = normalizeExerciseName(baseExercise);
  return (workouts || [])
    .slice()
    .reverse()
    .flatMap((session) => {
      const date = session?.date || null;
      return getWorkoutItems(session)
        .filter((lift) => getBaseExercise(lift) === targetExercise)
        .map((lift) => ({
          date,
          target: parseRepTarget(lift.reps || lift.plannedReps),
          targetLabel: lift.reps || lift.plannedReps || "",
          variation: lift.variation || "",
          sets: getLiftSets(lift).filter((set) => Number(set.weight || 0) > 0 && Number(set.reps || 0) > 0),
        }));
    })
    .filter((entry) => entry.sets.length > 0)
    .slice(0, 6);
}

function recommendWorkingWeight(latestWeight, grade, increment, context, minimumLoad) {
  if (!latestWeight) return null;
  if (context.confidence !== "high") return roundToNearest(latestWeight, increment);

  if (grade.result === "strong-pass") {
    const jump = getProgressionJump(latestWeight, grade, target);
    return roundToNearest(latestWeight + jump, increment);
  }

  if (grade.result === "pass") {
    const jump = latestWeight >= 50 ? increment : 0;
    return roundToNearest(latestWeight + jump, increment);
  }

  if (grade.result === "miss") return Math.max(minimumLoad, roundToNearest(latestWeight - increment, increment));
  return roundToNearest(latestWeight, increment);
}

function buildWarmupRamp(workingWeight, target, minimumLoad) {
  if (!workingWeight || workingWeight < 50) return [];

  const ramp = [];
  if (workingWeight >= 100) {
    ramp.push({ weight: minimumLoad, reps: minimumLoad === BAR_WEIGHT ? "8-10" : "10-12" });
    ramp.push({ weight: roundToNearest(workingWeight * 0.6, 5), reps: target.max <= 5 ? 3 : 5 });
  } else {
    ramp.push({ weight: Math.max(minimumLoad, roundToNearest(workingWeight * 0.5, 5)), reps: "8-10" });
  }

  if (workingWeight >= 185 || target.max <= 5) {
    ramp.push({ weight: roundToNearest(workingWeight * 0.8, 5), reps: "2-3" });
  }

  return dedupeWarmups(ramp.filter((set) => set.weight < workingWeight));
}

function dedupeWarmups(sets) {
  const seen = new Set();
  return sets.filter((set) => {
    if (seen.has(set.weight)) return false;
    seen.add(set.weight);
    return true;
  });
}

function parseRepTarget(reps) {
  const numbers = String(reps || "")
    .match(/\d+/g)
    ?.map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0) || [];

  if (numbers.length === 0) return { min: 1, max: 1 };
  return { min: Math.min(...numbers), max: Math.max(...numbers) };
}

function parseSetCount(sets) {
  const numbers = String(sets || "")
    .match(/\d+/g)
    ?.map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0) || [];
  return numbers[0] || 0;
}

function gradeLatestSession(sets, latestWeight, target, setCount) {
  const latestSets = sets.filter((set) => Number(set.weight || 0) === latestWeight);
  const evaluatedSets = setCount > 0 ? sets.slice(0, setCount) : sets;
  const fullSetCount = setCount === 0 || evaluatedSets.length >= setCount;
  const allAtTopWeight = evaluatedSets.length > 0 && evaluatedSets.every((set) => Number(set.weight || 0) === latestWeight);
  const reps = latestSets.map((set) => Number(set.reps || 0));
  const evaluatedReps = evaluatedSets.map((set) => Number(set.reps || 0));
  const avgReps = reps.length ? round1(reps.reduce((sum, value) => sum + value, 0) / reps.length) : 0;
  const lowestRep = reps.length ? Math.min(...reps) : 0;
  const lowestEvaluatedRep = evaluatedReps.length ? Math.min(...evaluatedReps) : 0;
  const completedTopSets = latestSets.length;
  const requiredSets = setCount || completedTopSets;

  if (!fullSetCount || !allAtTopWeight || lowestEvaluatedRep < target.min) {
    return {
      result: lowestEvaluatedRep && lowestEvaluatedRep < target.min ? "miss" : "hold",
      completedTopSets,
      requiredSets,
      avgReps,
      lowestRep: lowestEvaluatedRep || lowestRep,
    };
  }

  if (lowestRep >= target.max) {
    return { result: "strong-pass", completedTopSets, requiredSets, avgReps, lowestRep };
  }

  return { result: "pass", completedTopSets, requiredSets, avgReps, lowestRep };
}

function getProgressionJump(latestWeight, grade, target) {
  if (latestWeight >= 100) return 10;
  if (latestWeight >= 25) return 5;
  return grade.lowestRep >= target.max + 2 ? 5 : 0;
}

function getIncrement(lift) {
  return 5;
}

function getMinimumLoad(lift) {
  const name = String(lift?.exercise || lift?.baseExercise || "").toLowerCase();
  const barbellFloor = [
    "bench press",
    "back squat",
    "front squat",
    "deadlift",
    "overhead press",
    "standing overhead press",
    "barbell",
    "ez-bar",
  ];
  const nonBarbell = ["cable", "dumbbell", "machine", "lat pulldown", "pec deck", "leg curl", "leg extension"];

  if (nonBarbell.some((item) => name.includes(item))) return MIN_MACHINE_LOAD;
  return barbellFloor.some((item) => name.includes(item)) ? BAR_WEIGHT : MIN_MACHINE_LOAD;
}

function roundToNearest(value, increment) {
  return Math.round(Number(value || 0) / increment) * increment;
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function buildHistoryContext(latest, currentTarget) {
  const notes = [];
  let confidence = "high";

  if (latest.targetLabel && !sameRepTarget(latest.target, currentTarget)) {
    confidence = "medium";
    notes.push(`Last log used ${latest.targetLabel}, so this is a rep-range estimate.`);
  }

  if (latest.variation) {
    confidence = "medium";
    notes.push(`Last log was ${latest.variation}, so compare the load loosely.`);
  }

  return { confidence, notes };
}

function sameRepTarget(a, b) {
  return Number(a?.min || 0) === Number(b?.min || 0) && Number(a?.max || 0) === Number(b?.max || 0);
}

function buildDetail(direction, latestWeight, grade, target, context) {
  const confidence = context.confidence === "high" ? "" : " Treat this as an estimate.";
  const setSummary = `${grade.completedTopSets}/${grade.requiredSets} top sets, lowest ${grade.lowestRep || "--"} reps`;
  if (direction === "increase") return `Last time: ${setSummary} at ${latestWeight} lb against ${target.min}-${target.max}. Progress by the smallest useful jump.${confidence}`;
  if (direction === "reduce") return `Last time: ${setSummary} at ${latestWeight} lb, below the ${target.min}-${target.max} target. Reduce slightly and rebuild.${confidence}`;
  return `Last time: ${setSummary} at ${latestWeight} lb against ${target.min}-${target.max}. Hold until every set is clean.${confidence}`;
}

function buildNextAction(workingWeight, lift) {
  if (!workingWeight) return "Pick a controlled starting weight.";
  return `${lift.sets} x ${lift.reps} at about ${workingWeight} lb.`;
}
