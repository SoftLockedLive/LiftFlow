import { getPlan } from "./plan";
import { getWorkouts } from "./workoutStorage";
import { calculateFatigue, getPRs } from "./engine";
import { getNextLoad } from "./progression";
import { generateCoachSuggestions } from "./coach";

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

  const coachNotes = generateCoachSuggestions(baseWorkout);

  return baseWorkout.map((lift) => {
    const lastPR = prs[lift.exercise] || 0;

    const suggestedWeight = getNextLoad(
      lift.exercise,
      lastPR
    );

    return {
      ...lift,

      // coach layer (soft suggestions only)
      suggestedWeight,
      coachNote: coachNotes[lift.exercise] || null,

      // user always overrides this
      userOverride: null,
    };
  });
}