import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getMuscleGroup, tint } from "../lib/muscleGroups";
import { getPlan } from "../lib/plan";
import { buildTodaysWorkout } from "../lib/trainingEngine";
import { getTodayName } from "../lib/today";
import { getWorkouts, saveWorkout } from "../lib/workoutStorage";
import { calculateSessionSummary, detectPRs } from "../lib/workoutAnalytics";
import { buildLiveSetRecommendation } from "../lib/coach";
import { colors, dayColors } from "../lib/theme";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
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
      const copy = { ...prev };
      if (nextSets.length > 0) {
        copy[exerciseId] = nextSets;
      } else {
        delete copy[exerciseId];
      }
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

  function toggleRampSet(exerciseId, setIndex) {
    setSession((prev) => {
      const rampState = { ...(prev.__ramp || {}) };
      const liftRamp = { ...(rampState[exerciseId] || {}) };
      liftRamp[setIndex] = !liftRamp[setIndex];
      rampState[exerciseId] = liftRamp;

      const copy = { ...prev, __ramp: rampState };
      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });
  }

  function updateVariation(exerciseId, patch) {
    setSession((prev) => {
      const variations = { ...(prev.__variations || {}) };
      const current = normalizeVariationDraft(variations[exerciseId]);
      const next = { ...current, ...patch };

      if (!next.open && !next.value && !next.custom) {
        delete variations[exerciseId];
      } else {
        variations[exerciseId] = next;
      }

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
      variation: getSelectedVariation(session.__variations?.[lift.id]),
      muscleGroup: lift.muscleGroup || "other",
      plannedSets: lift.sets || "",
      plannedReps: lift.reps || "",
      sets: getLoggedSets(session[lift.id]),
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
        {DAYS.map((day) => {
          const dayAccent = getDayAccent(day, plan);
          return (
            <button
              key={day}
              type="button"
              onClick={() => chooseDay(day)}
              style={{
                ...dayBtn,
                borderColor: tint(dayAccent, selectedDay === day ? 0.78 : 0.28),
                color: selectedDay === day ? colors.inverse : dayAccent,
                background: selectedDay === day ? dayAccent : tint(dayAccent, 0.08),
              }}
            >
              {day.slice(0, 3)}
            </button>
          );
        })}
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
            const dayAccent = getDayAccent(selectedDay, plan);
            const workingSets = Array.isArray(session[lift.id]) ? session[lift.id] : [];
            const variationOptions = getVariationOptions(lift);
            const variationDraft = normalizeVariationDraft(session.__variations?.[lift.id]);
            const selectedVariation = getSelectedVariation(variationDraft);
            const coach = lift.coachRecommendation;
            const liveCoach = buildLiveSetRecommendation(lift, session[lift.id] || [], coach);

            return (
              <article
                key={lift.id}
                style={{
                  ...liftCard,
                  borderColor: colors.border,
                  background: colors.surface,
                }}
              >
                <div style={liftHeader}>
                  <div>
                    <h2 style={liftTitle}>{lift.exercise}</h2>
                    <p style={liftMeta}>
                      {group.label} · {lift.sets} sets x {lift.reps} reps
                    </p>
                  </div>
                  {lift.suggestedWeight && (
                    <span style={{ ...suggestion, color: dayAccent, borderColor: tint(dayAccent, 0.38), background: colors.surfaceSoft }}>
                      {lift.suggestedWeight} lbs
                    </span>
                  )}
                </div>

                {coach && (
                  <section style={coachCard}>
                    <div style={coachHeader}>
                      <div>
                        <span style={coachLabel}>Coach</span>
                        <strong style={coachTitle}>{coach.headline}</strong>
                      </div>
                      <span style={coachBadge}>Flat sets</span>
                    </div>
                    <p style={coachDetail}>{coach.detail}</p>
                    {coach.warmups?.length > 0 && (
                      <div style={coachWarmupBlock}>
                        <span style={coachWarmupLabel}>{coach.warmupLabel || "Optional ramp"}</span>
                        <div style={coachWarmups}>
                          {coach.warmups.map((set, index) => {
                            const done = Boolean(session.__ramp?.[lift.id]?.[index]);

                            return (
                              <button
                                key={`${set.weight}-${set.reps}-${index}`}
                                type="button"
                                onClick={() => toggleRampSet(lift.id, index)}
                                style={{
                                  ...coachWarmupChip,
                                  ...(done ? coachWarmupChipDone : {}),
                                }}
                              >
                                <span style={{ ...miniCheckBox, ...(done ? miniCheckBoxDone : {}) }}>
                                  {done ? "✓" : ""}
                                </span>
                                {set.weight} x {set.reps}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {coach.contextNotes?.map((note) => (
                      <p key={note} style={coachContextNote}>{note}</p>
                    ))}
                    <div style={coachPlanRow}>
                      {coach.workingSetPlan && <span style={coachPlan}>{coach.workingSetPlan}</span>}
                      <strong style={coachAction}>{coach.nextAction}</strong>
                    </div>
                    {liveCoach && (
                      <div style={{ ...liveCoachBox, ...(liveCoach.tone === "up" ? liveCoachUp : liveCoach.tone === "down" ? liveCoachDown : {}) }}>
                        <strong>{liveCoach.label}</strong>
                        <span>{liveCoach.detail}</span>
                      </div>
                    )}
                  </section>
                )}

                <div style={variationWrap}>
                  <button
                    type="button"
                    onClick={() => updateVariation(lift.id, { open: !variationDraft.open })}
                    style={variationToggle}
                  >
                    Variation: {selectedVariation || "None"}
                  </button>

                  {variationDraft.open && (
                    <div style={variationPanel}>
                      <div style={variationChips}>
                        <button
                          type="button"
                          onClick={() => updateVariation(lift.id, { value: "", custom: "", open: false })}
                          style={{
                            ...variationChip,
                            ...(!selectedVariation ? activeVariationChip : {}),
                          }}
                        >
                          None
                        </button>
                        {variationOptions.map((variation) => (
                          <button
                            key={variation}
                            type="button"
                            onClick={() => updateVariation(lift.id, { value: variation, custom: "", open: false })}
                            style={{
                              ...variationChip,
                              ...(selectedVariation === variation ? activeVariationChip : {}),
                            }}
                          >
                            {variation}
                          </button>
                        ))}
                      </div>
                      <input
                        placeholder="Custom variation performed"
                        value={variationDraft.custom}
                        onChange={(event) => updateVariation(lift.id, { custom: event.target.value, value: "" })}
                      />
                    </div>
                  )}
                </div>

                {(lift.note || lift.stretches) && (
                  <div style={stretchBox}>
                    <span style={stretchLabel}>Lift Note</span>
                    <p style={stretchText}>{lift.note || lift.stretches}</p>
                  </div>
                )}

                <div style={workingSetHeader}>
                  <span style={workingSetLabel}>Working sets</span>
                  <span style={workingSetMeta}>Counts for history and PRs.</span>
                </div>

                {workingSets.length === 0 ? (
                  <button type="button" onClick={() => addSet(lift.id)} style={emptySetButton}>
                    Add first working set
                  </button>
                ) : (
                  <div style={setList}>
                    {workingSets.map((_, i) => (
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
                )}

                {workingSets.length > 0 && (
                  <button type="button" onClick={() => addSet(lift.id)} style={{ ...addSetBtn, color: dayAccent, borderColor: tint(dayAccent, 0.38), background: colors.surfaceSoft }}>
                    Add Set
                  </button>
                )}
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

function getLoggedSets(sets) {
  return (Array.isArray(sets) ? sets : []).filter((set) => {
    const weight = Number(set?.weight || 0);
    const reps = Number(set?.reps || 0);
    return weight > 0 || reps > 0;
  });
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

function getDayAccent(day, plan) {
  return plan.__meta?.[day]?.recovery ? dayColors.recovery : dayColors[day] || colors.brand;
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

function normalizeVariationDraft(value) {
  if (!value) return { open: false, value: "", custom: "" };
  if (typeof value === "string") return { open: false, value, custom: "" };
  return {
    open: Boolean(value.open),
    value: value.value || "",
    custom: value.custom || "",
  };
}

function getSelectedVariation(draft) {
  const normalized = normalizeVariationDraft(draft);
  return normalized.custom.trim() || normalized.value || "";
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
  border: `1px solid ${tint(dayColors.recovery, 0.36)}`,
  borderRadius: 16,
  background: colors.surface,
  padding: 18,
};

const recoveryTitle = {
  margin: "6px 0 8px",
  color: dayColors.recovery,
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
  gap: 12,
};

const timerCard = {
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  background: "#101010",
  padding: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
};

const emphasisCard = {
  border: `1px solid ${tint(dayColors.recovery, 0.28)}`,
  borderRadius: 14,
  background: colors.surface,
  padding: 14,
};

const emphasisTitle = {
  margin: "4px 0 0",
  color: dayColors.recovery,
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
  color: colors.text,
  borderColor: colors.border,
  background: colors.surfaceSoft,
  display: "grid",
  gap: 5,
  textAlign: "left",
  padding: 12,
};

const warmupCard = {
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  background: colors.surface,
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
  color: colors.text,
  fontSize: 22,
};

const warmupCount = {
  color: colors.muted,
  border: `1px solid ${colors.border}`,
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
  borderTop: `1px solid ${colors.borderSoft}`,
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
  border: `1px solid ${colors.border}`,
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
  background: colors.brand,
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
  color: colors.muted,
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
  marginTop: 2,
  color: "#32cfff",
  fontSize: 24,
  lineHeight: 1,
};

const timerActions = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const timerChip = {
  padding: "7px 10px",
  color: "#8a8a8a",
};

const activeTimerChip = {
  color: "#050505",
  background: "#f7f7f2",
  borderColor: "#f7f7f2",
};

const timerStart = {
  padding: "7px 13px",
};

const liftCard = {
  border: "1px solid",
  borderRadius: 14,
  padding: 13,
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
  fontSize: 20,
};

const liftMeta = {
  margin: "4px 0 0",
  color: "#777",
  fontWeight: 750,
  fontSize: 13,
};

const suggestion = {
  border: "1px solid currentColor",
  borderRadius: 999,
  padding: "6px 10px",
  fontWeight: 850,
  whiteSpace: "nowrap",
};

const coachCard = {
  border: "1px solid rgba(50, 207, 255, 0.2)",
  borderRadius: 10,
  background: "rgba(50, 207, 255, 0.06)",
  padding: 10,
  marginTop: 10,
  display: "grid",
  gap: 6,
};

const coachHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const coachLabel = {
  display: "block",
  color: "#777",
  fontSize: 10,
  fontWeight: 850,
  textTransform: "uppercase",
};

const coachTitle = {
  display: "block",
  marginTop: 1,
  color: "#32cfff",
  fontSize: 18,
};

const coachBadge = {
  color: "#32cfff",
  background: "rgba(50, 207, 255, 0.1)",
  border: "1px solid rgba(50, 207, 255, 0.26)",
  borderRadius: 999,
  padding: "4px 8px",
  fontWeight: 900,
  whiteSpace: "nowrap",
  fontSize: 11,
  textTransform: "uppercase",
};

const coachDetail = {
  margin: 0,
  color: "#bdbdb8",
  lineHeight: 1.3,
  fontSize: 12,
};

const coachWarmups = {
  display: "flex",
  flexWrap: "nowrap",
  gap: 6,
  overflowX: "auto",
  paddingBottom: 1,
};

const coachWarmupBlock = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

const coachWarmupLabel = {
  color: "#777",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
  flex: "0 0 auto",
};

const coachWarmupChip = {
  border: "1px solid rgba(50, 207, 255, 0.28)",
  borderRadius: 999,
  color: "#32cfff",
  background: "#050505",
  padding: "5px 7px",
  fontSize: 11,
  fontWeight: 850,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  flex: "0 0 auto",
};

const coachWarmupChipDone = {
  color: "#050505",
  background: "#32cfff",
  borderColor: "#32cfff",
};

const miniCheckBox = {
  width: 13,
  height: 13,
  border: "1px solid currentColor",
  borderRadius: 4,
  color: "inherit",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  lineHeight: 1,
};

const miniCheckBoxDone = {
  borderColor: "#050505",
};

const coachContextNote = {
  margin: 0,
  color: "#d9d178",
  fontSize: 11,
  lineHeight: 1.3,
};

const coachPlanRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const coachPlan = {
  margin: 0,
  color: "#d7d7d2",
  fontSize: 11,
  lineHeight: 1.3,
};

const coachAction = {
  margin: 0,
  color: "#f7f7f2",
  fontWeight: 800,
  fontSize: 12,
};

const liveCoachBox = {
  border: "1px solid rgba(228, 255, 47, 0.3)",
  borderRadius: 10,
  background: "rgba(228, 255, 47, 0.08)",
  color: "#e4ff2f",
  padding: 8,
  display: "grid",
  gap: 4,
  fontSize: 12,
};

const liveCoachUp = {
  borderColor: "rgba(50, 223, 118, 0.35)",
  background: "rgba(50, 223, 118, 0.08)",
  color: "#32df76",
};

const liveCoachDown = {
  borderColor: "rgba(255, 107, 44, 0.35)",
  background: "rgba(255, 107, 44, 0.08)",
  color: "#ff9b34",
};

const stretchBox = {
  border: "1px solid #242424",
  borderRadius: 10,
  background: "#0b0b0b",
  padding: 10,
  marginTop: 10,
};

const variationWrap = {
  display: "grid",
  gap: 6,
  marginTop: 10,
};

const variationToggle = {
  justifySelf: "start",
  color: "#32cfff",
  borderColor: "rgba(50, 207, 255, 0.38)",
  background: "rgba(50, 207, 255, 0.1)",
  padding: "7px 10px",
  fontSize: 12,
};

const variationPanel = {
  display: "grid",
  gap: 7,
  border: "1px solid #242424",
  borderRadius: 10,
  background: "#0b0b0b",
  padding: 9,
};

const variationChips = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const variationChip = {
  color: "#aaa",
  borderColor: "#303030",
  background: "#101010",
  padding: "7px 10px",
  fontSize: 12,
};

const activeVariationChip = {
  color: "#050505",
  borderColor: "#32cfff",
  background: "#32cfff",
};

const stretchLabel = {
  display: "block",
  color: colors.muted,
  fontSize: 11,
  fontWeight: 850,
  textTransform: "uppercase",
};

const stretchText = {
  margin: "4px 0 0",
  color: "#d7d7d2",
  lineHeight: 1.35,
  fontSize: 13,
};

const workingSetHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginTop: 12,
  paddingTop: 10,
  borderTop: "1px solid rgba(247, 247, 242, 0.12)",
};

const workingSetLabel = {
  color: "#f7f7f2",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

const workingSetMeta = {
  color: "#777",
  fontSize: 11,
  fontWeight: 700,
};

const setList = {
  display: "grid",
  gap: 8,
  marginTop: 8,
};

const emptySetButton = {
  width: "100%",
  marginTop: 8,
  padding: "9px 12px",
  color: "#32cfff",
  borderColor: "rgba(50, 207, 255, 0.34)",
  background: "rgba(50, 207, 255, 0.08)",
  fontSize: 13,
};

const setRow = {
  gap: 8,
  gridTemplateColumns: "1fr 1fr auto",
};

const addSetBtn = {
  width: "100%",
  marginTop: 10,
  padding: "7px 12px",
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
  border: `1px solid ${colors.border}`,
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
  border: `1px solid ${tint(colors.accent, 0.32)}`,
  borderRadius: 14,
  background: colors.surfaceSoft,
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
