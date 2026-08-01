import { useEffect, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { addNote, deleteNote, getNoteLevel, getNotes, NOTE_LEVELS, updateNote } from "../lib/notes";
import { tint } from "../lib/muscleGroups";
import { getPlan } from "../lib/plan";

const ACCENT = "#32cfff";
const YELLOW = "#e4ff2f";
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
    setEditingId(null);
    setLift("");
    setCustomLift("");
    setText("");
    setLevel("solid");
  }

  function startEdit(note) {
    setEditingId(note.id);
    setLift(note.lift || "");
    setCustomLift("");
    setText(note.text || "");
    setLevel(note.level || "good");
  }

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Training Notes</p>
          <h1 style={title}>Notes</h1>
        </div>
      </header>

      <section style={card}>
        {recap && (
          <div style={recapCard}>
            <div style={recapTop}>
              <div>
                <p style={eyebrow}>Workout Recap</p>
                <h2 style={recapTitle}>{recap.focus}</h2>
              </div>
              <button type="button" onClick={() => dismissRecap(setRecap)} style={dismissBtn}>Dismiss</button>
            </div>
            <div style={recapStats}>
              <RecapStat label="Lifts" value={recap.lifts || 0} />
              <RecapStat label="Sets" value={recap.sets || 0} />
              <RecapStat label="Volume" value={`${Number(recap.volume || 0).toLocaleString()} lb`} />
              <RecapStat label="PRs" value={recap.prs?.length || 0} />
            </div>
            {recap.addedLifts > 0 && <p style={recapCopy}>{recap.addedLifts} added lift{recap.addedLifts === 1 ? "" : "s"} included in history.</p>}
          </div>
        )}
        <h2 style={cardTitle}>How did it go?</h2>
        <div className="notes-level-grid" style={levelGrid}>
          {NOTE_LEVELS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLevel(item.id)}
              style={{
                ...levelButton,
                color: item.color,
                borderColor: level === item.id ? item.color : tint(item.color, 0.28),
                background: level === item.id ? tint(item.color, 0.16) : "#0b0b0b",
              }}
            >
              <span style={emoji}>{item.emoji}</span>
              {item.label}
            </button>
          ))}
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
        <textarea
          placeholder="Custom note..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          style={textarea}
        />
        <button type="button" className="primary" onClick={saveNote} style={saveButton}>
          {editingId ? "Save Changes" : "Save Note"}
        </button>
        {editingId && (
          <button type="button" onClick={() => {
            setEditingId(null);
            setLift("");
            setText("");
            setLevel("solid");
          }} style={cancelBtn}>
            Cancel Edit
          </button>
        )}
      </section>

      <section style={list}>
        {notes.length === 0 ? (
          <div style={empty}>No notes yet. Save a quick session note above.</div>
        ) : (
          notes.map((note) => {
            const noteLevel = getNoteLevel(note.level);

            return (
              <article
                key={note.id}
                style={{
                  ...noteCard,
                  borderColor: tint(noteLevel.color, 0.4),
                }}
              >
                <div style={noteTop}>
                  <div>
                    <h2 style={{ ...noteTitle, color: noteLevel.color }}>
                      <span style={emoji}>{noteLevel.emoji}</span>
                      {note.lift || noteLevel.label}
                    </h2>
                    <p style={dateText}>{formatDate(note.date)} · {noteLevel.label}</p>
                  </div>
                  <div style={noteActions}>
                    <button type="button" onClick={() => startEdit(note)} style={editBtn}>
                      Edit
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteId(note.id)} style={deleteBtn}>
                      Delete
                    </button>
                  </div>
                </div>
                {note.text && <p style={noteText}>{note.text}</p>}
              </article>
            );
          })
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete Note?"
        message="This note will be permanently removed from your training notes."
        confirmLabel="Delete Note"
        danger
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (!confirmDeleteId) return;
          setNotes(deleteNote(confirmDeleteId));
          setConfirmDeleteId(null);
        }}
      />
    </div>
  );
}

function buildSessionOptions(plan) {
  return DAYS.flatMap((day) => {
    const lifts = Array.isArray(plan[day]) ? plan[day] : [];
    const focus = plan.__meta?.[day]?.name?.trim() || day;
    return lifts.length > 0 ? [{ value: focus, label: `${focus} session` }] : [];
  });
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
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

function RecapStat({ label, value }) {
  return (
    <div style={recapStat}>
      <span style={recapLabel}>{label}</span>
      <strong style={recapValue}>{value}</strong>
    </div>
  );
}

const wrap = {
  maxWidth: 760,
  margin: "0 auto",
};

const header = {
  marginBottom: 18,
};

const eyebrow = {
  margin: 0,
  color: ACCENT,
  fontSize: 13,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 32,
  lineHeight: 1.1,
};

const card = {
  border: "1px solid #242424",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
  display: "grid",
  gap: 12,
  marginBottom: 14,
};

const cardTitle = {
  margin: 0,
  fontSize: 22,
};

const recapCard = {
  border: "1px solid rgba(228, 255, 47, 0.34)",
  borderRadius: 12,
  background: "rgba(228, 255, 47, 0.08)",
  padding: 12,
  display: "grid",
  gap: 10,
};

const recapTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
};

const recapTitle = {
  margin: "4px 0 0",
  color: YELLOW,
  fontSize: 20,
};

const dismissBtn = {
  color: "#aaa",
  borderColor: "#333",
  background: "#0b0b0b",
  padding: "7px 10px",
  fontSize: 12,
};

const recapStats = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 7,
};

const recapStat = {
  border: "1px solid rgba(247, 247, 242, 0.1)",
  borderRadius: 10,
  background: "#0b0b0b",
  padding: 8,
};

const recapLabel = {
  display: "block",
  color: "#777",
  fontSize: 10,
  fontWeight: 850,
  textTransform: "uppercase",
};

const recapValue = {
  display: "block",
  marginTop: 4,
  color: "#f7f7f2",
  fontSize: 14,
};

const recapCopy = {
  margin: 0,
  color: "#d7d7d2",
  fontSize: 12,
  fontWeight: 750,
};

const levelGrid = {
  gap: 6,
};

const levelButton = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  minHeight: 58,
  padding: "8px 4px",
  borderRadius: 12,
  fontSize: 11,
  lineHeight: 1.05,
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
  borderRadius: 10,
  border: "1px solid #2b2b2b",
  background: "#0b0b0b",
  color: "#f7f7f2",
  padding: 10,
  font: "inherit",
  fontWeight: 700,
};

const saveButton = {
  width: "100%",
};

const cancelBtn = {
  color: "#aaa",
  borderColor: "#333",
  background: "#0b0b0b",
};

const fieldWrap = {
  display: "grid",
  gap: 6,
};

const fieldLabel = {
  color: YELLOW,
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const list = {
  display: "grid",
  gap: 10,
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

const noteCard = {
  border: "1px solid",
  borderRadius: 16,
  background: "#101010",
  padding: 14,
};

const noteTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const noteActions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const editBtn = {
  color: ACCENT,
  borderColor: "rgba(50, 207, 255, 0.45)",
  background: "rgba(50, 207, 255, 0.12)",
};

const noteTitle = {
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 20,
};

const dateText = {
  margin: "6px 0 0",
  color: "#777",
  fontSize: 13,
};

const noteText = {
  margin: "12px 0 0",
  color: "#ddd",
  lineHeight: 1.45,
};

const deleteBtn = {
  color: "#ff6b2c",
  borderColor: "rgba(255, 107, 44, 0.45)",
  background: "rgba(255, 107, 44, 0.12)",
};
