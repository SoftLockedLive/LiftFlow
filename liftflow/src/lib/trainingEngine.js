import { getPlan } from "./plan";
import { getWorkouts } from "./workoutStorage";
import { calculateFatigue, getPRs } from "./engine";
import { getNextLoad } from "./progression";
import { buildCoachRecommendation } from "./coach";

/**
 * CORE SYSTEM:
 * Produces today's recommended workout
 */
export function buildTodaysWorkout(day) {
  const plan = getPlan();
  const history = getWorkouts();

  const baseWorkout = plan[day] || [];

  const fatigue = calculateFatigue(history);
  const prs = getPRs(history);

  return baseWorkout.map((lift) => {
    const baseExercise = lift.baseExercise || lift.exercise;
    const lastPR = prs[baseExercise] || 0;

    const suggestedWeight = getNextLoad(
      baseExercise,
      lastPR
    );

    return {
      ...lift,

      // coach layer (soft suggestions only)
      suggestedWeight,
      coachRecommendation: buildCoachRecommendation(lift, history),

      // user always overrides this
      userOverride: null,
    };
  });
}
