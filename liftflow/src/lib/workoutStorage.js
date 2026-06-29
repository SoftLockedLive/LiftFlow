const KEY = "liftflow_workouts";

export function getWorkouts() {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

export function saveWorkout(workout) {
  if (typeof window === "undefined") return;

  const existing = getWorkouts();

  const updated = [
    ...existing,
    {
      id: crypto.randomUUID(),
      date: Date.now(),
      workout,
    },
  ];

  localStorage.setItem(KEY, JSON.stringify(updated));
}