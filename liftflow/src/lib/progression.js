import { getWorkouts } from "./workoutStorage";

/**
 * Determines next recommended weight for an exercise
 */
export function getNextLoad(exerciseName, currentWeight = 0) {
  const workouts = getWorkouts();

  let successRate = 0;
  let totalSets = 0;
  let completedSets = 0;

  workouts.forEach((workout) => {
    workout.forEach((ex) => {
      if (ex.exercise !== exerciseName) return;

      ex.sets.forEach((set) => {
        totalSets++;

        if (set.weight >= currentWeight && set.reps > 0) {
          completedSets++;
        }
      });
    });
  });

  successRate = totalSets === 0 ? 1 : completedSets / totalSets;

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
    nextWeight: getNextLoad(lift.exercise, lift.weight || 0),
  }));
}