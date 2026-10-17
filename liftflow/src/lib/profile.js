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

// Profile weights (weight/bodyweight, startWeight, goalWeight, goalBench/Squat/Deadlift)
// are stored in lb like every other weight; pages convert them for display.
export const PROFILE_WEIGHT_FIELDS = [
  "weight",
  "bodyweight",
  "startWeight",
  "goalWeight",
  "goalBench",
  "goalSquat",
  "goalDeadlift",
];

const KG_PER_LB = 0.45359237;

// Lean mass in lb (unrounded). Null when weight or body fat is missing, so callers
// can show a placeholder instead of a wrong number.
export function calculateLeanMass(profile) {
  const weight = Number(profile.weight || profile.bodyweight || 0);
  const bf = Number(profile.bodyFat || 0);
  if (!(weight > 0) || !(bf > 0 && bf < 100)) return null;

  return weight * (1 - bf / 100);
}

// DOTS from the stored lb total and bodyweight; the formula needs kg, so this
// converts. The result does not depend on the display unit.
export function calculateDotsScore({ totalLb, bodyweightLb, sex }) {
  if (!(totalLb > 0) || !(bodyweightLb > 0)) return null;

  const totalKg = totalLb * KG_PER_LB;
  const bodyweightKg = bodyweightLb * KG_PER_LB;
  const coefficients =
    normalizeSex(sex) === "female"
      ? [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288]
      : [-0.000001093, 0.0007391293, -0.1918759221, 24.0900756, -307.75076];
  const denominator = coefficients.reduce(
    (sum, coefficient, index) => sum + coefficient * bodyweightKg ** (4 - index),
    0,
  );

  if (denominator <= 0) return null;
  return Math.round((500 / denominator) * totalKg * 10) / 10;
}

// Sex used to be a free-text field; read old values like "F", "Woman" or " Female " as female.
export function normalizeSex(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  return text.startsWith("f") || text.startsWith("w") ? "female" : "male";
}
