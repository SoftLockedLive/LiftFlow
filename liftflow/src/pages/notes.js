import { useEffect, useState } from "react";
import { addNote, deleteNote, getNoteLevel, getNotes, NOTE_LEVELS } from "../lib/notes";
import { tint } from "../lib/muscleGroups";

const ACCENT = "#32cfff";

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [level, setLevel] = useState("good");
  const [lift, setLift] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setNotes(getNotes()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function saveNote() {
    if (!text.trim() && !lift.trim()) return;

    setNotes(
      addNote({
        level,
        lift: lift.trim(),
        text: text.trim(),
      })
    );
    setLift("");
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

        <input
          placeholder="Lift or session name"
          value={lift}
          onChange={(event) => setLift(event.target.value)}
        />
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
  border: "1px solid rgba(50, 207, 255, 0.35)",
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
