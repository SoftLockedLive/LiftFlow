const KEY = "liftflow_coach_state";

export function getCoachState() {
  if (typeof window === "undefined") return {};
  return JSON.parse(localStorage.getItem(KEY) || "{}");
}

export function setCoachState(state) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

/**
 * Store suggestion for one exercise
 */
export function setCoachSuggestion(exercise, suggestion) {
  const current = getCoachState();

  current[exercise] = {
    ...current[exercise],
    ...suggestion,
    updatedAt: Date.now(),
  };

  setCoachState(current);
}

/**
 * Clear suggestion for one exercise
 */
export function clearCoachSuggestion(exercise) {
  const current = getCoachState();
  delete current[exercise];
  setCoachState(current);
}