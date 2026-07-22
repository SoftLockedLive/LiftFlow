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
  const history = Array.isArray(providedHistory) ? providedHistory : getWorkouts();

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
      coachRecommendation: buildSafeCoachRecommendation(safeLift, history),

      // user always overrides this
      userOverride: null,
    };
  });
}

function normalizeWorkoutLift(lift, day, index) {
  const source = lift && typeof lift === "object" ? lift : { exercise: lift };
  return {
    ...source,
    id: source.id || `${day}-${index}-${String(source.exercise || "lift").replace(/[^a-z0-9]+/gi, "-")}`,
    exercise: stringifyField(source.exercise, "Exercise"),
    muscleGroup: stringifyField(source.muscleGroup, "other"),
    sets: stringifyField(source.sets, ""),
    reps: stringifyField(source.reps, ""),
    note: stringifyField(source.note || source.stretches, ""),
    stretches: stringifyField(source.stretches || source.note, ""),
  };
}

function buildSafeCoachRecommendation(lift, history) {
  try {
    return buildCoachRecommendation(lift, history);
  } catch {
    return {
      status: "empty",
      headline: "Set starting weight",
      detail: "Log this lift once and coach recommendations will use your history.",
      warmups: [],
      workingWeight: null,
      workingSetPlan: "Flat sets by default.",
      nextAction: "Choose a weight you can control for the programmed reps.",
    };
  }
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
