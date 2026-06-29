const KEY = "liftflow_profile";

const DEFAULT_PROFILE = {
  // Personal
  name: "",
  age: "",
  sex: "male",

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

  const data = localStorage.getItem(KEY);

  return data
    ? JSON.parse(data)
    : DEFAULT_PROFILE;
}

export function saveProfile(profile) {
  if (typeof window === "undefined")
    return;

  localStorage.setItem(
    KEY,
    JSON.stringify(profile)
  );
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