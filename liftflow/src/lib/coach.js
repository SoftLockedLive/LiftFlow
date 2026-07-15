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

  const workingWeight = recommendWorkingWeight(latestTopWeight, avgReps, target, increment);
  const direction = workingWeight > latestTopWeight ? "increase" : workingWeight < latestTopWeight ? "reduce" : "hold";

  return {
    status: "ready",
    headline: `${workingWeight} lb working weight`,
    detail: buildDetail(direction, latestTopWeight, avgReps, target),
    warmups: buildWarmupRamp(workingWeight, target),
    workingWeight,
    latestTopWeight,
    target,
    increment,
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

  if (lastReps >= target.max) {
    return {
      label: `Next set: ${roundToNearest(lastWeight + increment, increment)} lb`,
      detail: `You hit the top of the range at ${lastWeight} lb.`,
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
    detail: "You are inside the target range.",
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
          sets: getLiftSets(lift).filter((set) => Number(set.weight || 0) > 0 && Number(set.reps || 0) > 0),
        }));
    })
    .filter((entry) => entry.sets.length > 0)
    .slice(0, 6);
}

function recommendWorkingWeight(latestWeight, avgReps, target, increment) {
  if (!latestWeight) return null;
  if (avgReps >= target.max) return roundToNearest(latestWeight + increment, increment);
  if (avgReps < target.min) return Math.max(BAR_WEIGHT, roundToNearest(latestWeight - increment, increment));
  return roundToNearest(latestWeight, increment);
}

function buildWarmupRamp(workingWeight, target) {
  if (!workingWeight || workingWeight <= BAR_WEIGHT) {
    return [{ weight: BAR_WEIGHT, reps: Math.min(10, Math.max(target.max, 5)) }];
  }

  const ramp = [
    { weight: BAR_WEIGHT, reps: 10 },
    { weight: roundToNearest(workingWeight * 0.55, 5), reps: 5 },
    { weight: roundToNearest(workingWeight * 0.72, 5), reps: 3 },
  ];

  if (workingWeight >= 185) {
    ramp.push({ weight: roundToNearest(workingWeight * 0.85, 5), reps: 1 });
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

function getIncrement(lift) {
  return ["arms", "shoulders"].includes(lift.muscleGroup) ? 2.5 : 5;
}

function roundToNearest(value, increment) {
  return Math.round(Number(value || 0) / increment) * increment;
}

function buildDetail(direction, latestWeight, avgReps, target) {
  const reps = Math.round(avgReps * 10) / 10;
  if (direction === "increase") return `Last time you averaged ${reps} reps at ${latestWeight} lb, above the ${target.min}-${target.max} target.`;
  if (direction === "reduce") return `Last time you averaged ${reps} reps at ${latestWeight} lb, below the ${target.min}-${target.max} target.`;
  return `Last time you averaged ${reps} reps at ${latestWeight} lb, inside the ${target.min}-${target.max} target.`;
}

function buildNextAction(workingWeight, lift) {
  if (!workingWeight) return "Pick a controlled starting weight.";
  return `Start working sets around ${workingWeight} lb for ${lift.sets} x ${lift.reps}.`;
}
