export const BAR_WEIGHT = 45;
export const MIN_LOAD = 5;

export function getLoadProfile(lift = {}) {
  const inferredType = inferLoadType(lift.exercise || lift.baseExercise);
  const type = normalizeLoadType(lift.loadType) || inferredType;
  const configuredMinimum = Number(lift.minimumLoad || lift.minLoad || 0);

  if (configuredMinimum > 0) {
    return { type, minimumLoad: configuredMinimum };
  }

  return {
    type,
    minimumLoad: type === "barbell" ? BAR_WEIGHT : MIN_LOAD,
  };
}

export function inferLoadType(exercise) {
  const name = String(exercise || "").toLowerCase();
  if (/\bdumbbell\b|\bdb\b/.test(name)) return "dumbbell";
  if (/\bcable\b|\bmachine\b|\bpulldown\b|\bpec deck\b|\bleg press\b|\bleg curl\b|\bleg extension\b/.test(name)) return "machine";
  if (/\bpull-up\b|\bpush-up\b|\bplank\b|\bhanging\b/.test(name)) return "bodyweight";
  if (/\bbarbell\b|\bbench press\b|\bsquat\b|\bdeadlift\b|\boverhead press\b|\bez-bar\b/.test(name)) return "barbell";
  return "free";
}

export function normalizeLoadType(value) {
  const type = String(value || "").toLowerCase();
  return ["barbell", "machine", "dumbbell", "bodyweight", "free"].includes(type) ? type : "";
}
