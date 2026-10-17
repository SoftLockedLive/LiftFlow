import { getManualPRs } from "./manualPRs";
import { getBaseExercise, getLiftSets, getWorkoutItems, normalizeExerciseName } from "./workoutAnalytics";

export function buildPRRecords(workouts = [], manualPrs = getManualPRs()) {
  const records = {};

  (Array.isArray(workouts) ? workouts : []).forEach((session) => {
    getWorkoutItems(session).forEach((lift) => {
      const exercise = getBaseExercise(lift);
      if (!exercise) return;

      getLiftSets(lift).forEach((set) => {
        const weight = Number(set.weight || 0);
        const reps = set.reps === undefined ? "" : Number(set.reps || 0);
        if (!records[exercise] || beats(weight, reps, records[exercise])) {
          records[exercise] = {
            exercise,
            weight,
            reps,
            muscleGroup: lift.muscleGroup || inferMuscleGroup(exercise),
            source: "history",
          };
        }
      });
    });
  });

  (Array.isArray(manualPrs) ? manualPrs : []).forEach((pr) => {
    const exercise = normalizeExerciseName(pr.exercise);
    const weight = Number(pr.weight || 0);
    if (!exercise || weight <= 0) return;
    const existing = records[exercise];
    // The heaviest record wins, whether logged or entered by hand.
    if (existing && !beats(weight, Number(pr.reps || 0), existing)) return;

    records[exercise] = {
      exercise,
      weight,
      reps: pr.reps || "",
      muscleGroup: pr.muscleGroup || existing?.muscleGroup || inferMuscleGroup(exercise),
      manualId: pr.id,
      source: "manual",
    };
  });

  return Object.values(records).sort((a, b) => b.weight - a.weight);
}

// Heavier wins; at the same weight, more reps wins.
function beats(weight, reps, record) {
  const recordWeight = Number(record?.weight || 0);
  if (weight !== recordWeight) return weight > recordWeight;
  return Number(reps || 0) > Number(record?.reps || 0);
}

export function buildPRMap(workouts = [], manualPrs = getManualPRs()) {
  return buildPRRecords(workouts, manualPrs).reduce((map, pr) => {
    map[pr.exercise] = pr;
    return map;
  }, {});
}

export function formatPR(pr) {
  const weight = Number(pr?.weight || 0);
  if (weight <= 0) return "No PR yet";
  return `PR ${weight} lb${pr.reps ? ` x ${pr.reps}` : ""}`;
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
