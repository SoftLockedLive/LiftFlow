import { getWorkouts } from "./workoutStorage";
import { getBaseExercise } from "./workoutAnalytics";

function getWorkoutItems(workout) {
  if (Array.isArray(workout)) return workout;
  if (Array.isArray(workout?.workout)) return workout.workout;
  return [];
}

/**
 * Determines next recommended weight for an exercise
 */
export function getNextLoad(exerciseName, currentWeight = 0) {
  const workouts = getWorkouts();

  let successRate = 0;
  let totalSets = 0;
  let completedSets = 0;

  workouts.forEach((workout) => {
    getWorkoutItems(workout).forEach((ex) => {
      if (getBaseExercise(ex) !== exerciseName) return;

      (ex.sets || []).forEach((set) => {
        totalSets++;

        if (set.weight >= currentWeight && set.reps > 0) {
          completedSets++;
        }
      });
    });
  });

  if (!currentWeight || totalSets === 0) return null;

  successRate = completedSets / totalSets;

  // 🔥 SIMPLE PROGRESSION RULES
  if (successRate >= 0.9) return currentWeight + 5;
  if (successRate >= 0.75) return currentWeight + 2.5;

  return currentWeight; // hold
}

/**
 * Returns recommendation per lift
 */
export function getProgramProgression(program = []) {
  return program.map((lift) => ({
    ...lift,
    nextWeight: getNextLoad(lift.baseExercise || lift.exercise, lift.weight || 0),
  }));
}
