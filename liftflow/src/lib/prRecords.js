import { getManualPRs } from "./manualPRs";
import { formatWeight, getUnits } from "./units";
import { getBaseExercise, getLiftSets, getWorkoutItems, normalizeExerciseName } from "./workoutAnalytics";

// A manual PR overrides logged sets (e.g. a PR hit but never logged, or a bad log), until a set
// logged after it beats it. Without a manual PR, the best logged set is the record.
export function buildPRRecords(workouts = [], manualPrs = getManualPRs()) {
  const logged = {};
  (Array.isArray(workouts) ? workouts : []).forEach((session) => {
    const items = getWorkoutItems(session);
    // Old sessions were bare arrays with the date on each lift.
    const sessionDate = toTime(session?.date || items[0]?.date);
    items.forEach((lift) => {
      const exercise = getBaseExercise(lift);
      if (!exercise) return;
      const date = (Array.isArray(session) && toTime(lift?.date)) || sessionDate;
      getLiftSets(lift).forEach((set) => {
        const weight = Number(set.weight || 0);
        if (weight <= 0) return;
        const reps = set.reps === undefined ? "" : Number(set.reps || 0);
        (logged[exercise] ||= []).push({ weight, reps, date, muscleGroup: lift.muscleGroup });
      });
    });
  });

  const manual = {};
  (Array.isArray(manualPrs) ? manualPrs : []).forEach((pr) => {
    const exercise = normalizeExerciseName(pr.exercise);
    const weight = Number(pr.weight || 0);
    if (!exercise || weight <= 0) return;
    // If an exercise somehow has several manual entries, the most recent one is the override.
    if (manual[exercise] && toTime(manual[exercise].date) > toTime(pr.date)) return;
    manual[exercise] = pr;
  });

  const exercises = new Set([...Object.keys(logged), ...Object.keys(manual)]);
  return [...exercises]
    .map((exercise) => {
      const sets = logged[exercise] || [];
      const pr = manual[exercise];
      const manualDate = toTime(pr?.date);
      // Undated manual PRs (migrated profile fields) can be beaten by any logged set.
      const contenders = pr && manualDate ? sets.filter((set) => set.date > manualDate) : sets;
      const bestLogged = contenders.reduce(
        (best, set) => (!best || beats(set.weight, set.reps, best) ? set : best),
        null,
      );
      const muscleGroup =
        pr?.muscleGroup || sets.find((set) => set.muscleGroup)?.muscleGroup || inferMuscleGroup(exercise);

      if (pr && !(bestLogged && beats(bestLogged.weight, bestLogged.reps, pr))) {
        return {
          exercise,
          weight: Number(pr.weight),
          reps: pr.reps === undefined || pr.reps === null ? "" : pr.reps,
          date: manualDate || null,
          muscleGroup,
          manualId: pr.id,
          source: "manual",
        };
      }
      return {
        exercise,
        weight: bestLogged.weight,
        reps: bestLogged.reps,
        date: bestLogged.date || null,
        muscleGroup,
        source: "history",
      };
    })
    .sort((a, b) => b.weight - a.weight);
}

// Epoch ms from a stored date (timestamp or date string); 0 when missing or invalid.
function toTime(value) {
  if (!value) return 0;
  const number = Number(value);
  if (Number.isFinite(number)) return number;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

// Heavier wins; at the same weight, more reps wins.
function beats(weight, reps, record) {
  const recordWeight = Number(record?.weight || 0);
  if (weight !== recordWeight) return weight > recordWeight;
  return Number(reps || 0) > Number(record?.reps || 0);
}

// PRs set in a just-finished workout: per exercise, its best set if it beats the record as it
// stood before this workout (logged history plus manual PRs).
export function detectPRs(previousWorkouts, completedLifts, manualPrs = getManualPRs()) {
  const before = buildPRMap(previousWorkouts, manualPrs);
  const best = {};

  (Array.isArray(completedLifts) ? completedLifts : []).forEach((lift) => {
    const exercise = getBaseExercise(lift);
    getLiftSets(lift).forEach((set) => {
      const weight = Number(set.weight || 0);
      const reps = Number(set.reps || 0);
      if (!exercise || weight <= 0 || reps <= 0) return;
      if (before[exercise] && !beats(weight, reps, before[exercise])) return;
      if (best[exercise] && !beats(weight, reps, best[exercise])) return;
      best[exercise] = {
        exercise,
        variation: lift.variation || "",
        weight,
        reps,
        duration: set.duration || "",
        previous: Number(before[exercise]?.weight || 0),
      };
    });
  });

  return Object.values(best);
}

export function buildPRMap(workouts = [], manualPrs = getManualPRs()) {
  return buildPRRecords(workouts, manualPrs).reduce((map, pr) => {
    map[pr.exercise] = pr;
    return map;
  }, {});
}

// `pr.weight` is stored lb; shown in `units`.
export function formatPR(pr, units = getUnits()) {
  const weight = Number(pr?.weight || 0);
  if (weight <= 0) return "No PR yet";
  return `PR ${formatWeight(weight, units)}${pr.reps ? ` x ${pr.reps}` : ""}`;
}

export function inferMuscleGroup(exercise) {
  const name = String(exercise || "").toLowerCase();
  // Order matters: "leg curl" before arms, "overhead press" before chest, "lateral" isn't "lat".
  if (
    /leg (press|curl|extension)|squat|quad|hamstring|calf|lunge|split|hip thrust|glute|abduction|adduction/.test(name)
  )
    return "legs";
  if (/overhead|shoulder|military|lateral|rear delt|delt|face pull|arnold/.test(name)) return "shoulders";
  if (/curl|tricep|bicep|hammer|extension|pushdown|skull/.test(name)) return "arms";
  if (/bench|press|fly|chest|pec|dip|push-up/.test(name)) return "chest";
  if (/deadlift|row|pull|pulldown|\blats?\b|chin/.test(name)) return "back";
  if (/\bab|crunch|plank|leg raise|wheel|core|sit-up/.test(name)) return "core";
  return "other";
}
