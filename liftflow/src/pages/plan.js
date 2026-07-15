import { useEffect, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { deleteCustomExercise, getCustomExercises, upsertCustomExercise } from "../lib/customExercises";
import { getMuscleGroup, MUSCLE_GROUPS, tint } from "../lib/muscleGroups";
import { getPlan, savePlan } from "../lib/plan";
import { colors, dayColors } from "../lib/theme";
import {
  DAY_TEMPLATES,
  DEFAULT_EXERCISES,
  PROGRAM_TEMPLATES,
  RECOVERY_TEMPLATES,
  buildDayFromTemplate,
  buildPlanFromTemplate,
} from "../lib/programTemplates";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ACCENT = colors.brand;

export default function Plan() {
  const [plan, setPlan] = useState({});
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [dayName, setDayName] = useState("");
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [stretches, setStretches] = useState("");
  const [warmupName, setWarmupName] = useState("");
  const [warmupMode, setWarmupMode] = useState("reps");
  const [warmupSets, setWarmupSets] = useState("");
  const [warmupReps, setWarmupReps] = useState("");
  const [warmupTime, setWarmupTime] = useState("");
  const [warmupNote, setWarmupNote] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("chest");
  const [editingId, setEditingId] = useState(null);
  const [editingWarmupId, setEditingWarmupId] = useState(null);
  const [customExercises, setCustomExercises] = useState([]);
  const [editingCustomId, setEditingCustomId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [builderPanel, setBuilderPanel] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedPlan = getPlan();
      setPlan(savedPlan);
      setDayName(savedPlan.__meta?.Monday?.name || "");
      setCustomExercises(getCustomExercises());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function selectDay(day) {
    setSelectedDay(day);
    setDayName(plan.__meta?.[day]?.name || "");
    clearForm();
  }

  function saveDayName(value) {
    setDayName(value);

    const updated = {
      ...plan,
      __meta: {
        ...(plan.__meta || {}),
        [selectedDay]: {
          ...(plan.__meta?.[selectedDay] || {}),
          name: value,
        },
      },
    };

    setPlan(updated);
    savePlan(updated);
  }

  function handleSaveExercise() {
    if (!exercise || !sets || !reps) return;

    const updated = { ...plan };
    const dayPlan = Array.isArray(updated[selectedDay]) ? updated[selectedDay] : [];

    if (editingId) {
      updated[selectedDay] = dayPlan.map((lift) =>
        lift.id === editingId
          ? {
              ...lift,
              exercise,
              muscleGroup,
              sets,
              reps,
              note: stretches,
              stretches,
            }
          : lift
      );
    } else {
      updated[selectedDay] = [
        ...dayPlan,
        {
          id: crypto.randomUUID(),
          exercise,
          muscleGroup,
          sets,
          reps,
          note: stretches,
          stretches,
        },
      ];
    }

    setPlan(updated);
    savePlan(updated);
    clearForm();
  }

  function addExerciseToDay(lift) {
    const updated = { ...plan };
    const dayPlan = Array.isArray(updated[selectedDay]) ? updated[selectedDay] : [];
    updated[selectedDay] = [
      ...dayPlan,
      {
        id: crypto.randomUUID(),
        exercise: lift.exercise,
        muscleGroup: lift.muscleGroup || "other",
        sets: lift.sets || "3",
        reps: lift.reps || "8-12",
        note: lift.note || lift.stretches || "",
        stretches: lift.stretches || "",
      },
    ];
    updated.__meta = {
      ...(updated.__meta || {}),
      [selectedDay]: {
        ...(updated.__meta?.[selectedDay] || {}),
        type: "training",
        recovery: null,
      },
    };

    setPlan(updated);
    savePlan(updated);
  }

  function saveCustomExercise() {
    if (!exercise.trim()) return;

    const updated = upsertCustomExercise({
      id: editingCustomId,
      exercise,
      muscleGroup,
      sets,
      reps,
      note: stretches,
      stretches,
    });

    setCustomExercises(updated);
    clearForm();
    setEditingCustomId(null);
  }

  function clearForm() {
    setEditingId(null);
    setEditingCustomId(null);
    setExercise("");
    setSets("");
    setReps("");
    setStretches("");
    setMuscleGroup("chest");
  }

  function clearWarmupForm() {
    setEditingWarmupId(null);
    setWarmupName("");
    setWarmupMode("reps");
    setWarmupSets("");
    setWarmupReps("");
    setWarmupTime("");
    setWarmupNote("");
  }

  function startCustomEdit(lift) {
    setEditingCustomId(lift.id);
    setBuilderPanel("editor");
    setExercise(lift.exercise || "");
    setSets(String(lift.sets || ""));
    setReps(String(lift.reps || ""));
    setStretches(lift.note || lift.stretches || "");
    setMuscleGroup(lift.muscleGroup || "other");
  }

  function startEdit(lift) {
    setEditingId(lift.id);
    setBuilderPanel("editor");
    setExercise(lift.exercise || "");
    setSets(String(lift.sets || ""));
    setReps(String(lift.reps || ""));
    setStretches(lift.note || lift.stretches || "");
    setMuscleGroup(lift.muscleGroup || "other");
  }

  function saveWarmupMovement() {
    if (!warmupName.trim()) return;

    const updated = { ...plan };
    const meta = updated.__meta?.[selectedDay] || {};
    const warmup = Array.isArray(meta.warmup) ? meta.warmup : [];
    const movement = {
      id: editingWarmupId || crypto.randomUUID(),
      name: warmupName.trim(),
      mode: warmupMode,
      sets: warmupSets,
      reps: warmupReps,
      time: warmupTime,
      note: warmupNote,
    };

    updated.__meta = {
      ...(updated.__meta || {}),
      [selectedDay]: {
        ...meta,
        warmup: editingWarmupId
          ? warmup.map((item) => (item.id === editingWarmupId ? movement : item))
          : [...warmup, movement],
      },
    };

    setPlan(updated);
    savePlan(updated);
    clearWarmupForm();
  }

  function startWarmupEdit(movement) {
    setBuilderPanel("warmup");
    setEditingWarmupId(movement.id);
    setWarmupName(movement.name || "");
    setWarmupMode(movement.mode || "reps");
    setWarmupSets(String(movement.sets || ""));
    setWarmupReps(String(movement.reps || ""));
    setWarmupTime(String(movement.time || ""));
    setWarmupNote(movement.note || "");
  }

  function deleteWarmupMovement(id) {
    const updated = { ...plan };
    const meta = updated.__meta?.[selectedDay] || {};
    updated.__meta = {
      ...(updated.__meta || {}),
      [selectedDay]: {
        ...meta,
        warmup: (meta.warmup || []).filter((item) => item.id !== id),
      },
    };
    setPlan(updated);
    savePlan(updated);
  }

  function handleDelete(id) {
    const updated = { ...plan };
    const dayPlan = Array.isArray(updated[selectedDay]) ? updated[selectedDay] : [];
    updated[selectedDay] = dayPlan.filter((lift) => lift.id !== id);

    setPlan(updated);
    savePlan(updated);
  }

  function applyTemplateNow(templateId) {
    const templatePlan = buildPlanFromTemplate(templateId);
    setPlan(templatePlan);
    savePlan(templatePlan);
    setSelectedDay("Monday");
    setDayName(templatePlan.__meta?.Monday?.name || "");
    clearForm();
  }

  function requestApplyTemplate(templateId) {
    setConfirmAction({
      title: "Replace Current Split?",
      message: "Your current workout split will be replaced with this template. This may remove your existing split configuration.",
      confirmLabel: "Replace Split",
      danger: true,
      onConfirm: () => applyTemplateNow(templateId),
    });
  }

  function applyDayTemplateNow(templateId, recoveryTemplate = false) {
    const template = buildDayFromTemplate(templateId, recoveryTemplate);
    if (!template) return;

    const updated = {
      ...plan,
      __meta: {
        ...(plan.__meta || {}),
        [selectedDay]: template.meta,
      },
      [selectedDay]: template.lifts,
    };

    setPlan(updated);
    savePlan(updated);
    setDayName(template.meta.name || "");
    clearForm();
  }

  function requestApplyDayTemplate(templateId, recoveryTemplate = false) {
    const hasExisting = todayPlan.length > 0 || plan.__meta?.[selectedDay]?.recovery;

    if (!hasExisting) {
      applyDayTemplateNow(templateId, recoveryTemplate);
      return;
    }

    setConfirmAction({
      title: "Replace This Day?",
      message: `${selectedDay} already has saved work. Applying this template will replace the exercises or recovery details for this day.`,
      confirmLabel: "Replace Day",
      danger: true,
      onConfirm: () => applyDayTemplateNow(templateId, recoveryTemplate),
    });
  }

  function confirmDeleteExercise(id) {
    setConfirmAction({
      title: "Remove Exercise?",
      message: "This exercise will be removed from the selected workout day.",
      confirmLabel: "Remove",
      danger: true,
      onConfirm: () => handleDelete(id),
    });
  }

  function confirmDeleteCustom(id) {
    setConfirmAction({
      title: "Delete Custom Exercise?",
      message: "This saved custom exercise will be removed from your exercise library.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: () => setCustomExercises(deleteCustomExercise(id)),
    });
  }

  const todayPlan = Array.isArray(plan[selectedDay]) ? plan[selectedDay] : [];
  const selectedMeta = plan.__meta?.[selectedDay] || {};
  const recovery = selectedMeta.recovery;
  const selectedWarmup = Array.isArray(selectedMeta.warmup) ? selectedMeta.warmup : [];

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Program Builder</p>
          <h1 style={title}>Your Split</h1>
        </div>
        <span style={count}>{todayPlan.length} lifts</span>
      </header>

      <div style={dayRow}>
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => selectDay(day)}
            style={{
              ...dayBtn,
              borderColor: tint(getDayAccent(day, plan), selectedDay === day ? 0.78 : 0.28),
              color: selectedDay === day ? colors.inverse : getDayAccent(day, plan),
              background: selectedDay === day ? getDayAccent(day, plan) : tint(getDayAccent(day, plan), 0.08),
            }}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <section style={card}>
        <label style={label}>Day Focus</label>
        <input
          placeholder="Upper A, Push, Legs, Zone 2..."
          value={dayName}
          onChange={(event) => saveDayName(event.target.value)}
        />
      </section>

      <section style={compactPanel}>
        <div style={currentHeader}>
          <div>
            <p style={label}>Warmup Routine</p>
            <h2 style={cardTitle}>{selectedWarmup.length} movements</h2>
          </div>
          <button type="button" onClick={() => setBuilderPanel("warmup")} style={editBtn}>
            Add Warmup
          </button>
        </div>
        {selectedWarmup.length === 0 ? (
          <p style={mutedLine}>No warmup set for this day.</p>
        ) : (
          <div style={libraryList}>
            {selectedWarmup.map((movement) => (
              <div key={movement.id} style={libraryItem}>
                <div>
                  <strong style={{ color: ACCENT }}>{movement.name}</strong>
                  <p style={liftMeta}>{formatWarmupMovement(movement)}</p>
                  {movement.note && <p style={stretchPreview}>{movement.note}</p>}
                </div>
                <div style={actions}>
                  <button type="button" onClick={() => startWarmupEdit(movement)} style={editBtn}>
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteWarmupMovement(movement.id)} style={removeBtn}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={list}>
        <div style={currentHeader}>
          <div>
            <p style={label}>Current Day</p>
            <h2 style={cardTitle}>{selectedMeta.name || selectedDay}</h2>
          </div>
          <button type="button" onClick={() => setBuilderPanel("editor")} style={editBtn}>
            Add Lift
          </button>
        </div>

        {recovery ? (
          <article style={{ ...liftCard, borderColor: "rgba(50, 223, 118, 0.42)", background: "rgba(50, 223, 118, 0.08)" }}>
            <div>
              <h3 style={{ ...liftName, color: "#32df76" }}>{selectedMeta.name || "Recovery"}</h3>
              <p style={liftMeta}>{recovery.activity} · {recovery.duration} · {recovery.intensity}</p>
              {recovery.notes && <p style={stretchPreview}>{recovery.notes}</p>}
            </div>
          </article>
        ) : todayPlan.length === 0 ? (
          <div style={empty}>No exercises for {selectedDay} yet.</div>
        ) : (
          todayPlan.map((lift) => {
            const group = getMuscleGroup(lift.muscleGroup);

            return (
            <article
              key={lift.id}
              style={liftCard}
            >
              <div>
                <h3 style={liftName}>{lift.exercise}</h3>
                <p style={liftMeta}>
                  {group.label} · {lift.sets} sets x {lift.reps} reps
                </p>
                {(lift.note || lift.stretches) && <p style={stretchPreview}>{lift.note || lift.stretches}</p>}
              </div>

              <div style={actions}>
                <button type="button" onClick={() => startEdit(lift)} style={editBtn}>
                  Edit
                </button>
                <button type="button" onClick={() => confirmDeleteExercise(lift.id)} style={removeBtn}>
                  Remove
                </button>
              </div>
            </article>
            );
          })
        )}
      </section>

      <section style={toolsSection}>
        <button
          type="button"
          onClick={() => setBuilderPanel(builderPanel === "templates" ? "" : "templates")}
          style={{ ...toolTab, ...(builderPanel === "templates" ? activeToolTab : {}) }}
        >
          Split Templates
        </button>
        <button
          type="button"
          onClick={() => setBuilderPanel(builderPanel === "days" ? "" : "days")}
          style={{ ...toolTab, ...(builderPanel === "days" ? activeToolTab : {}) }}
        >
          Day Templates
        </button>
        <button
          type="button"
          onClick={() => setBuilderPanel(builderPanel === "library" ? "" : "library")}
          style={{ ...toolTab, ...(builderPanel === "library" ? activeToolTab : {}) }}
        >
          Exercise Library
        </button>
        <button
          type="button"
          onClick={() => setBuilderPanel(builderPanel === "warmup" ? "" : "warmup")}
          style={{ ...toolTab, ...(builderPanel === "warmup" ? activeToolTab : {}) }}
        >
          Warmup
        </button>
        <button
          type="button"
          onClick={() => setBuilderPanel(builderPanel === "editor" ? "" : "editor")}
          style={{ ...toolTab, ...(builderPanel === "editor" ? activeToolTab : {}) }}
        >
          Create / Edit
        </button>
      </section>

      {builderPanel === "templates" && (
        <section style={templateSection}>
          <div style={templateHeader}>
            <div>
              <p style={label}>Templates</p>
              <h2 style={cardTitle}>Start Faster</h2>
            </div>
          </div>
          <div style={templateGrid}>
            {PROGRAM_TEMPLATES.map((template) => (
              <article key={template.id} style={templateCard}>
                <h3 style={templateName}>{template.name}</h3>
                <p style={templateSummary}>{template.summary}</p>
                <button type="button" onClick={() => requestApplyTemplate(template.id)} style={templateButton}>
                  Use Template
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {builderPanel === "days" && (
        <section style={templateSection}>
          <p style={label}>Workout Day Templates</p>
          <div style={chipGrid}>
            {DAY_TEMPLATES.map((template) => (
              <button key={template.id} type="button" onClick={() => requestApplyDayTemplate(template.id)} style={smallTemplateBtn}>
                {template.name}
              </button>
            ))}
          </div>
          <p style={{ ...label, marginTop: 14 }}>Recovery Templates</p>
          <div style={chipGrid}>
            {RECOVERY_TEMPLATES.map((template) => (
              <button key={template.id} type="button" onClick={() => requestApplyDayTemplate(template.id, true)} style={recoveryTemplateBtn}>
                {template.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {builderPanel === "editor" && (
        <section style={card}>
          <h2 style={cardTitle}>{editingId ? "Edit Day Exercise" : editingCustomId ? "Edit Custom Exercise" : "Create Custom Exercise"}</h2>
          <input
            placeholder="Exercise"
            value={exercise}
            onChange={(event) => setExercise(event.target.value)}
          />

          <div className="field-row" style={fieldRow}>
            <input
              placeholder="Sets, e.g. 3"
              inputMode="numeric"
              value={sets}
              onChange={(event) => setSets(event.target.value)}
            />
            <input
              placeholder="Reps or range, e.g. 8-12"
              inputMode="numeric"
              value={reps}
              onChange={(event) => setReps(event.target.value)}
            />
          </div>

          <label style={label}>Muscle Group</label>
          <select value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}>
            {MUSCLE_GROUPS.map((group) => (
              <option key={group.id} value={group.id}>
                {group.label}
              </option>
            ))}
          </select>

          <label style={label}>Lift Note</label>
          <textarea
            placeholder="Cue, setup note, tempo, injury reminder..."
            value={stretches}
            onChange={(event) => setStretches(event.target.value)}
            style={textarea}
          />

          <button type="button" className="primary" onClick={handleSaveExercise} style={fullButton}>
            {editingId ? "Save Exercise" : "Add Exercise"}
          </button>
          {!editingId && (
            <button type="button" onClick={saveCustomExercise} style={templateButton}>
              {editingCustomId ? "Save Custom Exercise" : "Save to Custom Exercises"}
            </button>
          )}
          {(editingId || editingCustomId) && (
            <button type="button" onClick={clearForm} style={cancelBtn}>
              Cancel Edit
            </button>
          )}
        </section>
      )}

      {builderPanel === "warmup" && (
        <section style={card}>
          <h2 style={cardTitle}>{editingWarmupId ? "Edit Warmup Movement" : "Add Warmup Movement"}</h2>
          <input
            placeholder="Movement, e.g. Band pull-aparts"
            value={warmupName}
            onChange={(event) => setWarmupName(event.target.value)}
          />

          <label style={label}>Tracking Type</label>
          <select value={warmupMode} onChange={(event) => setWarmupMode(event.target.value)}>
            <option value="reps">Sets / reps</option>
            <option value="time">Time</option>
          </select>

          {warmupMode === "reps" ? (
            <div className="field-row" style={fieldRow}>
              <input
                placeholder="Sets"
                inputMode="numeric"
                value={warmupSets}
                onChange={(event) => setWarmupSets(event.target.value)}
              />
              <input
                placeholder="Reps"
                inputMode="numeric"
                value={warmupReps}
                onChange={(event) => setWarmupReps(event.target.value)}
              />
            </div>
          ) : (
            <input
              placeholder="Time, e.g. 5 min or 30 sec"
              value={warmupTime}
              onChange={(event) => setWarmupTime(event.target.value)}
            />
          )}

          <textarea
            placeholder="Optional note..."
            value={warmupNote}
            onChange={(event) => setWarmupNote(event.target.value)}
            style={textarea}
          />

          <button type="button" className="primary" onClick={saveWarmupMovement} style={fullButton}>
            {editingWarmupId ? "Save Warmup" : "Add Warmup"}
          </button>
          {editingWarmupId && (
            <button type="button" onClick={clearWarmupForm} style={cancelBtn}>
              Cancel Edit
            </button>
          )}
        </section>
      )}

      {builderPanel === "library" && (
        <>
          <section style={templateSection}>
            <p style={label}>Default Exercises</p>
            <div style={libraryList}>
              {DEFAULT_EXERCISES.map((lift) => {
                const group = getMuscleGroup(lift.muscleGroup);
                return (
                  <div key={`${lift.exercise}-${lift.muscleGroup}`} style={libraryItem}>
                    <div>
                      <strong style={libraryLiftName}>{lift.exercise}</strong>
                      <p style={liftMeta}>{group.label} · {lift.sets} sets x {lift.reps} reps</p>
                    </div>
                    <button type="button" onClick={() => addExerciseToDay(lift)} style={editBtn}>
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section style={templateSection}>
            <p style={label}>Custom Exercises</p>
            {customExercises.length === 0 ? (
              <div style={empty}>No custom exercises saved yet.</div>
            ) : (
              <div style={libraryList}>
                {customExercises.map((lift) => {
                  const group = getMuscleGroup(lift.muscleGroup);
                  return (
                    <div key={lift.id} style={libraryItem}>
                      <div>
                        <strong style={libraryLiftName}>{lift.exercise}</strong>
                        <p style={liftMeta}>{group.label} · {lift.sets} sets x {lift.reps} reps</p>
                      </div>
                      <div style={actions}>
                        <button type="button" onClick={() => addExerciseToDay(lift)} style={editBtn}>
                          Add
                        </button>
                        <button type="button" onClick={() => startCustomEdit(lift)} style={editBtn}>
                          Edit
                        </button>
                        <button type="button" onClick={() => confirmDeleteCustom(lift.id)} style={removeBtn}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel}
        danger={confirmAction?.danger}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          confirmAction?.onConfirm();
          setConfirmAction(null);
        }}
      />
    </div>
  );
}

function getDayAccent(day, plan) {
  return plan.__meta?.[day]?.recovery ? dayColors.recovery : dayColors[day] || colors.brand;
}

function formatWarmupMovement(movement) {
  if (movement.mode === "time") return movement.time || "Timed";
  const sets = movement.sets || "--";
  const reps = movement.reps || "--";
  return `${sets} sets x ${reps} reps`;
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
  color: ACCENT,
  fontSize: 14,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 34,
  lineHeight: 1,
};

const count = {
  border: "1px solid rgba(50, 207, 255, 0.35)",
  borderRadius: 999,
  padding: "8px 12px",
  color: ACCENT,
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

const card = {
  border: "1px solid #242424",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
  marginBottom: 14,
  display: "grid",
  gap: 12,
};

const compactPanel = {
  border: "1px solid #242424",
  borderRadius: 12,
  background: "#101010",
  padding: 12,
  marginBottom: 14,
  display: "grid",
  gap: 10,
};

const templateSection = {
  border: "1px solid #242424",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
  marginBottom: 14,
};

const templateHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const templateGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const chipGrid = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const smallTemplateBtn = {
  color: "#32cfff",
  borderColor: "rgba(50, 207, 255, 0.35)",
  background: "rgba(50, 207, 255, 0.08)",
};

const recoveryTemplateBtn = {
  color: "#32df76",
  borderColor: "rgba(50, 223, 118, 0.35)",
  background: "rgba(50, 223, 118, 0.08)",
};

const templateCard = {
  border: "1px solid #242424",
  borderRadius: 14,
  background: "#0b0b0b",
  padding: 12,
};

const templateName = {
  margin: 0,
  color: "#32cfff",
  fontSize: 18,
};

const templateSummary = {
  margin: "8px 0 12px",
  color: "#777",
  lineHeight: 1.35,
  fontSize: 13,
};

const templateButton = {
  width: "100%",
  color: "#e4ff2f",
  borderColor: "rgba(228, 255, 47, 0.4)",
  background: "rgba(228, 255, 47, 0.08)",
};

const label = {
  color: "#777",
  fontWeight: 850,
  textTransform: "uppercase",
  fontSize: 13,
};

const cardTitle = {
  margin: 0,
  fontSize: 22,
};

const fieldRow = {
  gap: 10,
};

const mutedLine = {
  margin: 0,
  color: "#666",
  fontWeight: 750,
};

const textarea = {
  width: "100%",
  minHeight: 82,
  resize: "vertical",
  borderRadius: 10,
  border: "1px solid #2b2b2b",
  background: "#0b0b0b",
  color: "#f7f7f2",
  padding: 10,
  font: "inherit",
  fontWeight: 700,
};

const fullButton = {
  width: "100%",
};

const cancelBtn = {
  color: "#aaa",
  borderColor: "#333",
  background: "#0b0b0b",
};

const list = {
  display: "grid",
  gap: 8,
};

const currentHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginTop: 2,
};

const toolsSection = {
  border: "1px solid #242424",
  borderRadius: 16,
  background: "#101010",
  padding: 10,
  margin: "14px 0",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 8,
};

const toolTab = {
  width: "100%",
  minHeight: 42,
  padding: "9px 10px",
  borderRadius: 12,
  color: "#777",
  background: "#0b0b0b",
  borderColor: "#242424",
};

const activeToolTab = {
  color: "#050505",
  background: "#f7f7f2",
  borderColor: "#f7f7f2",
};

const libraryList = {
  display: "grid",
  gap: 8,
};

const libraryItem = {
  border: "1px solid #202020",
  borderRadius: 12,
  background: "#0b0b0b",
  padding: 12,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const empty = {
  border: "1px solid #222",
  borderRadius: 16,
  background: "#0f0f0f",
  padding: 22,
  color: "#555",
  textAlign: "center",
  fontWeight: 850,
};

const liftCard = {
  border: "1px solid #242424",
  borderRadius: 10,
  background: "#0f0f0f",
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const actions = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const editBtn = {
  color: ACCENT,
  borderColor: "rgba(50, 207, 255, 0.45)",
  background: "rgba(50, 207, 255, 0.12)",
  padding: "7px 10px",
  fontSize: 12,
};

const liftName = {
  margin: 0,
  color: colors.text,
  fontSize: 16,
};

const libraryLiftName = {
  color: colors.textSoft,
};

const liftMeta = {
  margin: "4px 0 0",
  color: "#777",
  fontSize: 12,
  fontWeight: 750,
};

const stretchPreview = {
  margin: "5px 0 0",
  color: "#999",
  fontSize: 12,
  lineHeight: 1.35,
};

const removeBtn = {
  color: "#ff6b2c",
  borderColor: "rgba(255, 107, 44, 0.45)",
  background: "rgba(255, 107, 44, 0.12)",
  padding: "7px 10px",
  fontSize: 12,
};
