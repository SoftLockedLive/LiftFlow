import { getWorkouts } from "./workoutStorage";
import { getBaseExercise, getLiftSets, getWorkoutItems } from "./workoutAnalytics";

const BAR_WEIGHT = 45;

export function buildCoachRecommendation(lift, workouts = getWorkouts()) {
  const baseExercise = lift.baseExercise || lift.exercise;
  const history = collectLiftHistory(workouts, baseExercise);
  const target = parseRepTarget(lift.reps);
  const increment = getIncrement(lift);

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
  const sameWeightSets = latestSets.filter((set) => Number(set.weight || 0) === latestTopWeight);
  const avgReps = sameWeightSets.length
    ? sameWeightSets.reduce((sum, set) => sum + Number(set.reps || 0), 0) / sameWeightSets.length
    : 0;
  const context = buildHistoryContext(latest, target);

  const workingWeight = recommendWorkingWeight(latestTopWeight, avgReps, target, increment, context);
  const direction = workingWeight > latestTopWeight ? "increase" : workingWeight < latestTopWeight ? "reduce" : "hold";

  return {
    status: "ready",
    headline: `${workingWeight} lb`,
    detail: buildDetail(direction, latestTopWeight, avgReps, target, context),
    warmups: buildWarmupRamp(workingWeight, target, lift),
    warmupLabel: "Ramp-up sets",
    workingWeight,
    latestTopWeight,
    target,
    increment,
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
      label: `Next set: ${Math.max(BAR_WEIGHT, roundToNearest(lastWeight - increment, increment))} lb`,
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
  return (workouts || [])
    .slice()
    .reverse()
    .flatMap((session) => {
      const date = session?.date || null;
      return getWorkoutItems(session)
        .filter((lift) => getBaseExercise(lift) === baseExercise)
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

function recommendWorkingWeight(latestWeight, avgReps, target, increment, context) {
  if (!latestWeight) return null;
  if (avgReps >= target.max) {
    return context.confidence === "high"
      ? roundToNearest(latestWeight + increment, increment)
      : roundToNearest(latestWeight, increment);
  }
  if (avgReps < target.min) return Math.max(BAR_WEIGHT, roundToNearest(latestWeight - increment, increment));
  return roundToNearest(latestWeight, increment);
}

function buildWarmupRamp(workingWeight, target, lift) {
  if (!workingWeight || workingWeight <= BAR_WEIGHT) {
    return needsFullRamp(lift) ? [{ weight: BAR_WEIGHT, reps: "10-12" }] : [];
  }

  if (!needsFullRamp(lift)) {
    return [];
  }

  const ramp = [
    { weight: BAR_WEIGHT, reps: "10-12" },
    { weight: roundToNearest(workingWeight * 0.6, 5), reps: 5 },
  ];

  if (workingWeight >= 225 || target.max <= 5) {
    ramp.push({ weight: roundToNearest(workingWeight * 0.8, 5), reps: "2-3" });
  }

  return dedupeWarmups(ramp.filter((set) => set.weight < workingWeight));
}

function needsFullRamp(lift) {
  const name = String(lift?.exercise || lift?.baseExercise || "").toLowerCase();
  const fullRampExercises = [
    "bench",
    "squat",
    "deadlift",
    "romanian deadlift",
    "overhead press",
    "shoulder press",
    "leg press",
    "hack squat",
    "front squat",
  ];

  return fullRampExercises.some((exercise) => name.includes(exercise));
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

function getIncrement(lift) {
  return ["arms", "shoulders"].includes(lift.muscleGroup) ? 2.5 : 5;
}

function roundToNearest(value, increment) {
  return Math.round(Number(value || 0) / increment) * increment;
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

function buildDetail(direction, latestWeight, avgReps, target, context) {
  const reps = Math.round(avgReps * 10) / 10;
  const confidence = context.confidence === "high" ? "" : " Treat this as an estimate.";
  if (direction === "increase") return `Last time you averaged ${reps} reps at ${latestWeight} lb, above the ${target.min}-${target.max} target.${confidence}`;
  if (direction === "reduce") return `Last time you averaged ${reps} reps at ${latestWeight} lb, below the ${target.min}-${target.max} target.${confidence}`;
  return `Last time you averaged ${reps} reps at ${latestWeight} lb against today's ${target.min}-${target.max} target.${confidence}`;
}

function buildNextAction(workingWeight, lift) {
  if (!workingWeight) return "Pick a controlled starting weight.";
  return `${lift.sets} x ${lift.reps} at about ${workingWeight} lb.`;
}
