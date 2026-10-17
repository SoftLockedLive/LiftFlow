import { useEffect, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { addNote, deleteNote, getNoteLevel, getNotes, NOTE_LEVELS, updateNote } from "../lib/notes";
import { getPlan } from "../lib/plan";
import { colors, radii, tint, type } from "../lib/theme";
import { formatVolume, formatWeight, unitLabel, useUnits } from "../lib/units";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const RECAP_KEY = "liftflow_last_workout_recap";

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [options, setOptions] = useState([]);
  const [level, setLevel] = useState("solid");
  const [lift, setLift] = useState("");
  const [customLift, setCustomLift] = useState("");
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [recap, setRecap] = useState(null);
  const units = useUnits();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNotes(getNotes());
      setOptions(buildSessionOptions(getPlan()));
      setRecap(getWorkoutRecap());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function saveNote() {
    const subject = lift === "custom" ? customLift.trim() : lift.trim();
    if (!text.trim() && !subject) return;

    const note = {
      level,
      lift: subject,
      text: text.trim(),
    };

    setNotes(editingId ? updateNote(editingId, note) : addNote(note));
    resetForm();
  }

  function resetForm() {
    setEditingId(null);
    setLift("");
    setCustomLift("");
    setText("");
    setLevel("solid");
  }

  function startEdit(note) {
    const subject = note.lift || "";
    // Subjects that aren't in the split dropdown (custom ones, or a renamed day) go in the custom field.
    const inOptions = !subject || options.some((option) => option.value === subject);
    setEditingId(note.id);
    setLift(inOptions ? subject : "custom");
    setCustomLift(inOptions ? "" : subject);
    setText(note.text || "");
    // Old notes store aliases ("good", "bad"); select the level button they display as.
    setLevel(getNoteLevel(note.level).id);
  }

  const recapPrs = getRecapPrs(recap);

  return (
    <div style={wrap}>
      <header style={pageHeader}>
        <h1 style={type.pageTitle}>Notes</h1>
      </header>

      {recap && (
        <section style={card} aria-label="Workout recap">
          <div style={recapTop}>
            <div style={{ minWidth: 0 }}>
              <p style={type.eyebrow}>Workout recap</p>
              <h2 style={recapTitle}>{recap.focus}</h2>
            </div>
            <button type="button" className="ghost" onClick={() => dismissRecap(setRecap)} style={smallButton}>
              Dismiss
            </button>
          </div>
          <div style={recapStats}>
            <RecapStat label="Lifts" value={recap.lifts || 0} />
            <RecapStat label="Sets" value={recap.sets || 0} />
            <RecapStat
              label="Volume"
              value={formatVolume(Number(recap.volume || 0), units, { unit: false })}
              unit={unitLabel(units)}
            />
            <RecapStat label="PRs" value={recapPrs.length} highlight={recapPrs.length > 0} />
          </div>
          {recapPrs.length > 0 && (
            <ul style={prList} aria-label="New PRs">
              {recapPrs.map((pr) => (
                <li key={pr.exercise} style={prRow}>
                  <span style={prExercise}>{pr.exercise}</span>
                  <span style={prSet}>
                    <span style={prWeight}>{formatWeight(pr.weight, units)}</span> × {pr.reps}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {recap.addedLifts > 0 && (
            <p style={recapCopy}>
              {recap.addedLifts} added lift{recap.addedLifts === 1 ? "" : "s"} included in history.
            </p>
          )}
        </section>
      )}

      <section style={formCard}>
        <h2 style={type.sectionTitle}>{editingId ? "Edit note" : "How did it go?"}</h2>
        <div className="notes-level-grid" style={levelGrid} role="group" aria-label="How did it go?">
          {NOTE_LEVELS.map((item) => {
            const selected = level === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setLevel(item.id)}
                aria-pressed={selected}
                style={{
                  ...levelButton,
                  ...(selected
                    ? { color: item.color, borderColor: tint(item.color, 0.4), background: tint(item.color, 0.12) }
                    : {}),
                }}
              >
                <span style={emoji}>{item.emoji}</span>
                {item.label}
              </button>
            );
          })}
        </div>

        <label style={fieldWrap}>
          <span style={fieldLabel}>Lift or session</span>
          <select value={lift} onChange={(event) => setLift(event.target.value)}>
            <option value="">Choose from your split...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="custom">Custom note subject</option>
          </select>
        </label>

        {lift === "custom" && (
          <label style={fieldWrap}>
            <span style={fieldLabel}>Custom subject</span>
            <input
              placeholder="Lift or session name"
              value={customLift}
              onChange={(event) => setCustomLift(event.target.value)}
            />
          </label>
        )}
        <label style={fieldWrap}>
          <span style={fieldLabel}>Note</span>
          <textarea
            placeholder="How did it feel? Anything to remember next time..."
            value={text}
            onChange={(event) => setText(event.target.value)}
            style={textarea}
          />
        </label>
        <div style={formActions}>
          {editingId && (
            <button type="button" onClick={resetForm} style={cancelBtn}>
              Cancel
            </button>
          )}
          <button type="button" className="primary" onClick={saveNote} style={saveButton}>
            {editingId ? "Save changes" : "Save note"}
          </button>
        </div>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={type.sectionTitle}>Your notes</h2>
        {notes.length === 0 ? (
          <div style={{ ...card, ...empty }}>No notes yet. Save a quick session note above.</div>
        ) : (
          <div style={list}>
            {notes.map((note, index) => {
              const noteLevel = getNoteLevel(note.level);

              return (
                <article key={note.id} style={{ ...noteRow, ...(index === 0 ? { borderTop: 0 } : {}) }}>
                  <div style={noteTop}>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={noteTitle}>{note.lift || noteLevel.label}</h3>
                      <div style={noteMeta}>
                        <span style={{ ...badge, color: noteLevel.color, background: tint(noteLevel.color, 0.12) }}>
                          <span aria-hidden="true">{noteLevel.emoji}</span>
                          {noteLevel.label}
                        </span>
                        <span style={dateText}>{formatDate(note.date)}</span>
                      </div>
                    </div>
                    <div style={noteActions}>
                      <button type="button" className="ghost" onClick={() => startEdit(note)} style={smallButton}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => setConfirmDeleteId(note.id)}
                        style={smallButton}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {note.text && <p style={noteText}>{note.text}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete note?"
        message="This note will be permanently removed from your training notes."
        confirmLabel="Delete note"
        danger
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (!confirmDeleteId) return;
          setNotes(deleteNote(confirmDeleteId));
          if (confirmDeleteId === editingId) resetForm();
          setConfirmDeleteId(null);
        }}
      />
    </div>
  );
}

function buildSessionOptions(plan) {
  // Days can share a focus name (e.g. two "Upper" days); list each name once.
  const focuses = DAYS.flatMap((day) => {
    const lifts = Array.isArray(plan[day]) ? plan[day] : [];
    return lifts.length > 0 ? [plan.__meta?.[day]?.name?.trim() || day] : [];
  });
  return [...new Set(focuses)].map((focus) => ({ value: focus, label: `${focus} session` }));
}

// Imported notes may have a missing or junk date; show nothing rather than crash.
function formatDate(date) {
  if (date === null || date === undefined || date === "") return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

// One row per exercise (older recaps could list a lift twice), keeping the heaviest set.
function getRecapPrs(recap) {
  const best = new Map();
  (Array.isArray(recap?.prs) ? recap.prs : []).forEach((pr) => {
    const exercise = String(pr?.exercise || "").trim();
    if (!exercise) return;
    const weight = Number(pr.weight) || 0;
    const reps = Number(pr.reps) || 0;
    const current = best.get(exercise);
    if (!current || weight > current.weight || (weight === current.weight && reps > current.reps)) {
      best.set(exercise, { exercise, weight, reps });
    }
  });
  return [...best.values()];
}

function getWorkoutRecap() {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(RECAP_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function dismissRecap(setRecap) {
  localStorage.removeItem(RECAP_KEY);
  setRecap(null);
}

function RecapStat({ label, value, unit, highlight }) {
  return (
    <div style={recapStat}>
      <span style={type.meta}>{label}</span>
      <strong style={{ ...recapValue, ...(highlight ? { color: colors.accent } : {}) }}>
        {value}
        {unit && <span style={recapUnit}> {unit}</span>}
      </strong>
    </div>
  );
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

const formCard = {
  ...card,
  display: "grid",
  gap: 14,
};

const recapTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const recapTitle = {
  ...type.sectionTitle,
  marginTop: 4,
  overflowWrap: "anywhere",
};

const smallButton = {
  padding: "7px 10px",
  minHeight: 34,
  fontSize: 13,
};

const recapStats = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 8,
};

const recapStat = {
  display: "grid",
  gap: 2,
  padding: "10px 12px",
  borderRadius: radii.lg,
  background: colors.surfaceSoft,
  border: `1px solid ${colors.borderSoft}`,
  minWidth: 0,
};

const recapValue = {
  ...type.number,
  color: colors.text,
  fontSize: 20,
  fontWeight: 650,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const recapUnit = {
  color: colors.muted,
  fontSize: 12,
  fontWeight: 500,
};

const prList = {
  listStyle: "none",
  margin: "12px 0 0",
  padding: "4px 12px",
  borderRadius: radii.lg,
  border: `1px solid ${tint(colors.accent, 0.25)}`,
  background: tint(colors.accent, 0.06),
};

const prRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  padding: "6px 0",
};

const prExercise = {
  ...type.body,
  color: colors.text,
  minWidth: 0,
  overflowWrap: "anywhere",
};

const prSet = {
  ...type.body,
  ...type.number,
  flex: "0 0 auto",
  whiteSpace: "nowrap",
};

const prWeight = {
  color: colors.accent,
  fontWeight: 600,
};

const recapCopy = {
  ...type.meta,
  margin: "12px 0 0",
};

const levelGrid = {
  gap: 6,
};

const levelButton = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  minHeight: 58,
  padding: "8px 4px",
  borderRadius: radii.lg,
  background: colors.surfaceRaised,
  borderColor: colors.border,
  color: colors.muted,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.1,
  whiteSpace: "nowrap",
};

const emoji = {
  fontSize: 17,
  lineHeight: 1,
};

const textarea = {
  width: "100%",
  minHeight: 96,
  resize: "vertical",
};

const formActions = {
  display: "flex",
  gap: 8,
};

const saveButton = {
  flex: 1,
  padding: "12px 16px",
  fontSize: 15,
};

const cancelBtn = {
  padding: "12px 16px",
};

const fieldWrap = {
  display: "grid",
  gap: 6,
};

const fieldLabel = {
  color: colors.textSoft,
  fontSize: 13,
  fontWeight: 500,
};

const list = {
  ...card,
  padding: 0,
  overflow: "hidden",
};

const empty = {
  padding: "28px 16px",
  color: colors.muted,
  textAlign: "center",
};

const noteRow = {
  padding: "13px 16px",
  borderTop: `1px solid ${colors.borderSoft}`,
};

const noteTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const noteTitle = {
  margin: 0,
  color: colors.text,
  fontSize: 15,
  fontWeight: 550,
  lineHeight: 1.3,
  overflowWrap: "anywhere",
};

const noteMeta = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 6,
};

const badge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 8px",
  borderRadius: radii.pill,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.3,
};

const dateText = {
  ...type.meta,
  ...type.number,
};

const noteActions = {
  display: "flex",
  gap: 6,
  flex: "0 0 auto",
};

const noteText = {
  ...type.body,
  margin: "10px 0 0",
  whiteSpace: "pre-wrap",
};
