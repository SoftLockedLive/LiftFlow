const KEY = "liftflow_profile";

const DEFAULT_PROFILE = {
  // Personal
  name: "",
  age: "",
  sex: "male",
  bodyweight: "",
  goal: "strength",
  experience: "beginner",
  units: "lbs",
  photo: "",

  // Body
  height: "",
  weight: "",
  startWeight: "",
  goalWeight: "",
  bodyFat: "",
  startBodyFat: "",
  goalBodyFat: "",

  // Strength
  benchPR: "",
  squatPR: "",
  deadliftPR: "",

  // Goals
  goalBench: "",
  goalSquat: "",
  goalDeadlift: "",
};

export function getProfile() {
  if (typeof window === "undefined") return DEFAULT_PROFILE;

  try {
    const data = localStorage.getItem(KEY);
    const parsed = data ? JSON.parse(data) : {};

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? { ...DEFAULT_PROFILE, ...parsed }
      : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile) {
  if (typeof window === "undefined") return DEFAULT_PROFILE;

  const safeProfile =
    profile && typeof profile === "object" && !Array.isArray(profile)
      ? { ...DEFAULT_PROFILE, ...profile }
      : DEFAULT_PROFILE;
  localStorage.setItem(KEY, JSON.stringify(safeProfile));
  return safeProfile;
}

// Null when weight or body fat is missing, so callers can show a placeholder instead of a wrong number.
export function calculateLeanMass(profile) {
  const weight = Number(profile.weight || profile.bodyweight || 0);
  const bf = Number(profile.bodyFat || 0);
  if (!(weight > 0) || !(bf > 0 && bf < 100)) return null;

  return Math.round(weight * (1 - bf / 100));
}

// Sex used to be a free-text field; read old values like "F", "Woman" or " Female " as female.
export function normalizeSex(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  return text.startsWith("f") || text.startsWith("w") ? "female" : "male";
}
