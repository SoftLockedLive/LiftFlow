export const BAR_WEIGHT = 45;
export const EZ_BAR_WEIGHT = 20;
export const MIN_LOAD = 5;
export const LOAD_TYPES = ["barbell", "machine", "dumbbell", "bodyweight", "free"];

export function getLoadProfile(lift = {}) {
  const inferredType = inferLoadType(lift.exercise || lift.baseExercise);
  const type = normalizeLoadType(lift.loadType) || inferredType;
  const configuredMinimum = Number(lift.minimumLoad || lift.minLoad || 0);

  if (configuredMinimum > 0) {
    return { type, minimumLoad: configuredMinimum };
  }

  return {
    type,
    minimumLoad:
      type === "barbell" ? (isEzBar(lift.exercise || lift.baseExercise) ? EZ_BAR_WEIGHT : BAR_WEIGHT) : MIN_LOAD,
  };
}

// Order matters: explicit equipment first, then movement names. A bare "squat"
// means a barbell squat, but goblet, hack and split squats do not use a 45 lb bar.
export function inferLoadType(exercise) {
  const name = String(exercise || "").toLowerCase();
  if (/\bdumbbell\b|\bdb\b|\bgoblet\b/.test(name)) return "dumbbell";
  if (isEzBar(name)) return "barbell";
  if (
    /\bcable\b|\bmachine\b|\bpulldown\b|\bpec deck\b|\bleg press\b|\bleg curl\b|\bleg extension\b|\bhack squat\b/.test(
      name,
    )
  )
    return "machine";
  if (/\bpull-up\b|\bpush-up\b|\bplank\b|\bhanging\b/.test(name)) return "bodyweight";
  if (/\bbarbell\b/.test(name)) return "barbell";
  if (/\bsplit squat\b|\bbulgarian\b/.test(name)) return "free";
  if (/\bbench press\b|\bsquat\b|\bdeadlift\b|\boverhead press\b/.test(name)) return "barbell";
  return "free";
}

function isEzBar(exercise) {
  return /\bez[- ]?bar\b/i.test(String(exercise || ""));
}

export function normalizeLoadType(value) {
  const type = String(value || "").toLowerCase();
  return LOAD_TYPES.includes(type) ? type : "";
}
