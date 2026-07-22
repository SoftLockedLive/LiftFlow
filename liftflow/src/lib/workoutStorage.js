const KEY = "liftflow_workouts";

export function getWorkouts() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
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

export function updateLiftInWorkout(workoutId, liftIndex, nextLift) {
  const workouts = getWorkouts();
  const updated = workouts.map((workout, index) => {
    const id = workout?.id || `${workout?.date || "session"}-${index}`;
    if (id !== workoutId) return workout;

    if (Array.isArray(workout)) {
      return workout.map((lift, currentIndex) =>
        currentIndex === liftIndex ? { ...lift, ...nextLift } : lift
      );
    }

    return {
      ...workout,
      workout: (workout.workout || []).map((lift, currentIndex) =>
        currentIndex === liftIndex ? { ...lift, ...nextLift } : lift
      ),
    };
  });

  return saveWorkouts(updated);
}

export function deleteWorkout(workoutId) {
  const updated = getWorkouts().filter((workout, index) => {
    const id = workout?.id || `${workout?.date || "session"}-${index}`;
    return id !== workoutId;
  });

  return saveWorkouts(updated);
}
