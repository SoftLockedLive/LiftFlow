import { useEffect, useState } from "react";
import ConfirmDialog, { useDialogFocus } from "../components/ConfirmDialog";
import { deleteCustomExercise, getCustomExercises, upsertCustomExercise } from "../lib/customExercises";
import { getMuscleGroup, MUSCLE_GROUPS } from "../lib/muscleGroups";
import { getLoadProfile, inferLoadType, LOAD_TYPES, normalizeLoadType } from "../lib/loadProfiles";
import { deleteSavedSplit, getPlan, getSavedSplits, saveCurrentSplit, savePlan } from "../lib/plan";
import { colors, radii, tint, type } from "../lib/theme";
import {
  DAY_TEMPLATES,
  DEFAULT_EXERCISES,
  PROGRAM_TEMPLATES,
  RECOVERY_TEMPLATES,
  buildDayFromTemplate,
  buildPlanFromTemplate,
} from "../lib/programTemplates";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
  const [loadType, setLoadType] = useState("");
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
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryGroup, setLibraryGroup] = useState("all");
  const editorDialog = useDialogFocus(editorOpen, clearForm);
  const previewDialog = useDialogFocus(Boolean(templatePreview), () => setTemplatePreview(null));
  const saveSplitDialog = useDialogFocus(saveSplitOpen, () => setSaveSplitOpen(false));

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
    clearWarmupForm();
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
              ...(exercise !== lift.exercise ? { baseExercise: exercise, variations: [], defaultVariation: "" } : {}),
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
          : lift,
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
      updated.__meta = {
        ...(updated.__meta || {}),
        [selectedDay]: { ...(updated.__meta?.[selectedDay] || {}), type: "training", recovery: null },
      };
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
    setLoadType("");
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
    // Custom exercises store "" for Auto; keep it so a rename re-infers the type.
    setLoadType(normalizeLoadType(lift.loadType));
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
    // Plan lifts store the resolved type; one that matches what Auto infers shows as Auto, so
    // renaming the lift re-infers it instead of keeping the old name's equipment.
    const storedType = normalizeLoadType(lift.loadType);
    setLoadType(storedType && storedType !== inferLoadType(lift.exercise || lift.baseExercise) ? storedType : "");
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

  function confirmRestoreSavedSplit(split) {
    setConfirmAction({
      title: "Restore this split?",
      message: `Your current program will be replaced by "${split.name || "this split"}". Save it first if you want to keep it.`,
      confirmLabel: "Restore",
      onConfirm: () => restoreSavedSplit(split),
    });
  }

  function restoreSavedSplit(split) {
    if (!split?.plan) return;
    setPlan(split.plan);
    savePlan(split.plan);
    setSelectedDay("Monday");
    setDayName(split.plan.__meta?.Monday?.name || "");
    clearForm();
  }

  function confirmDeleteSavedSplit(split) {
    setConfirmAction({
      title: "Delete saved split?",
      message: `"${split.name || "This split"}" will be removed from your saved splits.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: () => setSavedSplits(deleteSavedSplit(split.id)),
    });
  }

  function confirmDeleteExercise(id) {
    setConfirmAction({
      title: "Remove exercise?",
      message: "This exercise will be removed from the selected workout day.",
      confirmLabel: "Remove",
      danger: true,
      onConfirm: () => handleDelete(id),
    });
  }

  function confirmDeleteCustom(id) {
    setConfirmAction({
      title: "Delete custom exercise?",
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
  const defaultLibrary = filterExerciseLibrary(DEFAULT_EXERCISES, librarySearch, libraryGroup);
  const customLibrary = filterExerciseLibrary(customExercises, librarySearch, libraryGroup);

  const tools = [
    { id: "templates", label: "Split templates", hint: "Swap in a full weekly program" },
    { id: "days", label: "Day templates", hint: `Fill ${selectedDay} from a preset` },
    { id: "library", label: "Exercise library", hint: "Browse and add exercises" },
    { id: "warmup", label: "Warmup", hint: "Add warmup movements" },
    {
      id: "create",
      label: "Custom exercise",
      hint: "Create a reusable exercise",
      onClick: () => {
        clearForm();
        setEditorOpen(true);
      },
    },
    { id: "saved", label: "Saved splits", hint: "Save or restore your week" },
  ];

  return (
    <div style={wrap}>
      <header style={header}>
        <div style={{ display: "grid", gap: 6 }}>
          <p style={type.eyebrow}>Program</p>
          <h1 style={type.pageTitle}>Your training split</h1>
        </div>
        <span style={count}>
          {todayPlan.length} lift{todayPlan.length === 1 ? "" : "s"}
        </span>
      </header>

      <div style={dayRow} role="group" aria-label="Day">
        {DAYS.map((day) => {
          const selected = selectedDay === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => selectDay(day)}
              aria-pressed={selected}
              style={{ ...dayChip, ...(selected ? dayChipSelected : {}) }}
            >
              {day.slice(0, 3)}
              {plan.__meta?.[day]?.recovery && <span style={recoveryDot} aria-label="Recovery day" />}
            </button>
          );
        })}
      </div>

      <section style={card}>
        <div style={cardHeader}>
          <div style={{ minWidth: 0 }}>
            <h2 style={cardTitle}>{selectedMeta.name || selectedDay}</h2>
            <p style={cardMeta}>
              {selectedDay} · {recovery ? "Recovery" : `${todayPlan.length} lift${todayPlan.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearForm();
              setEditorOpen(true);
            }}
            style={smallBtn}
          >
            Add lift
          </button>
        </div>

        <label style={field}>
          <span style={fieldLabel}>Day focus</span>
          <input
            placeholder="Upper A, Push, Legs, Zone 2..."
            value={dayName}
            onChange={(event) => saveDayName(event.target.value)}
          />
        </label>

        {recovery ? (
          <div style={rowList}>
            <div style={{ ...row, borderTop: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={nameLine}>
                  <h3 style={rowName}>{selectedMeta.name || "Recovery"}</h3>
                  <span style={recoveryBadge}>Recovery</span>
                </div>
                <p style={rowMeta}>
                  {recovery.activity} · {recovery.duration} · {recovery.intensity}
                </p>
                {recovery.notes && <p style={noteText}>{recovery.notes}</p>}
              </div>
            </div>
          </div>
        ) : todayPlan.length === 0 ? (
          <div style={empty}>
            <span>No exercises for {selectedDay} yet.</span>
            <button
              type="button"
              onClick={() => {
                clearForm();
                setEditorOpen(true);
              }}
            >
              Add lift
            </button>
          </div>
        ) : (
          <div style={rowList}>
            {todayPlan.map((lift, index) => {
              const group = getMuscleGroup(lift.muscleGroup);
              const profile = getLoadProfile(lift);

              return (
                <article key={lift.id} style={{ ...row, ...(index === 0 ? { borderTop: 0 } : {}) }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={rowName}>{lift.exercise}</h3>
                    <p style={rowMeta}>
                      {group.label} · {formatLoadType(profile.type)} · {formatExerciseTarget(lift)}
                    </p>
                    {(lift.note || lift.stretches) && <p style={noteText}>{lift.note || lift.stretches}</p>}
                  </div>

                  <div style={actions}>
                    <button type="button" onClick={() => startEdit(lift)} style={smallBtn}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => confirmDeleteExercise(lift.id)}
                      style={smallBtn}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section style={card}>
        <div style={cardHeader}>
          <div style={{ minWidth: 0 }}>
            <h2 style={cardTitle}>Warmup</h2>
            <p style={cardMeta}>
              {selectedWarmup.length
                ? `${selectedWarmup.length} movement${selectedWarmup.length === 1 ? "" : "s"}`
                : "No warmup set for this day"}
            </p>
          </div>
          <button type="button" onClick={() => setBuilderPanel("warmup")} style={smallBtn}>
            Add
          </button>
        </div>
        {selectedWarmup.length > 0 && (
          <div style={rowList}>
            {selectedWarmup.map((movement, index) => (
              <div key={movement.id} style={{ ...row, ...(index === 0 ? { borderTop: 0 } : {}) }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={rowName}>{movement.name}</strong>
                  <p style={rowMeta}>{formatWarmupMovement(movement)}</p>
                </div>
                <div style={actions}>
                  <button type="button" onClick={() => startWarmupEdit(movement)} style={smallBtn}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => deleteWarmupMovement(movement.id)}
                    style={smallBtn}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={toolsCard} aria-label="Program tools">
        <h2 style={toolsTitle}>Tools</h2>
        <div style={toolsGrid}>
          {tools.map((tool) => {
            const active = builderPanel === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={tool.onClick || (() => setBuilderPanel(active ? "" : tool.id))}
                aria-expanded={tool.onClick ? undefined : active}
                style={{ ...toolRow, ...(active ? toolRowActive : {}) }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ ...toolLabel, color: active ? colors.brand : colors.text }}>{tool.label}</span>
                  <span style={toolHint}>{tool.hint}</span>
                </span>
                <Chevron direction={tool.onClick ? "right" : active ? "up" : "down"} />
              </button>
            );
          })}
        </div>
      </section>

      {builderPanel === "templates" && (
        <section style={card}>
          <h2 style={cardTitle}>Split templates</h2>
          <div style={templateGrid}>
            {PROGRAM_TEMPLATES.map((template) => (
              <article key={template.id} style={templateCard}>
                <div>
                  <h3 style={rowName}>{template.name}</h3>
                  <p style={rowMeta}>{template.summary}</p>
                </div>
                <button type="button" onClick={() => previewSplitTemplate(template)} style={smallBtn}>
                  Preview
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {builderPanel === "days" && (
        <section style={card}>
          <div style={{ display: "grid", gap: 8 }}>
            <h2 style={cardTitle}>Workout day templates</h2>
            <div style={chipGrid}>
              {DAY_TEMPLATES.map((template) => (
                <button key={template.id} type="button" onClick={() => previewDayTemplate(template)} style={chip}>
                  {template.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <h2 style={cardTitle}>Recovery templates</h2>
            <div style={chipGrid}>
              {RECOVERY_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => previewDayTemplate(template, true)}
                  style={recoveryChip}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {builderPanel === "saved" && (
        <section style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>Saved splits</h2>
            <button type="button" onClick={saveCurrentSplitSnapshot} style={smallBtn}>
              Save current
            </button>
          </div>
          {savedSplits.length === 0 ? (
            <div style={empty}>No saved splits yet.</div>
          ) : (
            <div style={rowList}>
              {savedSplits.map((split, index) => (
                <div key={split.id} style={{ ...row, ...(index === 0 ? { borderTop: 0 } : {}) }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={rowName}>{split.name}</strong>
                    <p style={rowMeta}>{formatSavedSplitMeta(split.plan)}</p>
                  </div>
                  <div style={actions}>
                    <button type="button" onClick={() => confirmRestoreSavedSplit(split)} style={smallBtn}>
                      Restore
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => confirmDeleteSavedSplit(split)}
                      style={smallBtn}
                    >
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
          <h2 style={cardTitle}>{editingWarmupId ? "Edit warmup movement" : "Add warmup movement"}</h2>
          <label style={field}>
            <span style={fieldLabel}>Movement</span>
            <input
              placeholder="e.g. Band pull-aparts"
              value={warmupName}
              onChange={(event) => setWarmupName(event.target.value)}
            />
          </label>

          <label style={field}>
            <span style={fieldLabel}>Tracking</span>
            <select value={warmupMode} onChange={(event) => setWarmupMode(event.target.value)}>
              <option value="reps">Sets / reps</option>
              <option value="time">Time</option>
            </select>
          </label>

          {warmupMode === "reps" ? (
            <div className="field-row" style={fieldRow}>
              <label style={field}>
                <span style={fieldLabel}>Sets</span>
                <input
                  placeholder="Sets"
                  inputMode="numeric"
                  value={warmupSets}
                  onChange={(event) => setWarmupSets(event.target.value)}
                />
              </label>
              <label style={field}>
                <span style={fieldLabel}>Reps</span>
                <input
                  placeholder="Reps"
                  inputMode="numeric"
                  value={warmupReps}
                  onChange={(event) => setWarmupReps(event.target.value)}
                />
              </label>
            </div>
          ) : (
            <label style={field}>
              <span style={fieldLabel}>Time</span>
              <input
                placeholder="e.g. 5 min or 30 sec"
                value={warmupTime}
                onChange={(event) => setWarmupTime(event.target.value)}
              />
            </label>
          )}

          <label style={field}>
            <span style={fieldLabel}>Note</span>
            <textarea
              placeholder="Optional note..."
              value={warmupNote}
              onChange={(event) => setWarmupNote(event.target.value)}
              style={textarea}
            />
          </label>

          <div style={formActions}>
            {editingWarmupId && (
              <button type="button" className="ghost" onClick={clearWarmupForm}>
                Cancel edit
              </button>
            )}
            <button type="button" className="primary" onClick={saveWarmupMovement} style={{ flex: 1 }}>
              {editingWarmupId ? "Save warmup" : "Add warmup"}
            </button>
          </div>
        </section>
      )}

      {builderPanel === "library" && (
        <section style={card}>
          <h2 style={cardTitle}>Exercise library</h2>
          <div style={libraryControls}>
            <input
              placeholder="Search exercises"
              aria-label="Search exercises"
              value={librarySearch}
              onChange={(event) => setLibrarySearch(event.target.value)}
            />
            <select
              aria-label="Muscle group"
              value={libraryGroup}
              onChange={(event) => setLibraryGroup(event.target.value)}
            >
              <option value="all">All groups</option>
              {MUSCLE_GROUPS.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>

          <div style={librarySection}>
            <p style={type.eyebrow}>Custom exercises</p>
            {customExercises.length === 0 ? (
              <div style={empty}>No custom exercises saved yet.</div>
            ) : customLibrary.length === 0 ? (
              <div style={empty}>No custom exercises match.</div>
            ) : (
              <div style={wellList}>
                {customLibrary.map((lift, index) => {
                  const group = getMuscleGroup(lift.muscleGroup);
                  const profile = getLoadProfile(lift);
                  return (
                    <div key={lift.id} style={{ ...wellRow, ...(index === 0 ? { borderTop: 0 } : {}) }}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={rowName}>{lift.exercise}</strong>
                        <p style={rowMeta}>
                          {group.label} · {formatLoadType(profile.type)} · {formatExerciseTarget(lift)}
                        </p>
                      </div>
                      <div style={actions}>
                        <button type="button" onClick={() => addExerciseToDay(lift)} style={smallBtn}>
                          Add
                        </button>
                        <button type="button" onClick={() => startCustomEdit(lift)} style={smallBtn}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => confirmDeleteCustom(lift.id)}
                          style={smallBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={librarySection}>
            <p style={type.eyebrow}>Default exercises</p>
            {defaultLibrary.length === 0 ? (
              <div style={empty}>No default exercises match.</div>
            ) : (
              <div style={wellList}>
                {defaultLibrary.map((lift, index) => {
                  const group = getMuscleGroup(lift.muscleGroup);
                  const profile = getLoadProfile(lift);
                  return (
                    <div
                      key={`${lift.exercise}-${lift.muscleGroup}`}
                      style={{ ...wellRow, ...(index === 0 ? { borderTop: 0 } : {}) }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong style={rowName}>{lift.exercise}</strong>
                        <p style={rowMeta}>
                          {group.label} · {formatLoadType(profile.type)} · {formatExerciseTarget(lift)}
                        </p>
                      </div>
                      <button type="button" onClick={() => addExerciseToDay(lift)} style={smallBtn}>
                        Add
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
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
          <section
            {...editorDialog}
            style={modalPanel}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exercise-editor-title"
          >
            <div style={modalHeader}>
              <h2 id="exercise-editor-title" style={modalTitle}>
                {editingId ? "Edit day exercise" : editingCustomId ? "Edit custom exercise" : "Create exercise"}
              </h2>
              <button type="button" className="ghost" onClick={clearForm} style={closeBtn} aria-label="Close">
                ✕
              </button>
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
          <section
            {...previewDialog}
            style={previewPanel}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-preview-title"
          >
            <div style={modalHeader}>
              <div style={{ minWidth: 0 }}>
                <h2 id="template-preview-title" style={modalTitle}>
                  {templatePreview.template.name}
                </h2>
                {templatePreview.kind === "split" && <p style={cardMeta}>{templatePreview.template.summary}</p>}
              </div>
              <button
                type="button"
                className="ghost"
                onClick={() => setTemplatePreview(null)}
                style={closeBtn}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div style={modalBody}>
              {templatePreview.kind === "split" ? (
                <>
                  <div style={previewList}>
                    {Object.entries(templatePreview.template.days).map(([dayName, config]) => (
                      <PreviewDay
                        key={dayName}
                        dayName={dayName}
                        config={config}
                        onUseDay={() => applyTemplateDayToSelected(dayName, config)}
                        useLabel={`Use for ${selectedDay.slice(0, 3)}`}
                      />
                    ))}
                  </div>
                  <div style={modalActions}>
                    <button type="button" onClick={() => saveCurrentThenApply(templatePreview.template.id)}>
                      Save current + apply
                    </button>
                    <button
                      type="button"
                      className="primary"
                      onClick={() => applyTemplateNow(templatePreview.template.id)}
                    >
                      Apply full split
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
                    Use for {selectedDay}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {saveSplitOpen && (
        <div style={modalOverlay} onClick={() => setSaveSplitOpen(false)}>
          <section
            {...saveSplitDialog}
            style={modalPanel}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-split-title"
          >
            <div style={modalHeader}>
              <h2 id="save-split-title" style={modalTitle}>
                Save split
              </h2>
              <button
                type="button"
                className="ghost"
                onClick={() => setSaveSplitOpen(false)}
                style={closeBtn}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div style={modalBody}>
              <label style={field}>
                <span style={fieldLabel}>Name</span>
                <input
                  autoFocus
                  placeholder="Split name"
                  value={saveSplitName}
                  onChange={(event) => setSaveSplitName(event.target.value)}
                />
              </label>
              <button type="button" className="primary" onClick={confirmSaveCurrentSplitSnapshot} style={fullButton}>
                Save split
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const CHEVRON_PATHS = {
  up: "m18 15-6-6-6 6",
  down: "m6 9 6 6 6-6",
  right: "m9 18 6-6-6-6",
};

function Chevron({ direction }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "0 0 auto", color: colors.muted }}
    >
      <path d={CHEVRON_PATHS[direction]} />
    </svg>
  );
}

function formatWarmupMovement(movement) {
  if (movement.mode === "time") return movement.time || "Timed";
  const sets = movement.sets || "--";
  const reps = movement.reps || "--";
  return `${sets} × ${reps}`;
}

function formatLoadType(type) {
  return String(type || "free").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatExerciseTarget(lift) {
  const sets = lift?.sets || "--";
  if (lift?.targetType === "time") return `${sets} × ${lift.duration || lift.reps || "--"}`;
  return `${sets} × ${lift?.reps || "--"}`;
}

function formatSavedSplitMeta(plan) {
  const days = DAYS.filter((day) => Array.isArray(plan?.[day]) && plan[day].length > 0).length;
  const lifts = DAYS.reduce((sum, day) => sum + (Array.isArray(plan?.[day]) ? plan[day].length : 0), 0);
  return `${days} days · ${lifts} lifts`;
}

function filterExerciseLibrary(lifts, search, group) {
  const query = search.trim().toLowerCase();
  return (Array.isArray(lifts) ? lifts : []).filter((lift) => {
    const matchesGroup = group === "all" || lift.muscleGroup === group;
    const matchesSearch =
      !query || `${lift.exercise} ${lift.note || ""} ${lift.stretches || ""}`.toLowerCase().includes(query);
    return matchesGroup && matchesSearch;
  });
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
      <label style={field}>
        <span style={fieldLabel}>Exercise</span>
        <input placeholder="e.g. Bench Press" value={exercise} onChange={(event) => setExercise(event.target.value)} />
      </label>

      <label style={field}>
        <span style={fieldLabel}>Target</span>
        <select value={targetType} onChange={(event) => setTargetType(event.target.value)}>
          <option value="reps">Reps</option>
          <option value="time">Time</option>
        </select>
      </label>

      <div className="field-row" style={fieldRow}>
        <label style={field}>
          <span style={fieldLabel}>Sets</span>
          <input
            placeholder="e.g. 3"
            inputMode="numeric"
            value={sets}
            onChange={(event) => setSets(event.target.value)}
          />
        </label>
        {targetType === "time" ? (
          <label style={field}>
            <span style={fieldLabel}>Time</span>
            <input
              placeholder="e.g. 45-90 sec"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </label>
        ) : (
          <label style={field}>
            <span style={fieldLabel}>Reps</span>
            <input
              placeholder="e.g. 8-12"
              inputMode="numeric"
              value={reps}
              onChange={(event) => setReps(event.target.value)}
            />
          </label>
        )}
      </div>

      <div className="field-row" style={fieldRow}>
        <label style={field}>
          <span style={fieldLabel}>Muscle group</span>
          <select value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}>
            {MUSCLE_GROUPS.map((group) => (
              <option key={group.id} value={group.id}>
                {group.label}
              </option>
            ))}
          </select>
        </label>

        <label style={field}>
          <span style={fieldLabel}>Load type</span>
          <select value={loadType} onChange={(event) => setLoadType(event.target.value)}>
            <option value="">Auto ({formatLoadType(getLoadProfile({ exercise }).type)})</option>
            {LOAD_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatLoadType(type)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label style={field}>
        <span style={fieldLabel}>Note</span>
        <textarea
          placeholder="Cue, setup note, tempo, injury reminder..."
          value={stretches}
          onChange={(event) => setStretches(event.target.value)}
          style={textarea}
        />
      </label>

      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        <button
          type="button"
          className="primary"
          onClick={handleSaveExercise}
          disabled={!exercise || !sets || !(targetType === "time" ? duration : reps)}
          style={fullButton}
        >
          {editingId ? "Save exercise" : "Add to day"}
        </button>
        {!editingId && (
          <button type="button" onClick={saveCustomExercise} style={fullButton}>
            {editingCustomId ? "Save custom exercise" : "Save to custom exercises"}
          </button>
        )}
        {(editingId || editingCustomId) && (
          <button type="button" className="ghost" onClick={clearForm} style={fullButton}>
            Cancel edit
          </button>
        )}
      </div>
    </>
  );
}

function PreviewDay({ dayName, config, onUseDay, useLabel = "Use this day" }) {
  const lifts = config?.lifts || [];
  return (
    <article style={previewDayCard}>
      <div style={previewDayHeader}>
        <div style={{ minWidth: 0 }}>
          <strong style={rowName}>{config?.name || "Training"}</strong>
          <p style={rowMeta}>
            {dayName} ·{" "}
            {config?.recovery ? `${config.recovery.activity} · ${config.recovery.duration}` : `${lifts.length} lifts`}
          </p>
        </div>
        {onUseDay && (
          <button type="button" onClick={onUseDay} style={smallBtn}>
            {useLabel}
          </button>
        )}
      </div>
      {lifts.length > 0 && (
        <div style={previewLiftList}>
          {lifts.map((lift) => (
            <div key={`${dayName}-${lift.exercise}-${lift.sets}-${lift.reps}`} style={previewLiftRow}>
              <span style={{ minWidth: 0 }}>{lift.exercise}</span>
              <span style={previewLiftTarget}>{formatExerciseTarget(lift)}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

const wrap = {
  display: "grid",
  gap: 16,
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 16,
  padding: "8px 0 4px",
};

const count = {
  ...type.meta,
  ...type.number,
  whiteSpace: "nowrap",
  paddingBottom: 2,
};

const dayRow = {
  display: "flex",
  overflowX: "auto",
  gap: 4,
  margin: "0 -16px",
  padding: "0 16px",
};

const dayChip = {
  position: "relative",
  flex: "1 0 auto",
  minWidth: 44,
  minHeight: 36,
  padding: "8px 9px",
  borderRadius: radii.pill,
  background: colors.surfaceRaised,
  color: colors.muted,
  borderColor: colors.border,
  fontSize: 13,
  fontWeight: 600,
};

const dayChipSelected = {
  background: tint(colors.brand, 0.14),
  color: colors.brand,
  borderColor: tint(colors.brand, 0.4),
};

const recoveryDot = {
  position: "absolute",
  top: 5,
  right: 7,
  width: 5,
  height: 5,
  borderRadius: radii.pill,
  background: colors.success,
};

const card = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  padding: 16,
  display: "grid",
  gap: 14,
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const cardTitle = {
  ...type.sectionTitle,
  overflowWrap: "anywhere",
};

const cardMeta = {
  ...type.meta,
  ...type.number,
  margin: "2px 0 0",
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

const fieldRow = {
  gap: 10,
};

const smallBtn = {
  minHeight: 34,
  padding: "6px 12px",
  fontSize: 13,
  whiteSpace: "nowrap",
};

const rowList = {
  display: "grid",
  borderTop: `1px solid ${colors.borderSoft}`,
  borderBottom: `1px solid ${colors.borderSoft}`,
};

const row = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "11px 0",
  borderTop: `1px solid ${colors.borderSoft}`,
};

const nameLine = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
};

const rowName = {
  display: "block",
  margin: 0,
  color: colors.text,
  fontSize: 15,
  fontWeight: 550,
  lineHeight: 1.3,
  overflowWrap: "anywhere",
};

const rowMeta = {
  ...type.meta,
  ...type.number,
  margin: "2px 0 0",
};

const noteText = {
  ...type.meta,
  margin: "4px 0 0",
  color: colors.textSoft,
};

const recoveryBadge = {
  fontSize: 12,
  fontWeight: 500,
  padding: "3px 8px",
  borderRadius: radii.pill,
  background: tint(colors.success, 0.12),
  color: colors.success,
};

const actions = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  justifyContent: "flex-end",
  flex: "0 0 auto",
};

const empty = {
  ...type.body,
  display: "grid",
  justifyItems: "center",
  gap: 12,
  padding: "20px 16px",
  borderRadius: radii.lg,
  background: colors.surfaceSoft,
  border: `1px solid ${colors.borderSoft}`,
  color: colors.muted,
  textAlign: "center",
};

const toolsCard = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  overflow: "hidden",
};

const toolsTitle = {
  ...type.sectionTitle,
  padding: "16px 16px 12px",
};

const toolsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
};

const toolRow = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 16px",
  border: 0,
  borderTop: `1px solid ${colors.borderSoft}`,
  borderRadius: 0,
  background: "transparent",
  textAlign: "left",
  fontWeight: 400,
};

const toolRowActive = {
  background: tint(colors.brand, 0.06),
};

const toolLabel = {
  display: "block",
  fontSize: 15,
  fontWeight: 550,
  lineHeight: 1.3,
};

const toolHint = {
  ...type.meta,
  display: "block",
  marginTop: 2,
};

const templateGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 8,
};

const templateCard = {
  display: "grid",
  alignContent: "space-between",
  gap: 12,
  padding: 12,
  borderRadius: radii.lg,
  background: colors.surfaceSoft,
  border: `1px solid ${colors.borderSoft}`,
};

const chipGrid = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const chip = {
  minHeight: 34,
  padding: "7px 12px",
  borderRadius: radii.pill,
  background: colors.surfaceRaised,
  color: colors.textSoft,
  borderColor: colors.border,
  fontSize: 13,
  fontWeight: 500,
};

const recoveryChip = {
  ...chip,
  color: colors.success,
  borderColor: tint(colors.success, 0.3),
};

const libraryControls = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(120px, 0.6fr)",
  gap: 8,
};

const librarySection = {
  display: "grid",
  gap: 8,
};

const wellList = {
  display: "grid",
  padding: "0 12px",
  borderRadius: radii.lg,
  background: colors.surfaceSoft,
  border: `1px solid ${colors.borderSoft}`,
};

const wellRow = {
  ...row,
  padding: "10px 0",
};

const textarea = {
  minHeight: 82,
  resize: "vertical",
};

const formActions = {
  display: "flex",
  gap: 8,
};

const fullButton = {
  width: "100%",
  padding: "12px 16px",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 210,
  background: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalPanel = {
  width: "min(460px, 100%)",
  maxHeight: "88vh",
  overflow: "auto",
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)",
  outline: "none",
};

const previewPanel = {
  ...modalPanel,
  width: "min(620px, 100%)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  padding: "18px 18px 0",
};

const modalTitle = {
  ...type.pageTitle,
  fontSize: 22,
  overflowWrap: "anywhere",
};

const closeBtn = {
  flex: "0 0 auto",
  width: 34,
  height: 34,
  padding: 0,
};

const modalBody = {
  display: "grid",
  gap: 14,
  padding: 18,
};

const modalActions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
};

const previewList = {
  display: "grid",
  gap: 8,
};

const previewDayCard = {
  padding: 12,
  borderRadius: radii.lg,
  background: colors.surfaceSoft,
  border: `1px solid ${colors.borderSoft}`,
};

const previewDayHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
};

const previewLiftList = {
  display: "grid",
  marginTop: 8,
};

const previewLiftRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "7px 0",
  borderTop: `1px solid ${colors.borderSoft}`,
  color: colors.textSoft,
  fontSize: 13,
};

const previewLiftTarget = {
  ...type.number,
  color: colors.muted,
  whiteSpace: "nowrap",
};
