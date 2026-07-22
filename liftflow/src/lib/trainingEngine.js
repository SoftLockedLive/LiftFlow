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

  const baseWorkout = Array.isArray(plan?.[day]) ? plan[day].filter(Boolean) : [];

  const prs = buildPRMap(history, providedManualPrs || getManualPRs());

  return baseWorkout.map((lift, index) => {
    const safeLift = normalizeWorkoutLift(lift, day, index);
    const baseExercise = getBaseExercise(safeLift);
    const prRecord = prs[baseExercise];

    return {
      ...safeLift,

      // coach layer (soft suggestions only)
      displayPR: formatPR(prRecord),
      prRecord,
      coachRecommendation: buildCoachRecommendation(safeLift, history),

      // user always overrides this
      userOverride: null,
    };
  });
}

function normalizeWorkoutLift(lift, day, index) {
  return {
    ...lift,
    id: lift.id || `${day}-${index}-${String(lift.exercise || "lift").replace(/[^a-z0-9]+/gi, "-")}`,
    exercise: stringifyField(lift.exercise, "Exercise"),
    muscleGroup: stringifyField(lift.muscleGroup, "other"),
    sets: stringifyField(lift.sets, ""),
    reps: stringifyField(lift.reps, ""),
    note: stringifyField(lift.note || lift.stretches, ""),
    stretches: stringifyField(lift.stretches || lift.note, ""),
  };
}

function stringifyField(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => stringifyField(item, "")).join(", ");
  if (typeof value === "object") {
    if ("reps" in value || "sets" in value) return [value.sets, value.reps].filter(Boolean).join(" x ");
    if ("label" in value) return String(value.label || fallback);
    if ("name" in value) return String(value.name || fallback);
  }
  return fallback;
}
