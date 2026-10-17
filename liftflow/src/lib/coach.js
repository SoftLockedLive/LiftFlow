import { getWorkouts } from "./workoutStorage";
import { getBaseExercise, getLiftSets, getWorkoutItems, normalizeExerciseName } from "./workoutAnalytics";
import { getLoadProfile } from "./loadProfiles";

export function buildCoachRecommendation(lift, workouts = getWorkouts()) {
  if (lift?.targetType === "time") {
    return {
      status: "timed",
      headline: lift.duration || lift.reps || "Timed",
      detail: "Timed exercises are tracked by duration, so the coach will not force rep-based load jumps.",
      warmups: [],
      workingWeight: null,
      workingSetPlan: "Hold clean position for the programmed time.",
      nextAction: `${lift.sets || "--"} sets x ${lift.duration || lift.reps || "--"}.`,
    };
  }

  const baseExercise = getBaseExercise(lift);
  const loadProfile = getLoadProfile(lift);
  const history = collectLiftHistory(workouts, baseExercise, loadProfile.type === "bodyweight");
  const target = parseRepTarget(lift.reps);
  const increment = getIncrement(lift);
  const minimumLoad = loadProfile.minimumLoad;

  if (history.length === 0) {
    const prWeight = Number(lift?.prRecord?.weight || 0);
    if (prWeight > 0) {
      const estimatedWeight = estimateFromPR(prWeight, target, increment, minimumLoad);
      return {
        status: "estimated",
        headline: `${estimatedWeight} lb`,
        detail: `Estimated from your manual PR of ${prWeight} lb. Start here only if warmups feel clean.`,
        warmups: buildWarmupRamp(estimatedWeight, target, loadProfile),
        warmupLabel: "Optional ramp",
        workingWeight: estimatedWeight,
        latestTopWeight: prWeight,
        target,
        increment,
        minimumLoad,
        loadType: loadProfile.type,
        confidence: "medium",
        contextNotes: ["No logged sets for this lift yet, so this uses your PR tab as the anchor."],
        workingSetPlan: "Use flat sets. Adjust down if bar speed or form drops early.",
        nextAction: buildNextAction(estimatedWeight, lift),
      };
    }

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

  if (!latestTopWeight) {
    return buildBodyweightRecommendation(lift, grade, target, increment, context, loadProfile);
  }

  const jump = getRecommendedJump(latestTopWeight, grade, increment, context, target, loadProfile);
  const workingWeight = recommendWorkingWeight(latestTopWeight, grade, increment, context, minimumLoad, jump);
  const direction = workingWeight > latestTopWeight ? "increase" : workingWeight < latestTopWeight ? "reduce" : "hold";

  return {
    status: "ready",
    headline: `${workingWeight} lb`,
    detail: buildDetail(direction, latestTopWeight, grade, target, context, jump, minimumLoad),
    warmups: buildWarmupRamp(workingWeight, target, loadProfile),
    warmupLabel: "Ramp-up sets",
    workingWeight,
    latestTopWeight,
    target,
    grade,
    increment,
    jump,
    minimumLoad,
    loadType: loadProfile.type,
    confidence: context.confidence,
    contextNotes: context.notes,
    workingSetPlan: "Flat sets by default. Adjust only if reps fall off or it is clearly too light.",
    nextAction: buildNextAction(workingWeight, lift),
  };
}

export function buildLiveSetRecommendation(lift, loggedSets, coach) {
  if (lift?.targetType === "time") return null;
  const sets = getLiftSets({ sets: loggedSets });
  if (!coach?.workingWeight || sets.length === 0) return null;

  const target = coach.target || parseRepTarget(lift.reps);
  const increment = coach.increment || getIncrement(lift);
  const minimumLoad = coach.minimumLoad || getLoadProfile(lift).minimumLoad;
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
      label: `Next set: ${lastWeight + increment} lb`,
      detail: `You exceeded the target range at ${lastWeight} lb.`,
      tone: "up",
    };
  }

  if (lastReps < target.min) {
    return {
      label: `Next set: ${reduceLoad(lastWeight, increment, minimumLoad)} lb`,
      detail: `You missed the low end of the range. Reduce slightly or rest longer.`,
      tone: "down",
    };
  }

  return {
    label: `Next set: stay at ${lastWeight} lb`,
    detail:
      lastReps === target.max
        ? "You hit the top of the range. Hold this weight for the workout; progress next time if the sets stay strong."
        : "You are inside the target range.",
    tone: "hold",
  };
}

