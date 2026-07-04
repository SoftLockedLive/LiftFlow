import { getWorkouts } from "./workoutStorage";

function getWorkoutItems(workout) {
  if (Array.isArray(workout)) return workout;
  if (Array.isArray(workout?.workout)) return workout.workout;
  return [];
}

/**
 * Very simple adaptive coach v1
 * - looks at last session
 * - suggests + or - weight adjustments
 */

export function generateCoachSuggestions(plan) {
  const workouts = getWorkouts();
  const lastWorkout = getWorkoutItems(workouts[workouts.length - 1]);

  if (lastWorkout.length === 0) {
    return {};
  }

  return plan.reduce((suggestions, lift) => {
    const match = lastWorkout.find(
      (w) => w.exercise === lift.exercise
    );

    if (!match || !match.sets?.length) {
      return suggestions;
    }

    const avgReps =
      match.sets.reduce((sum, s) => sum + (s.reps || 0), 0) /
      match.sets.length;
    const targetReps = getTargetReps(lift.reps);

    let suggestion = "maintain";

    if (avgReps >= targetReps + 2) {
      suggestion = "increase_weight";
    } else if (avgReps <= targetReps - 2) {
      suggestion = "decrease_weight";
    }

    suggestions[lift.exercise] = suggestion;
    return suggestions;
  }, {});
}

function getTargetReps(reps) {
  const numbers = String(reps || "")
    .split("-")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));

  if (numbers.length === 0) return 0;
  return Math.max(...numbers);
}
