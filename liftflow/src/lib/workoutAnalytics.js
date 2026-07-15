export function getWorkoutItems(workout) {
  if (Array.isArray(workout)) return workout.filter(Boolean);
  if (Array.isArray(workout?.workout)) return workout.workout.filter(Boolean);
  return [];
}

export function getLiftSets(lift) {
  return Array.isArray(lift?.sets) ? lift.sets.filter(Boolean) : [];
}

export function getBaseExercise(lift) {
  return lift?.baseExercise || lift?.exercise || "";
}

export function calculateLiftVolume(lift) {
  return getLiftSets(lift).reduce(
    (sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0),
    0
  );
}

export function calculateSessionSummary(lifts) {
  const safeLifts = Array.isArray(lifts) ? lifts.filter(Boolean) : [];
  const sets = safeLifts.reduce((count, lift) => count + getLiftSets(lift).length, 0);
  const volume = safeLifts.reduce((sum, lift) => sum + calculateLiftVolume(lift), 0);
  const topSet = safeLifts
    .flatMap((lift) =>
      getLiftSets(lift).map((set) => ({
        exercise: getBaseExercise(lift),
        weight: Number(set.weight || 0),
        reps: Number(set.reps || 0),
      }))
    )
    .sort((a, b) => b.weight - a.weight)[0];

  return { sets, volume, topSet };
}

export function detectPRs(workouts, completedLifts) {
  const existing = {};

  (workouts || []).forEach((session) => {
    getWorkoutItems(session).forEach((lift) => {
      const exercise = getBaseExercise(lift);
      if (!exercise) return;
      getLiftSets(lift).forEach((set) => {
        const weight = Number(set.weight || 0);
        if (weight > (existing[exercise] || 0)) existing[exercise] = weight;
      });
    });
  });

  return (completedLifts || []).flatMap((lift) =>
    getLiftSets(lift)
      .filter((set) => Number(set.weight || 0) > (existing[getBaseExercise(lift)] || 0))
      .map((set) => ({
        exercise: getBaseExercise(lift),
        variation: lift.variation || "",
        weight: Number(set.weight || 0),
        reps: Number(set.reps || 0),
        previous: existing[getBaseExercise(lift)] || 0,
      }))
  );
}

export function buildExerciseHistory(workouts) {
  const history = {};

  (workouts || []).forEach((session, sessionIndex) => {
    const date = session?.date || null;
    getWorkoutItems(session).forEach((lift) => {
      const exercise = getBaseExercise(lift);
      if (!exercise) return;

      if (!history[exercise]) {
        history[exercise] = {
          exercise,
          sessions: 0,
          sets: 0,
          volume: 0,
          bestWeight: 0,
          entries: [],
        };
      }

      const volume = calculateLiftVolume(lift);
      const liftSets = getLiftSets(lift);
      const bestSet = liftSets.reduce(
        (best, set) => (Number(set.weight || 0) > best.weight ? {
          weight: Number(set.weight || 0),
          reps: Number(set.reps || 0),
        } : best),
        { weight: 0, reps: 0 }
      );

      history[exercise].sessions += 1;
      history[exercise].sets += liftSets.length;
      history[exercise].volume += volume;
      history[exercise].bestWeight = Math.max(history[exercise].bestWeight, bestSet.weight);
      history[exercise].entries.unshift({
        id: `${session?.id || sessionIndex}-${exercise}`,
        date,
        sets: liftSets,
        variation: lift.variation || "",
        volume,
        bestSet,
      });
    });
  });

  return Object.values(history).sort((a, b) => b.volume - a.volume);
}

export function buildProgressData(workouts) {
  const sessions = (workouts || []).map((session) => {
    const lifts = getWorkoutItems(session);
    return {
      date: session?.date || lifts[0]?.date || null,
      day: session?.day || "",
      focus: session?.focus || "",
      lifts,
      ...calculateSessionSummary(lifts),
    };
  });

  const muscleVolume = {};
  const exerciseBest = {};

  sessions.forEach((session) => {
    session.lifts.forEach((lift) => {
      const exercise = getBaseExercise(lift);
      if (!exercise) return;

      const group = lift.muscleGroup || "other";
      muscleVolume[group] = (muscleVolume[group] || 0) + calculateLiftVolume(lift);
      getLiftSets(lift).forEach((set) => {
        const weight = Number(set.weight || 0);
        if (weight > (exerciseBest[exercise] || 0)) exerciseBest[exercise] = weight;
      });
    });
  });

  return {
    sessions,
    muscleVolume,
    exerciseBest,
    totalVolume: sessions.reduce((sum, session) => sum + session.volume, 0),
    totalSets: sessions.reduce((sum, session) => sum + session.sets, 0),
  };
}
