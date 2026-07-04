export function getWorkoutItems(workout) {
  if (Array.isArray(workout)) return workout.filter(Boolean);
  if (Array.isArray(workout?.workout)) return workout.workout.filter(Boolean);
  return [];
}

export function calculateLiftVolume(lift) {
  return (lift?.sets || []).reduce(
    (sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0),
    0
  );
}

export function calculateSessionSummary(lifts) {
  const safeLifts = Array.isArray(lifts) ? lifts.filter(Boolean) : [];
  const sets = safeLifts.reduce((count, lift) => count + (lift?.sets || []).length, 0);
  const volume = safeLifts.reduce((sum, lift) => sum + calculateLiftVolume(lift), 0);
  const topSet = safeLifts
    .flatMap((lift) =>
      (lift?.sets || []).map((set) => ({
        exercise: lift.exercise,
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
      if (!lift?.exercise) return;
      (lift.sets || []).forEach((set) => {
        const weight = Number(set.weight || 0);
        if (weight > (existing[lift.exercise] || 0)) existing[lift.exercise] = weight;
      });
    });
  });

  return (completedLifts || []).flatMap((lift) =>
    (lift?.sets || [])
      .filter((set) => Number(set.weight || 0) > (existing[lift.exercise] || 0))
      .map((set) => ({
        exercise: lift.exercise,
        weight: Number(set.weight || 0),
        reps: Number(set.reps || 0),
        previous: existing[lift.exercise] || 0,
      }))
  );
}

export function buildExerciseHistory(workouts) {
  const history = {};

  (workouts || []).forEach((session, sessionIndex) => {
    const date = session?.date || null;
    getWorkoutItems(session).forEach((lift) => {
      if (!lift?.exercise) return;

      if (!history[lift.exercise]) {
        history[lift.exercise] = {
          exercise: lift.exercise,
          sessions: 0,
          sets: 0,
          volume: 0,
          bestWeight: 0,
          entries: [],
        };
      }

      const volume = calculateLiftVolume(lift);
      const bestSet = (lift.sets || []).reduce(
        (best, set) => (Number(set.weight || 0) > best.weight ? {
          weight: Number(set.weight || 0),
          reps: Number(set.reps || 0),
        } : best),
        { weight: 0, reps: 0 }
      );

      history[lift.exercise].sessions += 1;
      history[lift.exercise].sets += (lift.sets || []).length;
      history[lift.exercise].volume += volume;
      history[lift.exercise].bestWeight = Math.max(history[lift.exercise].bestWeight, bestSet.weight);
      history[lift.exercise].entries.unshift({
        id: `${session?.id || sessionIndex}-${lift.exercise}`,
        date,
        sets: lift.sets || [],
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
      if (!lift?.exercise) return;

      const group = lift.muscleGroup || "other";
      muscleVolume[group] = (muscleVolume[group] || 0) + calculateLiftVolume(lift);
      (lift.sets || []).forEach((set) => {
        const weight = Number(set.weight || 0);
        if (weight > (exerciseBest[lift.exercise] || 0)) exerciseBest[lift.exercise] = weight;
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
