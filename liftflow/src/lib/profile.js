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
  if (typeof window === "undefined")
    return DEFAULT_PROFILE;

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
  if (typeof window === "undefined")
    return DEFAULT_PROFILE;

  const safeProfile = profile && typeof profile === "object" && !Array.isArray(profile)
    ? { ...DEFAULT_PROFILE, ...profile }
    : DEFAULT_PROFILE;
  localStorage.setItem(
    KEY,
    JSON.stringify(safeProfile)
  );
  return safeProfile;
}

export function calculateTotal(profile) {
  return (
    Number(profile.benchPR || 0) +
    Number(profile.squatPR || 0) +
    Number(profile.deadliftPR || 0)
  );
}

export function calculateLeanMass(profile) {
  const weight = Number(profile.weight || 0);
  const bf = Number(profile.bodyFat || 0);

  return Math.round(
    weight * (1 - bf / 100)
  );
}
