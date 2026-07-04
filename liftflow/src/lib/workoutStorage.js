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

export function saveWorkouts(workouts) {
  if (typeof window === "undefined") return [];
  const safeWorkouts = Array.isArray(workouts) ? workouts : [];
  localStorage.setItem(KEY, JSON.stringify(safeWorkouts));
  return safeWorkouts;
}

export function deleteLiftFromWorkout(workoutId, liftIndex) {
  const workouts = getWorkouts();
  const updated = workouts
    .map((workout, index) => {
      const id = workout?.id || `${workout?.date || "session"}-${index}`;
      if (id !== workoutId) return workout;

      if (Array.isArray(workout)) {
        return workout.filter((_, currentIndex) => currentIndex !== liftIndex);
      }

      return {
        ...workout,
        workout: (workout.workout || []).filter((_, currentIndex) => currentIndex !== liftIndex),
      };
    })
    .filter((workout) => {
      if (Array.isArray(workout)) return workout.length > 0;
      return (workout?.workout || []).length > 0;
    });

  return saveWorkouts(updated);
}
