const KEY = "liftflow_custom_exercises";

export function getCustomExercises() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomExercises(exercises) {
  if (typeof window === "undefined") return [];
  const safeExercises = Array.isArray(exercises) ? exercises : [];
  localStorage.setItem(KEY, JSON.stringify(safeExercises));
  return safeExercises;
}

export function upsertCustomExercise(exercise) {
  const exercises = getCustomExercises();
  const nextExercise = {
    id: exercise.id || crypto.randomUUID(),
    exercise: exercise.exercise || "",
    muscleGroup: exercise.muscleGroup || "other",
    loadType: exercise.loadType || "free",
    minimumLoad: Number(exercise.minimumLoad || exercise.minLoad || 0) || undefined,
    sets: exercise.sets || "3",
    reps: exercise.reps || "8-12",
    targetType: exercise.targetType === "time" ? "time" : "reps",
    duration: exercise.duration || "",
    note: exercise.note || exercise.stretches || "",
    stretches: exercise.stretches || "",
  };
  const exists = exercises.some((item) => item.id === nextExercise.id);
  const updated = exists
    ? exercises.map((item) => (item.id === nextExercise.id ? nextExercise : item))
    : [nextExercise, ...exercises];

  return saveCustomExercises(updated);
}

export function deleteCustomExercise(id) {
  return saveCustomExercises(getCustomExercises().filter((item) => item.id !== id));
}
