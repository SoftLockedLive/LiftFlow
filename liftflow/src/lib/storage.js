const KEY = "liftflow_log";

export function saveWorkout(workout) {
  if (typeof window === "undefined") return;

  const existing = JSON.parse(localStorage.getItem(KEY) || "[]");

  const load = Number(workout.weight) * Number(workout.reps);

  existing.push({
    ...workout,
    load,
  });

  localStorage.setItem(KEY, JSON.stringify(existing));
}

export function getWorkouts() {
  if (typeof window === "undefined") return [];

  return JSON.parse(localStorage.getItem(KEY) || "[]");
}