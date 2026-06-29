const KEY = "liftflow_workouts";

export function getWorkouts() {
  if (typeof window === "undefined") return [];

  return JSON.parse(
    localStorage.getItem(KEY) || "[]"
  );
}

export function saveWorkout(workout) {
  const workouts = getWorkouts();

  workouts.push(workout);

  localStorage.setItem(
    KEY,
    JSON.stringify(workouts)
  );
}