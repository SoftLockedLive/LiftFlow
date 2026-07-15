import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getMuscleGroup, tint } from "../lib/muscleGroups";
import { getPlan } from "../lib/plan";
import { buildTodaysWorkout } from "../lib/trainingEngine";
import { getTodayName } from "../lib/today";
import { getWorkouts, saveWorkout } from "../lib/workoutStorage";
import { calculateSessionSummary, detectPRs } from "../lib/workoutAnalytics";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ACCENT = "#32cfff";
const DAY_ACCENTS = {
  Monday: "#32cfff",
  Tuesday: "#ff6b2c",
  Wednesday: "#e4ff2f",
  Thursday: "#be72ff",
  Friday: "#ff9b34",
  Saturday: "#32df76",
  Sunday: "#f7f7f2",
};
const DRAFT_KEY = "liftflow_workout_drafts";
const LAST_DAY_KEY = "liftflow_last_workout_day";

export default function Workout() {
  const router = useRouter();
  const [plan, setPlan] = useState({});
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [program, setProgram] = useState([]);
  const [session, setSession] = useState({});
  const [drafts, setDrafts] = useState({});
  const [restSeconds, setRestSeconds] = useState(0);
  const [restPreset, setRestPreset] = useState(90);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (restSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setRestSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [restSeconds]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedPlan = getPlan();
      const savedDay = getLastWorkoutDay();
      const today = DAYS.includes(savedDay) ? savedDay : getTodayName();
      const savedDrafts = getWorkoutDrafts();

      setPlan(savedPlan);
      setSelectedDay(today);
      setProgram(buildTodaysWorkout(today));
      setDrafts(savedDrafts);
      setSession(savedDrafts[today] || {});
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function chooseDay(day) {
    setSelectedDay(day);
    saveLastWorkoutDay(day);
    setProgram(buildTodaysWorkout(day));
    setSession(drafts[day] || {});
  }

  function updateSet(exerciseId, setIndex, field, value) {
    setSession((prev) => {
      const copy = { ...prev };

      if (!copy[exerciseId]) {
        copy[exerciseId] = [];
      }

      copy[exerciseId][setIndex] = {
        ...(copy[exerciseId][setIndex] || {}),
        [field]: Number(value),
      };

      const updatedDrafts = {
        ...drafts,
        [selectedDay]: copy,
      };

      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);

      return copy;
    });
  }

  function addSet(exerciseId) {
    setSession((prev) => {
      const nextSets = [...(prev[exerciseId] || []), {}];
      const copy = { ...prev, [exerciseId]: nextSets };
      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });
  }

  function removeSet(exerciseId, setIndex) {
    setSession((prev) => {
      const nextSets = [...(prev[exerciseId] || [])];
      nextSets.splice(setIndex, 1);
      const copy = { ...prev, [exerciseId]: nextSets };
      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });
  }

  function toggleWarmup(movementId) {
    setSession((prev) => {
      const warmupState = { ...(prev.__warmup || {}) };
      warmupState[movementId] = !warmupState[movementId];
      const copy = { ...prev, __warmup: warmupState };
      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });
  }

  function updateVariation(exerciseId, variation) {
    setSession((prev) => {
      const variations = { ...(prev.__variations || {}) };
      variations[exerciseId] = variation;
      const copy = { ...prev, __variations: variations };
      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });
  }

  function finishWorkout() {
    const previousWorkouts = getWorkouts();
    const completedWorkout = program.map((lift) => ({
      exercise: lift.baseExercise || lift.exercise,
      variation: getSelectedVariation(lift, session),
      muscleGroup: lift.muscleGroup || "other",
      sets: session[lift.id] || [],
      date: Date.now(),
      suggestedWeight: lift.suggestedWeight || null,
      note: lift.note || lift.stretches || "",
      stretches: lift.stretches || "",
    }));
    const workoutSummary = calculateSessionSummary(completedWorkout);
    const prs = detectPRs(previousWorkouts, completedWorkout);

    saveWorkout(completedWorkout, {
      day: selectedDay,
      focus: plan.__meta?.[selectedDay]?.name || selectedDay,
      summary: workoutSummary,
      prs,
    });

    const updatedDrafts = { ...drafts };
    delete updatedDrafts[selectedDay];
    setDrafts(updatedDrafts);
    saveWorkoutDrafts(updatedDrafts);

    setSummary({
      focus: plan.__meta?.[selectedDay]?.name || selectedDay,
      day: selectedDay,
      ...workoutSummary,
      prs,
    });
    setPlan(getPlan());
    setProgram(buildTodaysWorkout(selectedDay));
    setSession({});
  }

  const focusName = plan.__meta?.[selectedDay]?.name || selectedDay;
  const recovery = plan.__meta?.[selectedDay]?.recovery;
  const warmup = Array.isArray(plan.__meta?.[selectedDay]?.warmup) ? plan.__meta[selectedDay].warmup : [];
  const emphasis = plan.__meta?.[selectedDay]?.emphasis || "";
  const actionCards = Array.isArray(plan.__meta?.[selectedDay]?.actionCards) ? plan.__meta[selectedDay].actionCards : [];

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Workout</p>
          <h1 style={title}>{focusName}</h1>
        </div>
        <span style={count}>{program.length} lifts</span>
      </header>

      <div style={dayRow}>
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => chooseDay(day)}
            style={{
              ...dayBtn,
              borderColor: getDayAccent(day, selectedDay === day ? 0.78 : 0.28),
              color: selectedDay === day ? "#050505" : getDayAccent(day),
              background: selectedDay === day ? getDayAccent(day) : getDayAccent(day, 0.08),
            }}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {recovery ? (
        <section style={recoveryCard}>
          <p style={eyebrow}>Recovery Day</p>
          <h2 style={recoveryTitle}>{focusName}</h2>
          <p style={recoveryMeta}>{recovery.activity} · {recovery.duration} · {recovery.intensity}</p>
          {recovery.notes && <p style={recoveryNotes}>{recovery.notes}</p>}
        </section>
      ) : program.length === 0 ? (
        <section style={empty}>No workout planned for {selectedDay}.</section>
      ) : (
        <section style={list}>
          {emphasis && (
            <section style={emphasisCard}>
              <p style={eyebrow}>Recovery Emphasis</p>
              <h2 style={emphasisTitle}>{focusName}</h2>
              <p style={emphasisText}>{emphasis}</p>
            </section>
          )}

          {actionCards.length > 0 && (
            <section style={actionGrid}>
              {actionCards.map((card) => (
                <button key={card.href} type="button" onClick={() => router.push(card.href)} style={actionCard}>
                  <strong>{card.label}</strong>
                  <span>{card.description}</span>
                </button>
              ))}
            </section>
          )}

          {warmup.length > 0 && (
            <section style={warmupCard}>
              <div style={warmupHeader}>
                <div>
                  <p style={eyebrow}>Warmup</p>
                  <h2 style={warmupTitle}>Prep Work</h2>
                </div>
                <span style={warmupCount}>{warmup.length} moves</span>
              </div>
              <div style={warmupList}>
                {warmup.map((movement, index) => {
                  const movementId = movement.id || `${movement.name}-${index}`;
                  const done = Boolean(session.__warmup?.[movementId]);

                  return (
                    <button
                      key={movementId}
                      type="button"
                      onClick={() => toggleWarmup(movementId)}
                      style={{
                        ...warmupRow,
                        ...(done ? warmupRowDone : {}),
                      }}
                    >
                      <span style={{ ...checkBox, ...(done ? checkBoxDone : {}) }}>{done ? "✓" : ""}</span>
                      <span style={warmupMain}>
                        <strong style={warmupName}>{movement.name}</strong>
                        {movement.note && <span style={warmupNote}>{movement.note}</span>}
                      </span>
                      <span style={warmupDose}>{formatWarmupMovement(movement)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div style={timerCard}>
            <div>
              <span style={timerLabel}>Rest Timer</span>
              <strong style={timerValue}>{formatRestTime(restSeconds)}</strong>
            </div>
            <div style={timerActions}>
              {[60, 90, 120].map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => setRestPreset(seconds)}
                  style={{
                    ...timerChip,
                    ...(restPreset === seconds ? activeTimerChip : {}),
                  }}
                >
                  {seconds}s
                </button>
              ))}
              <button type="button" className="primary" onClick={() => setRestSeconds(restPreset)} style={timerStart}>
                Start
              </button>
              <button type="button" onClick={() => setRestSeconds(0)} style={timerChip}>
                Reset
              </button>
            </div>
          </div>

          {program.map((lift) => {
            const group = getMuscleGroup(lift.muscleGroup);
            const rowCount = Math.max(getSetRowCount(lift.sets), session[lift.id]?.length || 0);
            const variationOptions = getVariationOptions(lift);
            const selectedVariation = getSelectedVariation(lift, session);

            return (
              <article
                key={lift.id}
                style={{
                  ...liftCard,
                  borderColor: tint(group.color, 0.42),
                  background: tint(group.color, 0.07),
                }}
              >
                <div style={liftHeader}>
                  <div>
                    <h2 style={{ ...liftTitle, color: group.color }}>{lift.exercise}</h2>
                    <p style={liftMeta}>
                      {group.label} · {lift.sets} sets x {lift.reps} reps
                    </p>
                  </div>
                  {lift.suggestedWeight && (
                    <span style={{ ...suggestion, color: group.color }}>
                      {lift.suggestedWeight} lbs
                    </span>
                  )}
                </div>

                {variationOptions.length > 0 && (
                  <label style={variationWrap}>
                    <span style={variationLabel}>Variation</span>
                    <select
                      value={selectedVariation}
                      onChange={(event) => updateVariation(lift.id, event.target.value)}
                    >
                      {variationOptions.map((variation) => (
                        <option key={variation} value={variation}>
                          {variation}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {(lift.note || lift.stretches) && (
                  <div style={stretchBox}>
                    <span style={stretchLabel}>Lift Note</span>
                    <p style={stretchText}>{lift.note || lift.stretches}</p>
                  </div>
                )}

                <div style={setList}>
                  {Array.from({ length: rowCount }).map((_, i) => (
                    <div key={i} className="field-row" style={setRow}>
                      <input
                        type="number"
                        placeholder={`Set ${i + 1} weight`}
                        value={session[lift.id]?.[i]?.weight || ""}
                        onChange={(event) => updateSet(lift.id, i, "weight", event.target.value)}
                      />
                      <input
                        type="number"
                        placeholder={`Set ${i + 1} reps`}
                        value={session[lift.id]?.[i]?.reps || ""}
                        onChange={(event) => updateSet(lift.id, i, "reps", event.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeSet(lift.id, i)}
                        style={removeSetBtn}
                        aria-label={`Remove set ${i + 1}`}
                      >
                        -
                      </button>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => addSet(lift.id)} style={{ ...addSetBtn, color: group.color, borderColor: tint(group.color, 0.38), background: tint(group.color, 0.1) }}>
                  Add Set
                </button>
              </article>
            );
          })}
        </section>
      )}

      {!recovery && program.length > 0 && (
        <button type="button" className="primary" onClick={finishWorkout} style={finishBtn}>
          Finish Workout
        </button>
      )}

      {summary && (
        <section style={summaryPanel}>
          <div style={summaryTop}>
            <div>
              <p style={eyebrow}>Workout Complete</p>
              <h2 style={summaryTitle}>{summary.focus}</h2>
            </div>
            <button type="button" onClick={() => setSummary(null)} style={closeSummary}>
              Close
            </button>
          </div>

          <div className="history-stats" style={summaryStats}>
            <SummaryStat label="Sets" value={summary.sets} />
            <SummaryStat label="Volume" value={`${summary.volume.toLocaleString()} lb`} />
            <SummaryStat
              label="Top Set"
              value={summary.topSet ? `${summary.topSet.weight}x${summary.topSet.reps}` : "--"}
            />
          </div>

          {summary.prs.length > 0 && (
            <div style={prBox}>
              <strong style={prTitle}>New PRs</strong>
              {summary.prs.map((pr) => (
                <p key={`${pr.exercise}-${pr.weight}-${pr.reps}`} style={prLine}>
                  {pr.exercise}: {pr.weight} lb x {pr.reps}
                </p>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div style={summaryStat}>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value}</strong>
    </div>
  );
}

function getSetRowCount(sets) {
  const numbers = String(sets || "")
    .split("-")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (numbers.length === 0) return 0;
  return Math.max(...numbers);
}

function getWorkoutDrafts() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveWorkoutDrafts(drafts) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

function getLastWorkoutDay() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LAST_DAY_KEY) || "";
}

function saveLastWorkoutDay(day) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_DAY_KEY, day);
}

function getDayAccent(day, alpha) {
  const color = DAY_ACCENTS[day] || ACCENT;

  if (alpha === undefined) return color;
  return tint(color, alpha);
}

function formatRestTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function formatWarmupMovement(movement) {
  if (movement.mode === "time") return movement.time || "Timed";
  const sets = movement.sets || "--";
  const reps = movement.reps || "--";
  return `${sets} x ${reps}`;
}

function getVariationOptions(lift) {
  const configured = Array.isArray(lift.variations) ? lift.variations.filter(Boolean) : [];
  if (configured.length > 0) return configured;

  const name = String(lift.exercise || "").toLowerCase();
  if (name.includes("lateral raise")) {
    return ["Dumbbell Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise"];
  }
  if (name.includes("pulldown")) {
    return ["Lat Pulldown", "Neutral-Grip Pulldown", "Single-Arm Pulldown"];
  }
  if (name.includes("row")) {
    return ["Chest-Supported Row", "Cable Row", "Dumbbell Row", "Machine Row"];
  }
  if (name.includes("curl")) {
    return ["EZ-Bar Curl", "Dumbbell Curl", "Cable Curl"];
  }
  return [];
}

function getSelectedVariation(lift, session) {
  const options = getVariationOptions(lift);
  if (options.length === 0) return "";
  return session.__variations?.[lift.id] || lift.defaultVariation || options[0];
}

const wrap = {
  maxWidth: 760,
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 18,
};

const eyebrow = {
  margin: 0,
  color: "#32cfff",
  fontSize: 13,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 32,
  lineHeight: 1.1,
};

const count = {
  border: "1px solid rgba(50, 207, 255, 0.35)",
  borderRadius: 999,
  padding: "8px 12px",
  color: "#32cfff",
  background: "rgba(50, 207, 255, 0.08)",
  fontWeight: 850,
};

const dayRow = {
  display: "flex",
  overflowX: "auto",
  gap: 8,
  marginBottom: 14,
  paddingBottom: 6,
};

const dayBtn = {
  minWidth: 56,
  padding: "9px 12px",
  borderColor: "#242424",
  background: "#070707",
  color: "#666",
};

const empty = {
  border: "1px solid #222",
  borderRadius: 16,
  background: "#101010",
  padding: 22,
  color: "#555",
  textAlign: "center",
  fontWeight: 850,
};

const recoveryCard = {
  border: "1px solid rgba(50, 223, 118, 0.35)",
  borderRadius: 16,
  background: "rgba(50, 223, 118, 0.08)",
  padding: 18,
};

const recoveryTitle = {
  margin: "6px 0 8px",
  color: "#32df76",
  fontSize: 26,
};

const recoveryMeta = {
  margin: 0,
  color: "#d7d7d2",
  fontWeight: 800,
};

const recoveryNotes = {
  margin: "10px 0 0",
  color: "#8a8a8a",
  lineHeight: 1.45,
};

const list = {
  display: "grid",
  gap: 14,
};

const timerCard = {
  border: "1px solid rgba(50, 207, 255, 0.35)",
  borderRadius: 16,
  background: "#101010",
  padding: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
};

const emphasisCard = {
  border: "1px solid rgba(50, 223, 118, 0.32)",
  borderRadius: 14,
  background: "rgba(50, 223, 118, 0.07)",
  padding: 14,
};

const emphasisTitle = {
  margin: "4px 0 0",
  color: "#32df76",
  fontSize: 22,
};

const emphasisText = {
  margin: "8px 0 0",
  color: "#bdbdb8",
  lineHeight: 1.4,
};

const actionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const actionCard = {
  borderRadius: 12,
  color: "#e4ff2f",
  borderColor: "rgba(228, 255, 47, 0.35)",
  background: "rgba(228, 255, 47, 0.08)",
  display: "grid",
  gap: 5,
  textAlign: "left",
  padding: 12,
};

const warmupCard = {
  border: "1px solid rgba(228, 255, 47, 0.32)",
  borderRadius: 14,
  background: "rgba(228, 255, 47, 0.06)",
  padding: 14,
};

const warmupHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 10,
};

const warmupTitle = {
  margin: "4px 0 0",
  color: "#e4ff2f",
  fontSize: 22,
};

const warmupCount = {
  color: "#e4ff2f",
  border: "1px solid rgba(228, 255, 47, 0.35)",
  borderRadius: 999,
  padding: "6px 10px",
  fontWeight: 850,
};

const warmupList = {
  display: "grid",
  gap: 8,
};

const warmupRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  borderTop: "1px solid rgba(228, 255, 47, 0.16)",
  borderLeft: 0,
  borderRight: 0,
  borderBottom: 0,
  borderRadius: 0,
  background: "transparent",
  paddingTop: 8,
  textAlign: "left",
};

const warmupRowDone = {
  opacity: 0.62,
};

const checkBox = {
  width: 22,
  height: 22,
  border: "1px solid rgba(228, 255, 47, 0.45)",
  borderRadius: 6,
  color: "#050505",
  background: "#050505",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  fontWeight: 900,
};

const checkBoxDone = {
  background: "#e4ff2f",
};

const warmupMain = {
  display: "grid",
  gap: 3,
  flex: "1 1 auto",
};

const warmupName = {
  color: "#f7f7f2",
};

const warmupNote = {
  color: "#8a8a8a",
  fontSize: 13,
};

const warmupDose = {
  color: "#e4ff2f",
  fontWeight: 850,
  whiteSpace: "nowrap",
};

const timerLabel = {
  display: "block",
  color: "#666",
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const timerValue = {
  display: "block",
  marginTop: 4,
  color: "#32cfff",
  fontSize: 30,
  lineHeight: 1,
};

const timerActions = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const timerChip = {
  padding: "8px 11px",
  color: "#8a8a8a",
};

const activeTimerChip = {
  color: "#050505",
  background: "#f7f7f2",
  borderColor: "#f7f7f2",
};

const timerStart = {
  padding: "8px 14px",
};

const liftCard = {
  border: "1px solid",
  borderRadius: 16,
  padding: 16,
  background: "#101010",
};

const liftHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const liftTitle = {
  margin: 0,
  fontSize: 22,
};

const liftMeta = {
  margin: "6px 0 0",
  color: "#777",
  fontWeight: 750,
};

const suggestion = {
  border: "1px solid currentColor",
  borderRadius: 999,
  padding: "6px 10px",
  fontWeight: 850,
  whiteSpace: "nowrap",
};

const stretchBox = {
  border: "1px solid #242424",
  borderRadius: 12,
  background: "#0b0b0b",
  padding: 12,
  marginTop: 12,
};

const variationWrap = {
  display: "grid",
  gap: 6,
  marginTop: 12,
};

const variationLabel = {
  color: "#777",
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const stretchLabel = {
  display: "block",
  color: "#e4ff2f",
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const stretchText = {
  margin: "6px 0 0",
  color: "#d7d7d2",
  lineHeight: 1.4,
};

const setList = {
  display: "grid",
  gap: 10,
  marginTop: 14,
};

const setRow = {
  gap: 10,
  gridTemplateColumns: "1fr 1fr auto",
};

const addSetBtn = {
  width: "100%",
  marginTop: 12,
  padding: "8px 12px",
};

const removeSetBtn = {
  width: 38,
  height: 38,
  padding: 0,
  borderColor: "rgba(255, 107, 44, 0.42)",
  color: "#ff6b2c",
  background: "rgba(255, 107, 44, 0.1)",
};

const finishBtn = {
  width: "100%",
  marginTop: 18,
  padding: 13,
};

const summaryPanel = {
  border: "1px solid rgba(228, 255, 47, 0.35)",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
  marginTop: 14,
};

const summaryTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const summaryTitle = {
  margin: "6px 0 0",
  fontSize: 24,
};

const closeSummary = {
  color: "#aaa",
  borderColor: "#333",
  background: "#0b0b0b",
};

const summaryStats = {
  gap: 10,
  marginTop: 14,
};

const summaryStat = {
  border: "1px solid #242424",
  borderRadius: 14,
  background: "#0b0b0b",
  padding: 12,
};

const summaryLabel = {
  display: "block",
  color: "#666",
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const summaryValue = {
  display: "block",
  marginTop: 6,
  color: "#32cfff",
  fontSize: 19,
};

const prBox = {
  border: "1px solid rgba(228, 255, 47, 0.35)",
  borderRadius: 14,
  background: "rgba(228, 255, 47, 0.08)",
  padding: 12,
  marginTop: 12,
};

const prTitle = {
  color: "#e4ff2f",
};

const prLine = {
  margin: "6px 0 0",
  color: "#f7f7f2",
  fontWeight: 750,
};
