import { getWorkouts } from "./workoutStorage";

/**
 * Normalize workout shape safely
 */
function normalizeWorkout(workout) {
  // supports both old + new structures safely
  if (Array.isArray(workout)) return workout;
  if (workout?.workout) return workout.workout;
  return [];
}

/**
 * Returns average performance per exercise
 */
export function getExerciseTrends() {
  const workouts = getWorkouts();
  const stats = {};

  workouts.forEach((session) => {
    const lifts = normalizeWorkout(session);

    lifts.forEach((lift) => {
      if (!stats[lift.exercise]) {
        stats[lift.exercise] = {
          totalWeight: 0,
          count: 0,
          lastWeight: 0,
        };
      }

      lift.sets.forEach((set) => {
        if (!set.weight) return;

        stats[lift.exercise].totalWeight += set.weight;
        stats[lift.exercise].count += 1;
        stats[lift.exercise].lastWeight = set.weight;
      });
    });
  });

  return stats;
}

/**
 * SINGLE PR SYSTEM (FIXED + CONSISTENT)
 * Returns max weight per exercise
 */
export function getPRs(workouts = getWorkouts()) {
  const prs = {};

  workouts.forEach((session) => {
    const lifts = normalizeWorkout(session);

    lifts.forEach((exercise) => {
      const name = exercise.exercise;

      if (!prs[name]) {
        prs[name] = 0;
      }

      exercise.sets.forEach((set) => {
        const weight = set.weight || 0;

        if (weight > prs[name]) {
          prs[name] = weight;
        }
      });
    });
  });

  return prs;
}

/**
 * Calculates total volume for a workout
 */
function calculateSetVolume(set) {
  return (set.weight || 0) * (set.reps || 0);
}

export function calculateWorkoutVolume(workout) {
  const lifts = normalizeWorkout(workout);

  return lifts.reduce((total, exercise) => {
    const exerciseVolume = exercise.sets.reduce((sum, set) => {
      return sum + calculateSetVolume(set);
    }, 0);

    return total + exerciseVolume;
  }, 0);
}

/**
 * Fatigue based on last 3 workouts
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
 * Intensity recommendation
 */
export function intensityLevel(fatigue) {
  if (fatigue < 3000) return "HIGH";
  if (fatigue < 6000) return "MODERATE";
  return "LOW (DELOAD RECOMMENDED)";
}