import { useEffect, useState } from "react";
import { addNote, deleteNote, getNoteLevel, getNotes, NOTE_LEVELS } from "../lib/notes";
import { tint } from "../lib/muscleGroups";
import { getPlan } from "../lib/plan";

const ACCENT = "#32cfff";
const YELLOW = "#e4ff2f";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [options, setOptions] = useState([]);
  const [level, setLevel] = useState("good");
  const [lift, setLift] = useState("");
  const [customLift, setCustomLift] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNotes(getNotes());
      setOptions(buildSessionOptions(getPlan()));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function saveNote() {
    const subject = lift === "custom" ? customLift.trim() : lift.trim();
    if (!text.trim() && !subject) return;

    setNotes(
      addNote({
        level,
        lift: subject,
        text: text.trim(),
      })
    );
    setLift("");
    setCustomLift("");
    setText("");
    setLevel("good");
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
        <h2 style={cardTitle}>How did it go?</h2>
        <div className="notes-level-grid" style={levelGrid}>
          {NOTE_LEVELS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLevel(item.id)}
              style={{
                ...levelButton,
                ...(item.id === "great" || item.id === "good" ? levelButtonLarge : {}),
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
          Save Note
        </button>
      </section>

      <section style={list}>
        {notes.length === 0 ? (
          <div style={empty}>No notes yet.</div>
        ) : (
          notes.map((note) => {
            const noteLevel = getNoteLevel(note.level);

            return (
              <article
                key={note.id}
                style={{
                  ...noteCard,
                  borderColor: tint(noteLevel.color, 0.4),
                  background: tint(noteLevel.color, 0.07),
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
                  <button type="button" onClick={() => setNotes(deleteNote(note.id))} style={deleteBtn}>
                    Delete
                  </button>
                </div>
                {note.text && <p style={noteText}>{note.text}</p>}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

function buildSessionOptions(plan) {
  return DAYS.flatMap((day) => {
    const lifts = Array.isArray(plan[day]) ? plan[day] : [];
    const focus = plan.__meta?.[day]?.name?.trim() || day;
    const dayOption = lifts.length > 0 ? [{ value: focus, label: `${focus} session` }] : [];
    const liftOptions = lifts.map((lift) => ({
      value: `${focus} - ${lift.exercise}`,
      label: `${focus} - ${lift.exercise}`,
    }));

    return [...dayOption, ...liftOptions];
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
  border: "1px solid rgba(228, 255, 47, 0.35)",
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

const levelGrid = {
  gap: 8,
};

const levelButton = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  padding: "10px 6px",
  borderRadius: 14,
};

const levelButtonLarge = {
  gridColumn: "span 3",
};

const emoji = {
  fontSize: 18,
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
  padding: 14,
};

const noteTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
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
