import { migrateStoredJson, repairPlanLoadProfiles, runStorageMigration } from "./loadProfiles";

const STORAGE_KEY = "liftflow_plan";
const SAVED_SPLITS_KEY = "liftflow_saved_splits";

// One-time repair of loadType/minimumLoad written by older inference (see repairStoredLoadProfile).
function migratePlanStorage() {
  runStorageMigration("load-types-v1:plan", () => migrateStoredJson(STORAGE_KEY, repairPlanLoadProfiles));
}

function migrateSavedSplitStorage() {
  runStorageMigration("load-types-v1:saved_splits", () =>
    migrateStoredJson(SAVED_SPLITS_KEY, (splits) => {
      if (!Array.isArray(splits)) return splits;
      const next = splits.map((split) => {
        if (!split || typeof split !== "object") return split;
        const plan = repairPlanLoadProfiles(split.plan);
        return plan === split.plan ? split : { ...split, plan };
      });
      return next.some((split, index) => split !== splits[index]) ? next : splits;
    }),
  );
}

/**
 * Get training plan
 */
export function getPlan() {
  if (typeof window === "undefined") return {};
  migratePlanStorage();
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
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
  migrateSavedSplitStorage();
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_SPLITS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
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
