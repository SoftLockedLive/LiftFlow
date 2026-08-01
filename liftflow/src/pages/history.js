import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import ConfirmDialog from "../components/ConfirmDialog";
import { deleteLiftFromWorkout, deleteWorkout, getWorkouts, updateLiftInWorkout } from "../lib/workoutStorage";
import { buildExerciseHistory, calculateLiftVolume, getBaseExercise, getLiftSets, getWorkoutItems } from "../lib/workoutAnalytics";

export default function History() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState([]);
  const [search, setSearch] = useState("");
  const [openSessions, setOpenSessions] = useState({});
  const [openLifts, setOpenLifts] = useState({});
  const [editingLift, setEditingLift] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const data = getWorkouts();
      setWorkouts(Array.isArray(data) ? data : []);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const sessions = useMemo(() => normalizeSessions(workouts), [workouts]);
  const exerciseHistory = useMemo(() => buildExerciseHistory(workouts), [workouts]);
  const filteredSessions = useMemo(() => filterSessions(sessions, search), [sessions, search]);
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

  function toggleSession(sessionId) {
    setOpenSessions((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }));
  }

  function toggleLift(liftId) {
    setOpenLifts((prev) => ({ ...prev, [liftId]: !prev[liftId] }));
  }

  function startEditLift(sessionId, liftIndex, lift) {
    setEditingLift({
      sessionId,
      liftIndex,
      exercise: getBaseExercise(lift),
      setsText: getLiftSets(lift).map((set) => `${set.weight || 0}x${set.reps || 0}`).join(", "),
    });
  }

  function saveEditedLift() {
    if (!editingLift) return;
    const sets = editingLift.setsText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [weight, reps] = part.toLowerCase().split("x");
        return { weight: Number(weight || 0), reps: Number(reps || 0) };
      });

    setWorkouts(updateLiftInWorkout(editingLift.sessionId, editingLift.liftIndex, {
      exercise: editingLift.exercise,
      sets,
    }));
    setEditingLift(null);
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
              <p style={eyebrow}>Search Lifts</p>
              <h2 style={sectionTitle}>Find Past Work</h2>
            </div>
          </div>
          <input
            placeholder="Search exercise or workout..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </section>
      )}

      {filteredSessions.length === 0 ? (
        <section style={empty}>
          <span>No workouts logged yet.</span>
          <button type="button" className="primary" onClick={() => router.push("/workout")}>Start Workout</button>
        </section>
      ) : (
        <section style={sessionList}>
          {filteredSessions.map((session) => {
            const sessionOpen = Boolean(openSessions[session.id]);

            return (
            <article key={session.id} style={sessionCard}>
              <button type="button" onClick={() => toggleSession(session.id)} style={sessionHeader}>
                <div>
                  <h2 style={sessionTitle}>{session.name} {sessionOpen ? "▲" : "▼"}</h2>
                  <p style={sessionMeta}>
                    {formatDate(session.date)} · {session.sets} sets · Total weight lifted: {session.volume.toLocaleString()} lb
                  </p>
                </div>
                <span style={liftVolume}>{session.volume.toLocaleString()} lb</span>
              </button>

              {sessionOpen && (
                <div style={liftList}>
                  {session.lifts.map(({ lift, index }) => {
                    const liftId = `${session.id}-${index}`;
                    const liftOpen = Boolean(openLifts[liftId]);
                    const sets = getLiftSets(lift);

                    return (
                      <div key={liftId} style={liftRow}>
                        <button type="button" onClick={() => toggleLift(liftId)} style={liftSummary}>
                          <div>
                            <strong style={liftName}>{getBaseExercise(lift)} {liftOpen ? "▲" : "▼"}</strong>
                            <p style={setLine}>
                              {lift.variation ? `${lift.variation} · ` : ""}
                              Total {getBaseExercise(lift).toLowerCase()} volume: {calculateLiftVolume(lift).toLocaleString()} lb
                            </p>
                          </div>
                          <span style={liftVolume}>{sets.length} sets</span>
                        </button>

                        {liftOpen && (
                          <div style={setDetails}>
                            {sets.length > 0 ? sets.map((set, setIndex) => (
                              <p key={setIndex} style={setDetailLine}>
                                {formatLoggedSet(set)}
                              </p>
                            )) : <p style={setDetailLine}>No sets logged</p>}
                            <div style={liftActions}>
                              <button type="button" onClick={() => startEditLift(session.id, index, lift)} style={editBtn}>
                                Edit
                              </button>
                              <button type="button" onClick={() => setConfirmDelete({ sessionId: session.id, liftIndex: index })} style={deleteBtn}>
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => setConfirmDeleteSession(session.id)} style={deleteWorkoutBtn}>
                    Delete Workout
                  </button>
                </div>
              )}
            </article>
            );
          })}
        </section>
      )}

      {editingLift && (
        <section style={editPanel}>
          <h2 style={sectionTitle}>Edit History Lift</h2>
          <label style={fieldWrap}>
            <span style={fieldLabel}>Exercise</span>
            <input
              value={editingLift.exercise}
              onChange={(event) => setEditingLift({ ...editingLift, exercise: event.target.value })}
            />
          </label>
          <label style={fieldWrap}>
            <span style={fieldLabel}>Sets</span>
            <input
              value={editingLift.setsText}
              placeholder="225x5, 225x4, 205x8"
              onChange={(event) => setEditingLift({ ...editingLift, setsText: event.target.value })}
            />
          </label>
          <div style={editActions}>
            <button type="button" onClick={() => setEditingLift(null)} style={cancelBtn}>
              Cancel
            </button>
            <button type="button" className="primary" onClick={saveEditedLift}>
              Save Lift
            </button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete History Lift?"
        message="This lift will be removed from the logged workout. If it is the only lift in that workout, the workout entry will be removed too."
        confirmLabel="Delete Lift"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return;
          handleDeleteLift(confirmDelete.sessionId, confirmDelete.liftIndex);
          setConfirmDelete(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmDeleteSession)}
        title="Delete Workout?"
        message="This full workout history entry will be permanently removed."
        confirmLabel="Delete Workout"
        danger
        onCancel={() => setConfirmDeleteSession(null)}
        onConfirm={() => {
          if (!confirmDeleteSession) return;
          setWorkouts(deleteWorkout(confirmDeleteSession));
          setConfirmDeleteSession(null);
        }}
      />
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
      const sets = lifts.reduce((count, lift) => count + getLiftSets(lift).length, 0);
      const volume = lifts.reduce((sum, lift) => sum + calculateLiftVolume(lift), 0);

      return {
        id: workout?.id || `${date || "session"}-${index}`,
        date,
        name: workout?.focus || workout?.day || formatDate(date),
        lifts: lifts.map((lift, liftIndex) => ({ lift, index: liftIndex })),
        sets,
        volume,
      };
    })
    .filter((session) => session.lifts.length > 0)
    .reverse();
}

function filterSessions(sessions, search) {
  const query = search.trim().toLowerCase();
  if (!query) return sessions;

  return sessions
    .map((session) => ({
      ...session,
      lifts: session.lifts.filter(({ lift }) =>
        `${session.name} ${getBaseExercise(lift)} ${lift.variation || ""}`.toLowerCase().includes(query)
      ),
    }))
    .filter((session) => session.lifts.length > 0);
}

function formatLoggedSet(set) {
  const duration = String(set?.duration || "").trim();
  const weight = Number(set?.weight || 0);
  if (duration) return weight > 0 ? `${duration} × ${weight} lb` : duration;
  return `${set?.reps || "--"} reps × ${set?.weight || "--"} lb`;
}

function formatDate(date) {
  const parsedDate = parseDisplayDate(date);
  if (!parsedDate) return "Unknown date";

  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

function parseDisplayDate(date) {
  if (!date) return null;
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
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

const editPanel = {
  border: "1px solid rgba(50, 207, 255, 0.35)",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
  marginTop: 16,
  display: "grid",
  gap: 10,
};

const fieldWrap = {
  display: "grid",
  gap: 6,
};

const fieldLabel = {
  color: "#777",
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const editActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
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
  display: "grid",
  gap: 10,
  justifyItems: "center",
};

const sessionList = {
  display: "grid",
  gap: 14,
};

const sessionCard = {
  border: "1px solid #242424",
  borderRadius: 12,
  background: "#101010",
  overflow: "hidden",
};

const sessionHeader = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  padding: 14,
  border: 0,
  borderRadius: 0,
  background: "transparent",
  textAlign: "left",
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
  gap: 8,
  padding: "0 12px 12px",
};

const liftRow = {
  border: "1px solid #202020",
  borderRadius: 10,
  background: "#0b0b0b",
  overflow: "hidden",
};

const liftSummary = {
  width: "100%",
  border: 0,
  borderRadius: 0,
  background: "transparent",
  padding: "10px 12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  textAlign: "left",
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
  marginTop: 8,
};

const setDetails = {
  borderTop: "1px solid #1d1d1d",
  padding: "8px 12px 10px",
};

const setDetailLine = {
  margin: "4px 0",
  color: "#bdbdb8",
  fontSize: 13,
  fontWeight: 750,
};

const editBtn = {
  color: "#32cfff",
  borderColor: "rgba(50, 207, 255, 0.45)",
  background: "rgba(50, 207, 255, 0.12)",
  padding: "7px 11px",
  fontSize: 13,
};

const cancelBtn = {
  color: "#aaa",
  borderColor: "#333",
  background: "#0b0b0b",
};

const deleteBtn = {
  color: "#ff6b2c",
  borderColor: "rgba(255, 107, 44, 0.45)",
  background: "rgba(255, 107, 44, 0.12)",
  padding: "7px 11px",
  fontSize: 13,
};

const deleteWorkoutBtn = {
  width: "100%",
  color: "#ff6b2c",
  borderColor: "rgba(255, 107, 44, 0.35)",
  background: "rgba(255, 107, 44, 0.08)",
  padding: "8px 11px",
  fontSize: 13,
};
