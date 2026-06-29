import { getWorkouts } from "./workoutStorage";

/**
 * Very simple adaptive coach v1
 * - looks at last session
 * - suggests + or - weight adjustments
 */

export function generateCoachSuggestions(plan) {
  const workouts = getWorkouts();
  const lastWorkout = workouts[workouts.length - 1];

  if (!lastWorkout) {
    return plan.map((lift) => ({
      ...lift,
      suggestion: "start_normal",
    }));
  }

  return plan.map((lift) => {
    const match = lastWorkout.find(
      (w) => w.exercise === lift.exercise
    );

    if (!match || !match.sets?.length) {
      return {
        ...lift,
        suggestion: "no_data",
      };
    }

    const avgReps =
      match.sets.reduce((sum, s) => sum + (s.reps || 0), 0) /
      match.sets.length;

    let suggestion = "maintain";

    if (avgReps >= lift.reps + 2) {
      suggestion = "increase_weight";
    } else if (avgReps <= lift.reps - 2) {
      suggestion = "decrease_weight";
    }

    return {
      ...lift,
      suggestion,
    };
  });
}