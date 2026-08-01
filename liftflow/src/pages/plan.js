import { useEffect, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { deleteCustomExercise, getCustomExercises, upsertCustomExercise } from "../lib/customExercises";
import { getMuscleGroup, MUSCLE_GROUPS, tint } from "../lib/muscleGroups";
import { getLoadProfile, LOAD_TYPES } from "../lib/loadProfiles";
import { deleteSavedSplit, getPlan, getSavedSplits, saveCurrentSplit, savePlan } from "../lib/plan";
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
  const [targetType, setTargetType] = useState("reps");
  const [duration, setDuration] = useState("");
  const [stretches, setStretches] = useState("");
  const [loadType, setLoadType] = useState("free");
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [templatePreview, setTemplatePreview] = useState(null);
  const [savedSplits, setSavedSplits] = useState([]);
  const [saveSplitOpen, setSaveSplitOpen] = useState(false);
  const [saveSplitName, setSaveSplitName] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedPlan = getPlan();
      setPlan(savedPlan);
      setDayName(savedPlan.__meta?.Monday?.name || "");
      setCustomExercises(getCustomExercises());
      setSavedSplits(getSavedSplits());
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
    const targetValue = targetType === "time" ? duration : reps;
    if (!exercise || !sets || !targetValue) return;

    const updated = { ...plan };
    const dayPlan = Array.isArray(updated[selectedDay]) ? updated[selectedDay] : [];
    const loadProfile = getLoadProfile({ exercise, loadType });

    if (editingId) {
      updated[selectedDay] = dayPlan.map((lift) =>
        lift.id === editingId
          ? {
              ...lift,
              exercise,
              muscleGroup,
              loadType: loadProfile.type,
              minimumLoad: loadProfile.minimumLoad,
              sets,
              reps: targetValue,
              targetType,
              duration: targetType === "time" ? targetValue : "",
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
          loadType: loadProfile.type,
          minimumLoad: loadProfile.minimumLoad,
          sets,
          reps: targetValue,
          targetType,
          duration: targetType === "time" ? targetValue : "",
          note: stretches,
          stretches,
        },
      ];
    }

    setPlan(updated);
    savePlan(updated);
    clearForm();
    setEditorOpen(false);
  }

  function addExerciseToDay(lift) {
    const updated = { ...plan };
    const dayPlan = Array.isArray(updated[selectedDay]) ? updated[selectedDay] : [];
    const loadProfile = getLoadProfile(lift);
    updated[selectedDay] = [
      ...dayPlan,
      {
        id: crypto.randomUUID(),
        exercise: lift.exercise,
        muscleGroup: lift.muscleGroup || "other",
        loadType: loadProfile.type,
        minimumLoad: loadProfile.minimumLoad,
        sets: lift.sets || "3",
        reps: lift.reps || "8-12",
        targetType: lift.targetType === "time" ? "time" : "reps",
        duration: lift.duration || (lift.targetType === "time" ? lift.reps : ""),
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
      loadType,
      sets,
      reps: targetType === "time" ? duration : reps,
      targetType,
      duration: targetType === "time" ? duration : "",
      note: stretches,
      stretches,
    });

    setCustomExercises(updated);
    clearForm();
    setEditorOpen(false);
    setEditingCustomId(null);
  }

  function clearForm() {
    setEditingId(null);
    setEditingCustomId(null);
    setEditorOpen(false);
    setExercise("");
    setSets("");
    setReps("");
    setTargetType("reps");
    setDuration("");
    setStretches("");
    setLoadType("free");
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
    setEditorOpen(true);
    setExercise(lift.exercise || "");
    setSets(String(lift.sets || ""));
    setTargetType(lift.targetType === "time" ? "time" : "reps");
    setReps(lift.targetType === "time" ? "" : String(lift.reps || ""));
    setDuration(lift.targetType === "time" ? String(lift.duration || lift.reps || "") : "");
    setStretches(lift.note || lift.stretches || "");
    setLoadType(getLoadProfile(lift).type);
    setMuscleGroup(lift.muscleGroup || "other");
  }

  function startEdit(lift) {
    setEditingId(lift.id);
    setEditorOpen(true);
    setExercise(lift.exercise || "");
    setSets(String(lift.sets || ""));
    setTargetType(lift.targetType === "time" ? "time" : "reps");
    setReps(lift.targetType === "time" ? "" : String(lift.reps || ""));
    setDuration(lift.targetType === "time" ? String(lift.duration || lift.reps || "") : "");
    setStretches(lift.note || lift.stretches || "");
    setLoadType(getLoadProfile(lift).type);
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
    setTemplatePreview(null);
  }

  function previewSplitTemplate(template) {
    setTemplatePreview({ kind: "split", template });
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
    setTemplatePreview(null);
  }

  function previewDayTemplate(template, recoveryTemplate = false) {
    setTemplatePreview({ kind: "day", template, recoveryTemplate });
  }

  function applyTemplateDayToSelected(dayName, config) {
    const updated = {
      ...plan,
      __meta: {
        ...(plan.__meta || {}),
        [selectedDay]: {
          name: config.name || dayName,
          type: config.type || "training",
          recovery: config.recovery || null,
          warmup: (config.warmup || []).map((item) => ({ ...item, id: crypto.randomUUID() })),
          emphasis: config.emphasis || "",
          actionCards: config.actionCards || [],
        },
      },
      [selectedDay]: (config.lifts || []).map((lift) => ({ ...lift, id: crypto.randomUUID() })),
    };
    setPlan(updated);
    savePlan(updated);
    setDayName(updated.__meta?.[selectedDay]?.name || "");
    clearForm();
    setTemplatePreview(null);
  }

  function saveCurrentSplitSnapshot() {
    setSaveSplitName(plan.__meta?.Monday?.name ? `${plan.__meta.Monday.name} Split` : "My Split");
    setSaveSplitOpen(true);
  }

  function confirmSaveCurrentSplitSnapshot() {
    setSavedSplits(saveCurrentSplit(plan, saveSplitName));
    setSaveSplitName("");
    setSaveSplitOpen(false);
  }

  function saveCurrentThenApply(templateId) {
    setSavedSplits(saveCurrentSplit(plan, "Before Template Swap"));
    applyTemplateNow(templateId);
  }

  function restoreSavedSplit(split) {
    if (!split?.plan) return;
    setPlan(split.plan);
    savePlan(split.plan);
    setSelectedDay("Monday");
    setDayName(split.plan.__meta?.Monday?.name || "");
    clearForm();
  }

  function removeSavedSplit(id) {
    setSavedSplits(deleteSavedSplit(id));
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
            <p style={label}>Warmup</p>
            <h2 style={compactTitle}>{selectedWarmup.length ? `${selectedWarmup.length} movements` : "Not set"}</h2>
          </div>
          <button type="button" onClick={() => setBuilderPanel("warmup")} style={editBtn}>
            Add
          </button>
        </div>
        {selectedWarmup.length === 0 ? (
          <p style={mutedLine}>No warmup set for this day.</p>
        ) : (
          <div style={warmupList}>
            {selectedWarmup.map((movement) => (
              <div key={movement.id} style={warmupItem}>
                <div>
                  <strong style={{ color: ACCENT }}>{movement.name}</strong>
                  <p style={liftMeta}>{formatWarmupMovement(movement)}</p>
                </div>
                <div style={warmupActions}>
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
          <button
            type="button"
            onClick={() => {
              clearForm();
              setEditorOpen(true);
            }}
            style={editBtn}
          >
            Add Lift
          </button>
        </div>

        {recovery ? (
          <article style={{ ...liftCard, borderColor: tint(dayColors.recovery, 0.36), background: colors.surface }}>
            <div>
              <h3 style={{ ...liftName, color: dayColors.recovery }}>{selectedMeta.name || "Recovery"}</h3>
              <p style={liftMeta}>{recovery.activity} · {recovery.duration} · {recovery.intensity}</p>
              {recovery.notes && <p style={stretchPreview}>{recovery.notes}</p>}
            </div>
          </article>
        ) : todayPlan.length === 0 ? (
          <div style={empty}>No exercises for {selectedDay} yet.</div>
        ) : (
          todayPlan.map((lift) => {
            const group = getMuscleGroup(lift.muscleGroup);
            const profile = getLoadProfile(lift);

            return (
            <article
              key={lift.id}
              style={liftCard}
            >
              <div>
                <h3 style={liftName}>{lift.exercise}</h3>
                <p style={liftMeta}>
                  {group.label} · {formatLoadType(profile.type)} · {formatExerciseTarget(lift)}
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
          onClick={() => {
            clearForm();
            setEditorOpen(true);
          }}
          style={toolTab}
        >
          Create / Edit
        </button>
        <button
          type="button"
          onClick={() => setBuilderPanel(builderPanel === "saved" ? "" : "saved")}
          style={{ ...toolTab, ...(builderPanel === "saved" ? activeToolTab : {}) }}
        >
          Saved Splits
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
                <button type="button" onClick={() => previewSplitTemplate(template)} style={templateButton}>
                  Preview Split
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
              <button key={template.id} type="button" onClick={() => previewDayTemplate(template)} style={smallTemplateBtn}>
                {template.name}
              </button>
            ))}
          </div>
          <p style={{ ...label, marginTop: 14 }}>Recovery Templates</p>
          <div style={chipGrid}>
            {RECOVERY_TEMPLATES.map((template) => (
              <button key={template.id} type="button" onClick={() => previewDayTemplate(template, true)} style={recoveryTemplateBtn}>
                {template.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {builderPanel === "saved" && (
        <section style={templateSection}>
          <div style={templateHeader}>
            <div>
              <p style={label}>Saved Splits</p>
              <h2 style={cardTitle}>Fallback Plans</h2>
            </div>
            <button type="button" onClick={saveCurrentSplitSnapshot} style={editBtn}>
              Save Current
            </button>
          </div>
          {savedSplits.length === 0 ? (
            <div style={empty}>No saved splits yet.</div>
          ) : (
            <div style={libraryList}>
              {savedSplits.map((split) => (
                <div key={split.id} style={libraryItem}>
                  <div>
                    <strong style={libraryLiftName}>{split.name}</strong>
                    <p style={liftMeta}>{formatSavedSplitMeta(split.plan)}</p>
                  </div>
                  <div style={actions}>
                    <button type="button" onClick={() => restoreSavedSplit(split)} style={editBtn}>
                      Restore
                    </button>
                    <button type="button" onClick={() => removeSavedSplit(split.id)} style={removeBtn}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                const profile = getLoadProfile(lift);
                return (
                  <div key={`${lift.exercise}-${lift.muscleGroup}`} style={libraryItem}>
                    <div>
                      <strong style={libraryLiftName}>{lift.exercise}</strong>
                      <p style={liftMeta}>{group.label} · {formatLoadType(profile.type)} · {formatExerciseTarget(lift)}</p>
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
                  const profile = getLoadProfile(lift);
                  return (
                    <div key={lift.id} style={libraryItem}>
                      <div>
                        <strong style={libraryLiftName}>{lift.exercise}</strong>
                        <p style={liftMeta}>{group.label} · {formatLoadType(profile.type)} · {formatExerciseTarget(lift)}</p>
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

      {editorOpen && (
        <div style={modalOverlay} onClick={clearForm}>
          <section style={modalPanel} onClick={(event) => event.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={modalTitle}>{editingId ? "Edit Day Exercise" : editingCustomId ? "Edit Custom Exercise" : "Create Custom Exercise"}</h2>
              <button type="button" onClick={clearForm} style={closeBtn}>X</button>
            </div>
            <div style={modalBody}>
              {renderExerciseEditor({
                exercise,
                setExercise,
                sets,
                setSets,
                reps,
                setReps,
                targetType,
                setTargetType,
                duration,
                setDuration,
                muscleGroup,
                setMuscleGroup,
                loadType,
                setLoadType,
                stretches,
                setStretches,
                editingId,
                editingCustomId,
                handleSaveExercise,
                saveCustomExercise,
                clearForm,
              })}
            </div>
          </section>
        </div>
      )}

      {templatePreview && (
        <div style={modalOverlay} onClick={() => setTemplatePreview(null)}>
          <section style={previewPanel} onClick={(event) => event.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={modalTitle}>{templatePreview.template.name}</h2>
              <button type="button" onClick={() => setTemplatePreview(null)} style={closeBtn}>X</button>
            </div>
            <div style={modalBody}>
              {templatePreview.kind === "split" ? (
                <>
                  <p style={templateSummary}>{templatePreview.template.summary}</p>
                  <div style={previewList}>
                    {Object.entries(templatePreview.template.days).map(([dayName, config]) => (
                      <PreviewDay
                        key={dayName}
                        dayName={dayName}
                        config={config}
                        onUseDay={() => applyTemplateDayToSelected(dayName, config)}
                      />
                    ))}
                  </div>
                  <div style={modalActions}>
                    <button type="button" onClick={() => saveCurrentThenApply(templatePreview.template.id)} style={templateButton}>
                      Save Current + Apply
                    </button>
                    <button type="button" className="primary" onClick={() => applyTemplateNow(templatePreview.template.id)}>
                      Apply Full Split
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <PreviewDay dayName={selectedDay} config={templatePreview.template.config} />
                  <button
                    type="button"
                    className="primary"
                    onClick={() => applyDayTemplateNow(templatePreview.template.id, templatePreview.recoveryTemplate)}
                    style={fullButton}
                  >
                    Use For {selectedDay}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {saveSplitOpen && (
        <div style={modalOverlay} onClick={() => setSaveSplitOpen(false)}>
          <section style={modalPanel} onClick={(event) => event.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={modalTitle}>Save Split</h2>
              <button type="button" onClick={() => setSaveSplitOpen(false)} style={closeBtn}>X</button>
            </div>
            <div style={modalBody}>
              <input
                autoFocus
                placeholder="Split name"
                value={saveSplitName}
                onChange={(event) => setSaveSplitName(event.target.value)}
              />
              <button type="button" className="primary" onClick={confirmSaveCurrentSplitSnapshot} style={fullButton}>
                Save Split
              </button>
            </div>
          </section>
        </div>
      )}
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
  return `${sets}x${reps}`;
}

function formatLoadType(type) {
  return String(type || "free").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatExerciseTarget(lift) {
  const sets = lift?.sets || "--";
  if (lift?.targetType === "time") return `${sets} sets x ${lift.duration || lift.reps || "--"}`;
  return `${sets} sets x ${lift?.reps || "--"} reps`;
}

function formatSavedSplitMeta(plan) {
  const days = DAYS.filter((day) => Array.isArray(plan?.[day]) && plan[day].length > 0).length;
  const lifts = DAYS.reduce((sum, day) => sum + (Array.isArray(plan?.[day]) ? plan[day].length : 0), 0);
  return `${days} days · ${lifts} lifts`;
}

function renderExerciseEditor({
  exercise,
  setExercise,
  sets,
  setSets,
  reps,
  setReps,
  targetType,
  setTargetType,
  duration,
  setDuration,
  muscleGroup,
  setMuscleGroup,
  loadType,
  setLoadType,
  stretches,
  setStretches,
  editingId,
  editingCustomId,
  handleSaveExercise,
  saveCustomExercise,
  clearForm,
}) {
  return (
    <>
      <input
        placeholder="Exercise"
        value={exercise}
        onChange={(event) => setExercise(event.target.value)}
      />

      <label style={label}>Target Type</label>
      <select value={targetType} onChange={(event) => setTargetType(event.target.value)}>
        <option value="reps">Reps</option>
        <option value="time">Time</option>
      </select>

      <div className="field-row" style={fieldRow}>
        <input
          placeholder="Sets, e.g. 3"
          inputMode="numeric"
          value={sets}
          onChange={(event) => setSets(event.target.value)}
        />
        {targetType === "time" ? (
          <input
            placeholder="Time, e.g. 45-90 sec"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        ) : (
          <input
            placeholder="Reps or range, e.g. 8-12"
            inputMode="numeric"
            value={reps}
            onChange={(event) => setReps(event.target.value)}
          />
        )}
      </div>

      <label style={label}>Muscle Group</label>
      <select value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}>
        {MUSCLE_GROUPS.map((group) => (
          <option key={group.id} value={group.id}>
            {group.label}
          </option>
        ))}
      </select>

      <label style={label}>Load Type</label>
      <select value={loadType} onChange={(event) => setLoadType(event.target.value)}>
        {LOAD_TYPES.map((type) => (
          <option key={type} value={type}>
            {formatLoadType(type)}
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
    </>
  );
}

function PreviewDay({ dayName, config, onUseDay }) {
  const lifts = config?.lifts || [];
  return (
    <article style={previewDayCard}>
      <div style={previewDayHeader}>
        <div>
          <strong style={libraryLiftName}>{dayName} · {config?.name || "Training"}</strong>
          <p style={liftMeta}>
            {config?.recovery ? `${config.recovery.activity} · ${config.recovery.duration}` : `${lifts.length} lifts`}
          </p>
        </div>
        {onUseDay && (
          <button type="button" onClick={onUseDay} style={editBtn}>
            Use This Day
          </button>
        )}
      </div>
      {lifts.length > 0 && (
        <div style={previewLiftList}>
          {lifts.map((lift) => (
            <div key={`${dayName}-${lift.exercise}-${lift.sets}-${lift.reps}`} style={previewLiftRow}>
              <span>{lift.exercise}</span>
              <strong>{formatExerciseTarget(lift)}</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
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
  border: `1px solid ${colors.border}`,
  borderRadius: 999,
  padding: "8px 12px",
  color: ACCENT,
  background: colors.surfaceSoft,
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
  padding: 10,
  marginBottom: 12,
  display: "grid",
  gap: 8,
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
  color: colors.textSoft,
  borderColor: colors.border,
  background: colors.surfaceSoft,
};

const recoveryTemplateBtn = {
  color: dayColors.recovery,
  borderColor: tint(dayColors.recovery, 0.35),
  background: colors.surfaceSoft,
};

const templateCard = {
  border: "1px solid #242424",
  borderRadius: 14,
  background: "#0b0b0b",
  padding: 12,
};

const templateName = {
  margin: 0,
  color: colors.text,
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
  color: ACCENT,
  borderColor: tint(ACCENT, 0.35),
  background: colors.surfaceSoft,
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

const compactTitle = {
  margin: 0,
  fontSize: 18,
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

const warmupList = {
  display: "grid",
  gap: 6,
};

const warmupItem = {
  borderTop: "1px solid #202020",
  paddingTop: 7,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
};

const warmupActions = {
  display: "flex",
  gap: 5,
  flex: "0 0 auto",
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
  borderColor: tint(ACCENT, 0.38),
  background: colors.surfaceSoft,
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

const modalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 210,
  background: "rgba(0, 0, 0, 0.78)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
};

const modalPanel = {
  width: "min(460px, 100%)",
  maxHeight: "88vh",
  overflow: "auto",
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  background: colors.surface,
};

const previewPanel = {
  ...modalPanel,
  width: "min(620px, 100%)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: 16,
  borderBottom: "1px solid #222",
};

const modalTitle = {
  margin: 0,
  color: ACCENT,
  fontSize: 22,
};

const closeBtn = {
  width: 36,
  height: 36,
  padding: 0,
};

const modalBody = {
  display: "grid",
  gap: 12,
  padding: 16,
};

const modalActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const previewList = {
  display: "grid",
  gap: 10,
};

const previewDayCard = {
  border: "1px solid #242424",
  borderRadius: 12,
  background: "#0b0b0b",
  padding: 12,
};

const previewDayHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};

const previewLiftList = {
  display: "grid",
  gap: 6,
  marginTop: 10,
};

const previewLiftRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: "#bdbdb8",
  fontSize: 12,
  fontWeight: 750,
  borderTop: "1px solid #202020",
  paddingTop: 6,
};
