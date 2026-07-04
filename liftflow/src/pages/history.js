import { useEffect, useMemo, useState } from "react";
import { deleteLiftFromWorkout, getWorkouts } from "../lib/workoutStorage";
import { buildExerciseHistory, calculateLiftVolume, getWorkoutItems } from "../lib/workoutAnalytics";

export default function History() {
  const [workouts, setWorkouts] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const data = getWorkouts();
      setWorkouts(Array.isArray(data) ? data : []);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const sessions = useMemo(() => normalizeSessions(workouts), [workouts]);
  const exerciseHistory = useMemo(() => buildExerciseHistory(workouts), [workouts]);
  const activeExercise = exerciseHistory.find((item) => item.exercise === selectedExercise) || exerciseHistory[0];
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

  function handleDeleteLift(sessionId, liftIndex) {
    setWorkouts(deleteLiftFromWorkout(sessionId, liftIndex));
  }

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Training Log</p>
          <h1 style={title}>History</h1>
        </div>
      </header>

      <section className="history-stats" style={statsGrid}>
        <Stat label="Sessions" value={totals.sessions} />
        <Stat label="Sets" value={totals.sets} />
        <Stat label="Volume" value={`${totals.volume.toLocaleString()} lb`} />
      </section>

      {exerciseHistory.length > 0 && (
        <section style={exercisePanel}>
          <div style={sectionHeader}>
            <div>
              <p style={eyebrow}>Exercise History</p>
              <h2 style={sectionTitle}>{activeExercise?.exercise}</h2>
            </div>
            <select
              value={activeExercise?.exercise || ""}
              onChange={(event) => setSelectedExercise(event.target.value)}
              style={exerciseSelect}
            >
              {exerciseHistory.map((exercise) => (
                <option key={exercise.exercise} value={exercise.exercise}>
                  {exercise.exercise}
                </option>
              ))}
            </select>
          </div>

          {activeExercise && (
            <>
              <div className="history-stats" style={exerciseStats}>
                <Stat label="Best" value={`${activeExercise.bestWeight} lb`} />
                <Stat label="Sessions" value={activeExercise.sessions} />
                <Stat label="Volume" value={`${activeExercise.volume.toLocaleString()} lb`} />
              </div>
              <div style={exerciseEntries}>
                {activeExercise.entries.slice(0, 5).map((entry) => (
                  <div key={entry.id} style={exerciseEntry}>
                    <div>
                      <strong style={liftName}>{formatShortDate(entry.date)}</strong>
                      <p style={setLine}>
                        {entry.sets.length > 0
                          ? entry.sets.map((set) => `${set.weight || 0}x${set.reps || 0}`).join("  ")
                          : "No sets logged"}
                      </p>
                    </div>
                    <span style={liftVolume}>{entry.volume.toLocaleString()} lb</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

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
                  <div key={`${session.id}-${lift.exercise}-${index}`} className="phone-stack" style={liftRow}>
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
                    <div style={liftActions}>
                      <span style={liftVolume}>{calculateLiftVolume(lift).toLocaleString()} lb</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteLift(session.id, index)}
                        style={deleteBtn}
                      >
                        Delete
                      </button>
                    </div>
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

function formatDate(date) {
  if (!date) return "Unknown date";
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatShortDate(date) {
  if (!date) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
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
  gap: 12,
  marginBottom: 16,
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 12,
};

const sectionTitle = {
  margin: "6px 0 0",
  fontSize: 24,
};

const exercisePanel = {
  border: "1px solid rgba(50, 207, 255, 0.28)",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
  marginBottom: 16,
};

const exerciseSelect = {
  maxWidth: 220,
};

const exerciseStats = {
  gap: 10,
  marginBottom: 12,
};

const exerciseEntries = {
  display: "grid",
  gap: 8,
};

const exerciseEntry = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  border: "1px solid #202020",
  borderRadius: 12,
  background: "#0b0b0b",
  padding: 12,
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

const liftActions = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const deleteBtn = {
  color: "#ff6b2c",
  borderColor: "rgba(255, 107, 44, 0.45)",
  background: "rgba(255, 107, 44, 0.12)",
  padding: "7px 11px",
  fontSize: 13,
};
