const LOG_KEY = "liftflow_running_log";

export const RUNNING_PRESETS = [
  {
    id: "easy-run",
    name: "Easy Run",
    type: "Base",
    target: "20-35 min",
    notes: "Conversational pace. Finish feeling like you could keep going.",
  },
  {
    id: "zone-2",
    name: "Zone 2",
    type: "Conditioning",
    target: "25-45 min",
    notes: "Keep breathing controlled and effort steady.",
  },
  {
    id: "intervals",
    name: "Intervals",
    type: "Speed",
    target: "6 x 1 min hard / 2 min easy",
    notes: "Warm up first. Hard reps should be fast but repeatable.",
  },
  {
    id: "incline-walk",
    name: "Incline Walk",
    type: "Low Impact",
    target: "20-40 min",
    notes: "Good conditioning option after lifting or on recovery days.",
  },
];

export function getRunLog() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addRun(entry) {
  const updated = [{ id: crypto.randomUUID(), date: Date.now(), ...entry }, ...getRunLog()];
  localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteRun(id) {
  const updated = getRunLog().filter((entry) => entry.id !== id);
  localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  return updated;
}
