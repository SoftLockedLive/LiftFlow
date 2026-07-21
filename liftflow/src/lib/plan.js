const STORAGE_KEY = "liftflow_plan";
const SAVED_SPLITS_KEY = "liftflow_saved_splits";

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

export function getSavedSplits() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SAVED_SPLITS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveCurrentSplit(plan, name = "") {
  if (typeof window === "undefined") return [];
  const trimmedName = String(name || "").trim();
  const savedSplit = {
    id: crypto.randomUUID(),
    name: trimmedName || `Saved Split ${new Date().toLocaleDateString()}`,
    plan,
    createdAt: new Date().toISOString(),
  };
  const updated = [savedSplit, ...getSavedSplits()];
  localStorage.setItem(SAVED_SPLITS_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteSavedSplit(id) {
  const updated = getSavedSplits().filter((split) => split.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(SAVED_SPLITS_KEY, JSON.stringify(updated));
  }
  return updated;
}
