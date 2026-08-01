const KEY = "liftflow_coach_state";

export function getCoachState() {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function setCoachState(state) {
  if (typeof window === "undefined") return {};
  const safeState = state && typeof state === "object" && !Array.isArray(state) ? state : {};
  localStorage.setItem(KEY, JSON.stringify(safeState));
  return safeState;
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
