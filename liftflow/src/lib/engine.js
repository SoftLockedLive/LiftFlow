import { getWorkouts } from "./workoutStorage";

/**
 * PR SYSTEM
 * Finds max lift per exercise across all workouts
 */
export function calculatePRs(workouts = getWorkouts()) {
  const prs = {};

  workouts.forEach((workout) => {
    workout.forEach((exercise) => {
      const name = exercise.exercise;

      if (!prs[name]) {
        prs[name] = {
          weight: 0,
          reps: 0,
        };
      }

      exercise.sets.forEach((set) => {
        const weight = set.weight || 0;
        const reps = set.reps || 0;

        if (weight > prs[name].weight) {
          prs[name].weight = weight;
          prs[name].reps = reps;
        }
      });
    });
  });

  return prs;
}

/**
 * Calculates total volume for a workout set array
 */
function calculateSetVolume(set) {
  return (set.weight || 0) * (set.reps || 0);
}

/**
 * Calculates total workout volume
 */
export function calculateWorkoutVolume(workout) {
  return workout.reduce((total, exercise) => {
    const exerciseVolume = exercise.sets.reduce((sum, set) => {
      return sum + calculateSetVolume(set);
    }, 0);

    return total + exerciseVolume;
  }, 0);
}

/**
 * Returns estimated fatigue score based on recent workouts
 */
export function calculateFatigue(workouts = getWorkouts()) {
  const last3 = workouts.slice(-3);

  let fatigue = 0;

  last3.forEach((workout) => {
    fatigue += calculateWorkoutVolume(workout);
  });

  return fatigue;
}

/**
 * Simple intensity recommendation engine
 */
export function intensityLevel(fatigue) {
  if (fatigue < 3000) return "HIGH";
  if (fatigue < 6000) return "MODERATE";
  return "LOW (DELOAD RECOMMENDED)";
}

/**
 * PR detection (simple version)
 */
export function getPRs(workouts = getWorkouts()) {
  const prs = {};

  workouts.forEach((workout) => {
    workout.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        const weight = set.weight || 0;

        if (!prs[exercise.exercise]) {
          prs[exercise.exercise] = weight;
        }

        if (weight > prs[exercise.exercise]) {
          prs[exercise.exercise] = weight;
        }
      });
    });
  });

  return prs;
}