function collectLiftHistory(workouts, baseExercise, allowRepsOnly = false) {
  const targetExercise = normalizeExerciseName(baseExercise);
  return (Array.isArray(workouts) ? workouts : [])
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
          variation: getVariationNote(lift),
          sets: getCoachSets(lift, allowRepsOnly),
        }));
    })
    .filter((entry) => entry.sets.length > 0)
    .slice(0, 6);
}

// Logged sets the coach can grade. Weighted sets always win; a bodyweight lift
// logged with reps only (no added load) is graded on reps instead.
function getCoachSets(lift, allowRepsOnly) {
  const repSets = getLiftSets(lift).filter((set) => Number(set.reps || 0) > 0);
  const weightedSets = repSets.filter((set) => Number(set.weight || 0) > 0);
  if (weightedSets.length > 0 || !allowRepsOnly) return weightedSets;
  return repSets.map((set) => ({ ...set, weight: 0 }));
}

// Swapped lifts are saved with a "Planned: X" marker. That records what the plan
// called for, not a variation of the performed lift, so it should not lower confidence.
function getVariationNote(lift) {
  const variation = String(lift.variation || "").trim();
  if (!variation || /^planned:/i.test(variation)) return "";
  return variation;
}

// Holds keep the exact logged weight and jumps are added as-is, so the headline
// always matches the text (17.5 lb stays 17.5 lb, 102.5 lb + 10 is 112.5 lb).
function recommendWorkingWeight(latestWeight, grade, increment, context, minimumLoad, jump) {
  if (!latestWeight) return null;
  if (context.confidence !== "high") return latestWeight;
  if (grade.result === "strong-pass" || grade.result === "pass") return latestWeight + jump;
  if (grade.result === "miss") return reduceLoad(latestWeight, increment, minimumLoad);
  return latestWeight;
}

// A miss never recommends more than the weight that was just missed, even if the
// configured minimum load is above it.
function reduceLoad(weight, increment, minimumLoad) {
  return Math.min(weight, Math.max(minimumLoad, weight - increment));
}

function buildBodyweightRecommendation(lift, grade, target, increment, context, loadProfile) {
  const confident = context.confidence === "high";
  const setSummary = `${grade.completedTopSets}/${grade.requiredSets} sets, lowest ${grade.lowestRep || "--"} reps`;
  const estimate = confident ? "" : " Treat this as an estimate.";
  const base = {
    status: "ready",
    warmups: [],
    warmupLabel: "Ramp-up sets",
    workingWeight: null,
    latestTopWeight: 0,
    target,
    grade,
    increment,
    jump: 0,
    minimumLoad: loadProfile.minimumLoad,
    loadType: loadProfile.type,
    confidence: context.confidence,
    contextNotes: context.notes,
    workingSetPlan: "Flat sets at bodyweight. Add reps before adding load.",
  };

  if (confident && grade.result === "strong-pass") {
    return {
      ...base,
      headline: `Add ${increment} lb`,
      detail: `Last time: ${setSummary} at bodyweight against ${target.min}-${target.max}. Every set reached the top of the range, so add ${increment} lb (belt or held dumbbell) and rebuild reps.`,
      workingWeight: increment,
      jump: increment,
      nextAction: `${lift.sets} x ${lift.reps} with about ${increment} lb added.`,
    };
  }

  if (confident && grade.result === "pass") {
    const goal = Math.min(target.max, grade.lowestRep + 1);
    return {
      ...base,
      headline: `Bodyweight × ${goal}`,
      detail: `Last time: ${setSummary} at bodyweight against ${target.min}-${target.max}. Add a rep: aim for ${goal} on every set before adding load.`,
      nextAction: `${lift.sets} x ${goal} reps at bodyweight.`,
    };
  }

  if (grade.result === "miss") {
    return {
      ...base,
      headline: `Bodyweight × ${target.min}`,
      detail: `Last time: ${setSummary} at bodyweight, below the ${target.min}-${target.max} target. Rebuild to ${target.min} reps on every set; use assistance if reps fall off early.${estimate}`,
      nextAction: `${lift.sets} x ${target.min} reps at bodyweight.`,
    };
  }

  const goal = Math.min(target.max, Math.max(target.min, grade.lowestRep));
  return {
    ...base,
    headline: `Bodyweight × ${goal}`,
    detail: `Last time: ${setSummary} at bodyweight against ${target.min}-${target.max}. ${
      grade.result === "hold" ? "Hold until every set is clean." : "Repeat these reps before progressing."
    }${estimate}`,
    nextAction: `${lift.sets} x ${goal} reps at bodyweight.`,
  };
}

