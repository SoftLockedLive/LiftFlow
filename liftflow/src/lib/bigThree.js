import { buildPRMap } from "./prRecords";
import { getBaseExercise, getLiftSets, getWorkoutItems, normalizeExerciseName } from "./workoutAnalytics";

// Best bench/squat/deadlift from logged sets, manual PRs and the profile's own PR fields.
export function getBigThree(profile = {}, workouts = [], manualPrs = []) {
  const prs = buildPRMap(workouts, manualPrs);
  const bestSets = getBigThreeBestSets(workouts, manualPrs);
  const benchRecord = prs["Bench Press"];
  const squatRecord = prs.Squat;
  const deadliftRecord = prs.Deadlift;
  const bench = Math.max(Number(profile.benchPR || 0), Number(benchRecord?.weight || 0));
  const squat = Math.max(Number(profile.squatPR || 0), Number(squatRecord?.weight || 0));
  const deadlift = Math.max(Number(profile.deadliftPR || 0), Number(deadliftRecord?.weight || 0));

  return {
    total: bench + squat + deadlift,
    lifts: [
      { label: "Bench", value: bench, reps: benchRecord?.reps || bestSets.bench?.reps },
      { label: "Squat", value: squat, reps: squatRecord?.reps || bestSets.squat?.reps },
      { label: "Deadlift", value: deadlift, reps: deadliftRecord?.reps || bestSets.deadlift?.reps },
    ],
  };
}

function getBigThreeBestSets(workouts, manualPrs) {
  const best = {};

  (workouts || []).forEach((session) => {
    getWorkoutItems(session).forEach((lift) => {
      const key = getBigThreeKey(getBaseExercise(lift));
      if (!key) return;

      getLiftSets(lift).forEach((set) => {
        const weight = Number(set.weight || 0);
        if (weight > Number(best[key]?.weight || 0)) {
          best[key] = { weight, reps: Number(set.reps || 0) || "" };
        }
      });
    });
  });

  (manualPrs || []).forEach((pr) => {
    const key = getBigThreeKey(normalizeExerciseName(pr.exercise));
    const weight = Number(pr.weight || 0);
    if (key && weight > 0) {
      best[key] = { weight, reps: pr.reps || "" };
    }
  });

  return best;
}

function getBigThreeKey(exercise) {
  const name = String(exercise || "").toLowerCase();
  if (name.includes("bench")) return "bench";
  if (name.includes("squat")) return "squat";
  if (name.includes("deadlift")) return "deadlift";
  return "";
}
