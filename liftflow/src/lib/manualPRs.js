import { normalizeExerciseName } from "./workoutAnalytics";

const KEY = "liftflow_manual_prs";
const PROFILE_KEY = "liftflow_profile";
// Profile used to have its own Bench/Squat/Deadlift PR fields; they now live here as manual PRs.
const PROFILE_PR_FIELDS = [
  ["benchPR", "Bench Press"],
  ["squatPR", "Squat"],
  ["deadliftPR", "Deadlift"],
];

export function getManualPRs() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return migrateProfilePRs(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

export function saveManualPRs(prs) {
  if (typeof window === "undefined") return [];
  const safePrs = Array.isArray(prs) ? prs : [];
  localStorage.setItem(KEY, JSON.stringify(safePrs));
  return safePrs;
}

export function upsertManualPR(pr) {
  const prs = getManualPRs();
  const nextPr = {
    id: pr.id || crypto.randomUUID(),
    exercise: normalizeExerciseName(pr.exercise),
    weight: Number(pr.weight || 0),
    reps: pr.reps === "" || pr.reps === undefined ? "" : Number(pr.reps || 0),
    date: pr.date || Date.now(),
  };
  // Editing matches by id; a new entry for an exercise that already has one replaces it.
  const existing = pr.id
    ? prs.find((item) => item.id === pr.id)
    : prs.find((item) => normalizeExerciseName(item.exercise) === nextPr.exercise);
  const savedPr = existing ? { ...nextPr, id: existing.id } : nextPr;
  const updated = existing ? prs.map((item) => (item.id === existing.id ? savedPr : item)) : [nextPr, ...prs];

  return saveManualPRs(updated);
}

export function deleteManualPR(id) {
  return saveManualPRs(getManualPRs().filter((item) => item.id !== id));
}

// Dated 0 so any heavier logged set still beats them, as the old profile fields behaved.
function migrateProfilePRs(prs) {
  let profile;
  try {
    profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    return prs;
  }
  if (!profile || typeof profile !== "object") return prs;
  if (!PROFILE_PR_FIELDS.some(([key]) => key in profile)) return prs;

  let next = prs;
  PROFILE_PR_FIELDS.forEach(([key, exercise]) => {
    const weight = Number(profile[key] || 0);
    if (!(weight > 0)) return;
    const existing = next.find((pr) => normalizeExerciseName(pr.exercise) === exercise);
    if (!existing) {
      next = [{ id: crypto.randomUUID(), exercise, weight, reps: "", date: 0 }, ...next];
    } else if (weight > Number(existing.weight || 0)) {
      next = next.map((pr) => (pr === existing ? { ...pr, weight, reps: "" } : pr));
    }
  });

  const cleaned = { ...profile };
  PROFILE_PR_FIELDS.forEach(([key]) => delete cleaned[key]);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(cleaned));
  return next === prs ? prs : saveManualPRs(next);
}
