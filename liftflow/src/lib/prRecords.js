import { getManualPRs } from "./manualPRs";
import { getBaseExercise, getLiftSets, getWorkoutItems, normalizeExerciseName } from "./workoutAnalytics";

export function buildPRRecords(workouts = [], manualPrs = getManualPRs()) {
  const records = {};

  (workouts || []).forEach((session) => {
    getWorkoutItems(session).forEach((lift) => {
      const exercise = getBaseExercise(lift);
      if (!exercise) return;

      getLiftSets(lift).forEach((set) => {
        const weight = Number(set.weight || 0);
        const reps = set.reps === undefined ? "" : Number(set.reps || 0);
        if (!records[exercise] || weight > records[exercise].weight) {
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

  (manualPrs || []).forEach((pr) => {
    const exercise = normalizeExerciseName(pr.exercise);
    const weight = Number(pr.weight || 0);
    if (!exercise || weight <= 0) return;
    const existing = records[exercise];
    if (existing?.source === "manual" && weight < Number(existing.weight || 0)) return;

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
  if (/bench|press|fly|chest|pec/.test(name)) return "chest";
  if (/squat|leg|quad|hamstring|curl|calf|hack|lunge|split/.test(name)) return "legs";
  if (/deadlift|row|pull|pulldown|lat/.test(name)) return "back";
  if (/shoulder|overhead|lateral|delt|pec deck/.test(name)) return "shoulders";
  if (/curl|tricep|bicep|hammer|extension|pushdown/.test(name)) return "arms";
  if (/ab|crunch|plank|raise|wheel|core/.test(name)) return "core";
  return "other";
}
