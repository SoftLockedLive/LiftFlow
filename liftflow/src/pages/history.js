import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  deleteLiftFromWorkout,
  deleteWorkout,
  getWorkoutId,
  getWorkouts,
  updateLiftInWorkout,
} from "../lib/workoutStorage";
import {
  buildExerciseHistory,
  calculateLiftVolume,
  getBaseExercise,
  getLiftSets,
  getWorkoutItems,
  normalizeExerciseName,
} from "../lib/workoutAnalytics";
import { colors, radii, type } from "../lib/theme";

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
        { volume: 0, sets: 0, sessions: 0 },
      ),
    [sessions],
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
      setsText: getLiftSets(lift).map(formatEditableSet).join(", "),
      error: "",
    });
  }

  function saveEditedLift() {
    if (!editingLift) return;
    const parts = editingLift.setsText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const sets = parts.map(parseEditableSet);
    if (sets.some((set) => !set)) {
      setEditingLift({
        ...editingLift,
        error: "Use weight x reps (e.g. 185x5) or a time (e.g. 60s), separated by commas.",
      });
      return;
    }

    const exercise = normalizeExerciseName(editingLift.exercise);
    setWorkouts(
      updateLiftInWorkout(editingLift.sessionId, editingLift.liftIndex, {
        exercise,
        // History, PRs and the coach read baseExercise first, so a rename has to update it too.
        baseExercise: exercise,
        sets,
      }),
    );
    setEditingLift(null);
  }

  return (
    <div style={wrap}>
      <header style={pageHeader}>
        <p style={type.eyebrow}>Training log</p>
        <h1 style={type.pageTitle}>History</h1>
      </header>

      <section style={statsGrid} aria-label="Totals">
        <Stat label="Sessions" value={totals.sessions.toLocaleString()} hint="logged" />
        <Stat label="Sets" value={totals.sets.toLocaleString()} hint="completed" />
        <Stat label="Volume" value={totals.volume.toLocaleString()} hint="lb lifted" />
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <div style={sectionHeader}>
          <h2 style={type.sectionTitle}>Workouts</h2>
          {search.trim() && (
            <span style={type.meta}>
              {filteredSessions.length} match{filteredSessions.length === 1 ? "" : "es"}
            </span>
          )}
        </div>

        {exerciseHistory.length > 0 && (
          <input
            aria-label="Search workouts"
            placeholder="Search exercise or workout"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        )}

        {filteredSessions.length === 0 ? (
          <div style={{ ...card, ...emptyState }}>
            {search.trim() ? (
              <span>No workouts match “{search.trim()}”.</span>
            ) : (
              <>
                <span>No workouts logged yet.</span>
                <button type="button" className="primary" onClick={() => router.push("/workout")}>
                  Start a workout
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={sessionList}>
            {filteredSessions.map((session, sessionIndex) => {
              const sessionOpen = Boolean(openSessions[session.id]);

              return (
                <article key={session.id} style={{ ...sessionItem, ...(sessionIndex === 0 ? { borderTop: 0 } : {}) }}>
                  <button
                    type="button"
                    onClick={() => toggleSession(session.id)}
                    style={sessionSummary}
                    aria-expanded={sessionOpen}
                  >
                    <div style={{ minWidth: 0 }}>
                      <h3 style={sessionName}>{session.name}</h3>
                      <p style={metaLine}>
                        {formatDate(session.date)} · {session.sets} sets
                      </p>
                    </div>
                    <span style={summaryRight}>
                      <span style={sessionVolume}>{session.volume.toLocaleString()} lb</span>
                      <Chevron open={sessionOpen} />
                    </span>
                  </button>

                  {sessionOpen && (
                    <div style={sessionDetails}>
                      {session.lifts.map(({ lift, index }) => {
                        const liftId = `${session.id}-${index}`;
                        const liftOpen = Boolean(openLifts[liftId]);
                        const sets = getLiftSets(lift);

                        return (
                          <div key={liftId} style={liftRow}>
                            <button
                              type="button"
                              onClick={() => toggleLift(liftId)}
                              style={liftSummary}
                              aria-expanded={liftOpen}
                            >
                              <div style={{ minWidth: 0 }}>
                                <strong style={liftName}>{getBaseExercise(lift)}</strong>
                                <p style={metaLine}>
                                  {lift.variation ? `${lift.variation} · ` : ""}
                                  {sets.length} set{sets.length === 1 ? "" : "s"}
                                </p>
                              </div>
                              <span style={summaryRight}>
                                <span style={liftVolume}>{calculateLiftVolume(lift).toLocaleString()} lb</span>
                                <Chevron open={liftOpen} />
                              </span>
                            </button>

                            {liftOpen && (
                              <div style={setDetails}>
                                <ol style={setList}>
                                  {sets.length > 0 ? (
                                    sets.map((set, setIndex) => (
                                      <li key={setIndex} style={setLine}>
                                        <span style={setNumber}>{setIndex + 1}</span>
                                        {formatLoggedSet(set)}
                                      </li>
                                    ))
                                  ) : (
                                    <li style={setLine}>No sets logged</li>
                                  )}
                                </ol>
                                <div style={liftActions}>
                                  <button
                                    type="button"
                                    onClick={() => startEditLift(session.id, index, lift)}
                                    style={smallBtn}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="danger"
                                    onClick={() => setConfirmDelete({ sessionId: session.id, liftIndex: index })}
                                    style={smallBtn}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div style={sessionActions}>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => setConfirmDeleteSession(session.id)}
                          style={smallBtn}
                        >
                          Delete workout
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editingLift && (
        <div style={modalOverlay} onClick={() => setEditingLift(null)}>
          <section
            style={modalPanel}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-lift-title"
          >
            <div style={modalHeader}>
              <h2 id="edit-lift-title" style={type.sectionTitle}>
                Edit lift
              </h2>
              <button
                type="button"
                className="ghost"
                onClick={() => setEditingLift(null)}
                style={closeBtn}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div style={modalBody}>
              <label style={field}>
                <span style={fieldLabel}>Exercise</span>
                <input
                  value={editingLift.exercise}
                  onChange={(event) => setEditingLift({ ...editingLift, exercise: event.target.value })}
                />
              </label>
              <label style={field}>
                <span style={fieldLabel}>Sets</span>
                <input
                  value={editingLift.setsText}
                  placeholder="225x5, 225x4, 205x8"
                  onChange={(event) => setEditingLift({ ...editingLift, setsText: event.target.value, error: "" })}
                  aria-invalid={Boolean(editingLift.error)}
                />
                {editingLift.error ? (
                  <span style={fieldError} role="alert">
                    {editingLift.error}
                  </span>
                ) : (
                  <span style={fieldHint}>Weight x reps (185x5) or a time (60s), separated by commas.</span>
                )}
              </label>
              <div style={editActions}>
                <button type="button" onClick={() => setEditingLift(null)}>
                  Cancel
                </button>
                <button type="button" className="primary" onClick={saveEditedLift}>
                  Save lift
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this lift?"
        message="This lift will be removed from the logged workout. If it is the only lift in that workout, the workout entry will be removed too."
        confirmLabel="Delete lift"
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
        title="Delete this workout?"
        message="This full workout history entry will be permanently removed."
        confirmLabel="Delete workout"
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

function Stat({ label, value, hint }) {
  return (
    <div style={statCell}>
      <span style={type.meta}>{label}</span>
      <strong style={statValue}>{value}</strong>
      <span style={statHint}>{hint}</span>
    </div>
  );
}

function Chevron({ open }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ ...chevron, transform: open ? "rotate(180deg)" : "none" }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function formatEditableSet(set) {
  const weight = Number(set.weight || 0);
  const duration = String(set.duration || "").trim();
  if (duration) {
    const time = /^\d+(\.\d+)?$/.test(duration) ? `${duration}s` : duration;
    return weight > 0 ? `${weight}x${time}` : time;
  }
  return `${weight}x${Number(set.reps || 0)}`;
}

// "185x5" -> weight/reps, "60s" or "25x60s" -> timed set. Returns null for anything else.
function parseEditableSet(text) {
  const [first, second, extra] = text.toLowerCase().replace(/\s+/g, "").split("x");
  if (extra !== undefined) return null;
  const isNumber = (value) => /^\d+(\.\d+)?$/.test(value || "");
  const asDuration = (value) => {
    const match = /^(\d+(?:\.\d+)?)s(?:ec)?$/.exec(value || "") || /^(\d+:\d{2})$/.exec(value || "");
    return match ? match[1] : null;
  };

  if (second === undefined) {
    const duration = asDuration(first);
    return duration ? { weight: 0, reps: 0, duration } : null;
  }
  if (!isNumber(first)) return null;
  if (isNumber(second)) return { weight: Number(first), reps: Number(second) };
  const duration = asDuration(second);
  return duration ? { weight: Number(first), reps: 0, duration } : null;
}

function normalizeSessions(workouts) {
  return workouts
    .map((workout, index) => {
      const lifts = getWorkoutItems(workout);
      const date = workout?.date || lifts[0]?.date || null;
      const sets = lifts.reduce((count, lift) => count + getLiftSets(lift).length, 0);
      const volume = lifts.reduce((sum, lift) => sum + calculateLiftVolume(lift), 0);

      return {
        id: getWorkoutId(workout, index),
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
        `${session.name} ${getBaseExercise(lift)} ${lift.variation || ""}`.toLowerCase().includes(query),
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
  display: "grid",
  gap: 16,
};

const pageHeader = {
  display: "grid",
  gap: 6,
  padding: "8px 0 4px",
};

const card = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  padding: 16,
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
};

const statCell = {
  display: "grid",
  gap: 2,
  padding: "10px 12px",
  borderRadius: radii.lg,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  minWidth: 0,
};

const statValue = {
  ...type.number,
  color: colors.text,
  fontSize: 22,
  fontWeight: 650,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const statHint = {
  color: colors.mutedStrong,
  fontSize: 12,
};

const sectionHeader = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
};

const emptyState = {
  display: "grid",
  justifyItems: "center",
  gap: 12,
  padding: "28px 16px",
  color: colors.muted,
  textAlign: "center",
};

const sessionList = {
  ...card,
  padding: 0,
  overflow: "hidden",
};

const sessionItem = {
  borderTop: `1px solid ${colors.borderSoft}`,
};

const sessionSummary = {
  width: "100%",
  border: 0,
  borderRadius: 0,
  background: "transparent",
  padding: "13px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  textAlign: "left",
  fontWeight: 400,
};

const sessionName = {
  margin: 0,
  color: colors.text,
  fontSize: 15,
  fontWeight: 550,
};

const metaLine = {
  ...type.meta,
  ...type.number,
  margin: "2px 0 0",
};

const summaryRight = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: "0 0 auto",
  color: colors.muted,
};

const chevron = {
  flex: "0 0 auto",
  transition: "transform 160ms ease",
};

const sessionVolume = {
  ...type.number,
  color: colors.textSoft,
  fontSize: 14,
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const sessionDetails = {
  display: "grid",
  padding: "0 16px",
  background: colors.surfaceSoft,
  borderTop: `1px solid ${colors.borderSoft}`,
};

const liftRow = {
  borderBottom: `1px solid ${colors.borderSoft}`,
};

const liftSummary = {
  width: "100%",
  border: 0,
  borderRadius: 0,
  background: "transparent",
  padding: "10px 0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  textAlign: "left",
  fontWeight: 400,
};

const liftName = {
  color: colors.textSoft,
  fontSize: 14,
  fontWeight: 550,
};

const liftVolume = {
  ...type.number,
  color: colors.muted,
  fontSize: 13,
  whiteSpace: "nowrap",
};

const setDetails = {
  display: "grid",
  gap: 10,
  padding: "0 0 12px",
};

const setList = {
  listStyle: "none",
  margin: 0,
  padding: "4px 12px",
  borderRadius: radii.md,
  background: colors.surface,
  border: `1px solid ${colors.borderSoft}`,
};

const setLine = {
  ...type.number,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 0",
  color: colors.textSoft,
  fontSize: 13,
};

const setNumber = {
  width: 18,
  color: colors.mutedStrong,
  fontSize: 12,
};

const liftActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
};

const sessionActions = {
  display: "flex",
  justifyContent: "flex-end",
  padding: "12px 0",
};

const smallBtn = {
  minHeight: 34,
  padding: "7px 12px",
  fontSize: 13,
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 230,
  background: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalPanel = {
  width: "min(440px, 100%)",
  maxHeight: "88vh",
  overflow: "auto",
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "14px 14px 0 18px",
};

const closeBtn = {
  width: 34,
  height: 34,
  padding: 0,
};

const modalBody = {
  display: "grid",
  gap: 14,
  padding: 18,
};

const field = {
  display: "grid",
  gap: 6,
};

const fieldLabel = {
  color: colors.textSoft,
  fontSize: 13,
  fontWeight: 500,
};

const fieldHint = {
  ...type.meta,
  fontSize: 12,
};

const fieldError = {
  ...fieldHint,
  color: colors.danger,
};

const editActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 4,
};