function buildWarmupRamp(workingWeight, target, loadProfile) {
  if (!workingWeight || workingWeight < 50) return [];

  const ramp = [];
  const barbellRamp = loadProfile.type === "barbell" && workingWeight >= 95;

  if (barbellRamp) {
    ramp.push({ weight: loadProfile.minimumLoad, reps: "8-10" });
  } else {
    ramp.push({ weight: rampWeight(workingWeight, loadProfile.minimumLoad, 0.5), reps: "8-10" });
  }

  if (workingWeight >= 100) {
    ramp.push({
      weight: rampWeight(workingWeight, loadProfile.minimumLoad, barbellRamp ? 0.6 : 0.7),
      reps: target.max <= 5 ? 3 : 5,
    });
  }

  if (workingWeight >= 185 || target.max <= 5) {
    ramp.push({ weight: rampWeight(workingWeight, loadProfile.minimumLoad, 0.85), reps: "2-3" });
  }

  return dedupeWarmups(ramp.filter((set) => set.weight < workingWeight));
}

function rampWeight(workingWeight, minimumLoad, percent) {
  return Math.max(minimumLoad, roundToNearest(workingWeight * percent, 5));
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
  const numbers =
    String(reps || "")
      .match(/\d+/g)
      ?.map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0) || [];

  if (numbers.length === 0) return { min: 1, max: 1 };
  return { min: Math.min(...numbers), max: Math.max(...numbers) };
}

function parseSetCount(sets) {
  const numbers =
    String(sets || "")
      .match(/\d+/g)
      ?.map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0) || [];
  return numbers[0] || 0;
}

function gradeLatestSession(sets, latestWeight, target, setCount) {
  const latestSets = sets.filter((set) => Number(set.weight || 0) === latestWeight);
  const evaluatedSets = setCount > 0 ? sets.slice(0, setCount) : sets;
  const fullSetCount = setCount === 0 || evaluatedSets.length >= setCount;
  const allAtTopWeight =
    evaluatedSets.length > 0 && evaluatedSets.every((set) => Number(set.weight || 0) === latestWeight);
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

function getRecommendedJump(latestWeight, grade, increment, context, target, loadProfile) {
  if (context.confidence !== "high") return 0;
  if (!["pass", "strong-pass"].includes(grade.result)) return 0;
  if (latestWeight < loadProfile.minimumLoad) return 0;

  const baseJump = loadProfile.type === "barbell" && latestWeight >= 100 ? 10 : increment;
  if (grade.result === "strong-pass") return baseJump;
  if (grade.lowestRep >= target.max) return increment;
  return latestWeight >= 50 ? increment : 0;
}

function getIncrement(lift) {
  return 5;
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

function estimateFromPR(prWeight, target, increment, minimumLoad) {
  const repFactor = target.max <= 5 ? 0.86 : target.max <= 8 ? 0.78 : target.max <= 12 ? 0.7 : 0.62;
  return Math.max(minimumLoad, roundToNearest(prWeight * repFactor, increment));
}

function buildDetail(direction, latestWeight, grade, target, context, jump, minimumLoad) {
  const confidence = context.confidence === "high" ? "" : " Treat this as an estimate.";
  const setSummary = `${grade.completedTopSets}/${grade.requiredSets} top sets, lowest ${grade.lowestRep || "--"} reps`;
  if (direction === "increase")
    return `Last time: ${setSummary} at ${latestWeight} lb against ${target.min}-${target.max}. Add ${jump} lb because the programmed work was completed cleanly.${confidence}`;
  if (direction === "reduce")
    return `Last time: ${setSummary} at ${latestWeight} lb, below the ${target.min}-${target.max} target. Reduce slightly and rebuild.${confidence}`;
  return `Last time: ${setSummary} at ${latestWeight} lb against ${target.min}-${target.max}. ${getHoldReason(latestWeight, grade, target, context, minimumLoad)}${confidence}`;
}

function getHoldReason(latestWeight, grade, target, context, minimumLoad) {
  if (context.confidence !== "high") return "Repeat this load to re-check it before progressing.";
  if (grade.result === "miss") return `Already at the ${minimumLoad} lb minimum, so hold and rebuild reps.`;
  if (grade.result === "hold") return "Hold until every set is clean.";
  if (latestWeight < minimumLoad)
    return `Every set was clean, but ${latestWeight} lb is under this lift's ${minimumLoad} lb minimum load. Check the equipment type before adding weight.`;
  // Light lifts (under 50 lb) progress reps first: a fixed jump is a big relative increase.
  return `All sets clean. Build every set to ${target.max} reps before adding weight.`;
}

function buildNextAction(workingWeight, lift) {
  if (!workingWeight) return "Pick a controlled starting weight.";
  return `${lift.sets} x ${lift.reps} at about ${workingWeight} lb.`;
}
