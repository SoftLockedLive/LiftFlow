const KEY = "liftflow_workouts";

export function getWorkouts() {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

export function saveWorkout(workout, metadata = {}) {
  if (typeof window === "undefined") return;

  const existing = getWorkouts();

  const updated = [
    ...existing,
    {
      id: crypto.randomUUID(),
      date: Date.now(),
      ...metadata,
      workout,
    },
  ];

  localStorage.setItem(KEY, JSON.stringify(updated));
}
