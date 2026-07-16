import { getPlan } from "./plan";
import { getWorkouts } from "./workoutStorage";
import { calculateFatigue } from "./engine";
import { getManualPRs } from "./manualPRs";
import { buildPRMap, formatPR } from "./prRecords";
import { getNextLoad } from "./progression";
import { buildCoachRecommendation } from "./coach";
import { getBaseExercise } from "./workoutAnalytics";

/**
 * CORE SYSTEM:
 * Produces today's recommended workout
 */
export function buildTodaysWorkout(day) {
  const plan = getPlan();
  const history = getWorkouts();

  const baseWorkout = plan[day] || [];

  const fatigue = calculateFatigue(history);
  const prs = buildPRMap(history, getManualPRs());

  return baseWorkout.map((lift) => {
    const baseExercise = getBaseExercise(lift);
    const prRecord = prs[baseExercise];
    const lastPR = Number(prRecord?.weight || 0);

    const suggestedWeight = getNextLoad(
      baseExercise,
      lastPR
    );

    return {
      ...lift,

      // coach layer (soft suggestions only)
      suggestedWeight,
      displayPR: formatPR(prRecord),
      prRecord,
      coachRecommendation: buildCoachRecommendation(lift, history),

      // user always overrides this
      userOverride: null,
    };
  });
}
