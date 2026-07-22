const KEY = "liftflow_notes";

export const NOTE_LEVELS = [
  { id: "rough", label: "Rough", emoji: "💀", color: "#ff6b2c", aliases: ["bad"] },
  { id: "okay", label: "Okay", emoji: "😮‍💨", color: "#f7f7f2" },
  { id: "solid", label: "Solid", emoji: "💪🏼", color: "#32cfff", aliases: ["good"] },
  { id: "great", label: "Great", emoji: "🔥", color: "#32df76" },
  { id: "pr", label: "PR Day", emoji: "⚡", color: "#e4ff2f" },
];

export function getNotes() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
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
  return NOTE_LEVELS.find((level) => level.id === levelId || level.aliases?.includes(levelId)) || NOTE_LEVELS[2];
}
