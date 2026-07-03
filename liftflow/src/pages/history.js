import { useEffect, useMemo, useState } from "react";
import { getWorkouts } from "../lib/workoutStorage";

export default function History() {
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const data = getWorkouts();
      setWorkouts(Array.isArray(data) ? data : []);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const sessions = useMemo(() => normalizeSessions(workouts), [workouts]);
  const totals = useMemo(
    () =>
      sessions.reduce(
        (summary, session) => ({
          volume: summary.volume + session.volume,
          sets: summary.sets + session.sets,
          sessions: summary.sessions + 1,
        }),
        { volume: 0, sets: 0, sessions: 0 }
      ),
    [sessions]
  );

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Training Log</p>
          <h1 style={title}>History</h1>
        </div>
      </header>

      <section style={statsGrid}>
        <Stat label="Sessions" value={totals.sessions} />
        <Stat label="Sets" value={totals.sets} />
        <Stat label="Volume" value={`${totals.volume.toLocaleString()} lb`} />
      </section>

      {sessions.length === 0 ? (
        <section style={empty}>No workouts logged yet.</section>
      ) : (
        <section style={sessionList}>
          {sessions.map((session) => (
            <article key={session.id} style={sessionCard}>
              <div style={sessionHeader}>
                <div>
                  <h2 style={sessionTitle}>{formatDate(session.date)}</h2>
                  <p style={sessionMeta}>
                    {session.sets} sets · {session.volume.toLocaleString()} lb volume
                  </p>
                </div>
              </div>

              <div style={liftList}>
                {session.lifts.map((lift, index) => (
                  <div key={`${session.id}-${lift.exercise}-${index}`} style={liftRow}>
                    <div>
                      <strong style={liftName}>{lift.exercise}</strong>
                      <p style={setLine}>
                        {lift.sets.length > 0
                          ? lift.sets
                              .map((set) => `${set.weight || 0}x${set.reps || 0}`)
                              .join("  ")
                          : "No sets logged"}
                      </p>
                    </div>
                    <span style={liftVolume}>{calculateLiftVolume(lift).toLocaleString()} lb</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={statCard}>
      <span style={statLabel}>{label}</span>
      <strong style={statValue}>{value}</strong>
    </div>
  );
}

function normalizeSessions(workouts) {
  return workouts
    .map((workout, index) => {
      const lifts = getWorkoutItems(workout);
      const date = workout?.date || lifts[0]?.date || null;
      const sets = lifts.reduce((count, lift) => count + (lift.sets || []).length, 0);
      const volume = lifts.reduce((sum, lift) => sum + calculateLiftVolume(lift), 0);

      return {
        id: workout?.id || `${date || "session"}-${index}`,
        date,
        lifts,
        sets,
        volume,
      };
    })
    .filter((session) => session.lifts.length > 0)
    .reverse();
}

function getWorkoutItems(workout) {
  if (Array.isArray(workout)) return workout;
  if (Array.isArray(workout?.workout)) return workout.workout;
  return [];
}

function calculateLiftVolume(lift) {
  return (lift.sets || []).reduce(
    (sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0),
    0
  );
}

function formatDate(date) {
  if (!date) return "Unknown date";
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

const wrap = {
  maxWidth: 820,
  margin: "0 auto",
};

const header = {
  marginBottom: 18,
};

const eyebrow = {
  margin: 0,
  color: "#32cfff",
  fontSize: 14,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 34,
  lineHeight: 1,
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const statCard = {
  border: "1px solid rgba(50, 207, 255, 0.3)",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
};

const statLabel = {
  display: "block",
  color: "#666",
  fontSize: 13,
  fontWeight: 850,
  textTransform: "uppercase",
};

const statValue = {
  display: "block",
  marginTop: 8,
  color: "#32cfff",
  fontSize: 24,
};

const empty = {
  border: "1px solid #222",
  borderRadius: 16,
  background: "#101010",
  padding: 26,
  color: "#555",
  textAlign: "center",
  fontWeight: 850,
};

const sessionList = {
  display: "grid",
  gap: 14,
};

const sessionCard = {
  border: "1px solid #242424",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
};

const sessionHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  paddingBottom: 12,
  borderBottom: "1px solid #202020",
};

const sessionTitle = {
  margin: 0,
  fontSize: 22,
};

const sessionMeta = {
  margin: "6px 0 0",
  color: "#777",
  fontWeight: 750,
};

const liftList = {
  display: "grid",
  gap: 10,
  marginTop: 12,
};

const liftRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  border: "1px solid #202020",
  borderRadius: 12,
  background: "#0b0b0b",
  padding: 12,
};

const liftName = {
  color: "#f7f7f2",
};

const setLine = {
  margin: "5px 0 0",
  color: "#777",
  fontSize: 13,
};

const liftVolume = {
  color: "#32cfff",
  fontWeight: 850,
  whiteSpace: "nowrap",
};
