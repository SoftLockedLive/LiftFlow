const KEY = "liftflow_notes";

export const NOTE_LEVELS = [
  { id: "great", label: "Great", emoji: "🔥", color: "#32df76" },
  { id: "good", label: "Good", emoji: "💪", color: "#32cfff" },
  { id: "okay", label: "Okay", emoji: "😐", color: "#f7f7f2" },
  { id: "rough", label: "Rough", emoji: "😮‍💨", color: "#ff9b34" },
  { id: "bad", label: "Bad", emoji: "💀", color: "#ff6b2c" },
];

export function getNotes() {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

export function saveNotes(notes) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(notes));
}

export function addNote(note) {
  const notes = getNotes();
  const updated = [
    {
      id: crypto.randomUUID(),
      date: Date.now(),
      ...note,
    },
    ...notes,
  ];

  saveNotes(updated);
  return updated;
}

export function deleteNote(id) {
  const updated = getNotes().filter((note) => note.id !== id);
  saveNotes(updated);
  return updated;
}

export function updateNote(id, patch) {
  const updated = getNotes().map((note) =>
    note.id === id ? { ...note, ...patch, updatedAt: Date.now() } : note
  );
  saveNotes(updated);
  return updated;
}

export function getNoteLevel(levelId) {
  return NOTE_LEVELS.find((level) => level.id === levelId) || NOTE_LEVELS[1];
}
