const STORAGE_KEY = "liftflow_plan";

/**
 * Get training plan
 */
export function getPlan() {
  if (typeof window === "undefined") return {};
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

/**
 * Save training plan
 */
export function savePlan(plan) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}