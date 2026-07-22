import { getPlan } from "./plan";
import { getWorkouts } from "./workoutStorage";
import { getManualPRs } from "./manualPRs";
import { buildPRMap, formatPR } from "./prRecords";
import { buildCoachRecommendation } from "./coach";
import { getBaseExercise } from "./workoutAnalytics";

/**
 * CORE SYSTEM:
 * Produces today's recommended workout
 */
export function buildTodaysWorkout(day, providedPlan = null, providedHistory = null, providedManualPrs = null) {
  const plan = providedPlan || getPlan();
  const history = providedHistory || getWorkouts();

  const baseWorkout = plan[day] || [];

  const prs = buildPRMap(history, providedManualPrs || getManualPRs());

  return baseWorkout.map((lift) => {
    const baseExercise = getBaseExercise(lift);
    const prRecord = prs[baseExercise];

    return {
      ...lift,

      // coach layer (soft suggestions only)
      displayPR: formatPR(prRecord),
      prRecord,
      coachRecommendation: buildCoachRecommendation(lift, history),

      // user always overrides this
      userOverride: null,
    };
  });
}
