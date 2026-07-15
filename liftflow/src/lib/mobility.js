const ROUTINE_KEY = "liftflow_mobility_routine";
const LOG_KEY = "liftflow_mobility_log";

export const MOBILITY_PRESETS = [
  {
    id: "daily-flexibility",
    name: "Daily Flexibility",
    goal: "General daily range of motion",
    movements: [
      movement("World's Greatest Stretch", "time", "60 sec/side"),
      movement("90/90 Hip Rotations", "reps", "8/side"),
      movement("Deep Squat Hold", "time", "60 sec"),
      movement("Hamstring Stretch", "time", "60 sec/side"),
      movement("Couch Stretch", "time", "60 sec/side"),
    ],
  },
  {
    id: "squat-hips",
    name: "Squat Hips",
    goal: "Hips, ankles, and squat depth",
    movements: [
      movement("Ankle Rocks", "reps", "12/side"),
      movement("Cossack Squat", "reps", "8/side"),
      movement("90/90 Hip Switches", "reps", "10"),
      movement("Deep Squat Breathing", "time", "90 sec"),
    ],
  },
  {
    id: "upper-shoulders",
    name: "Upper Shoulders",
    goal: "Shoulders, pecs, lats, and T-spine",
    movements: [
      movement("Band Pull-Aparts", "reps", "20"),
      movement("Wall Slides", "reps", "12"),
      movement("Lat Stretch", "time", "60 sec/side"),
      movement("Doorway Pec Stretch", "time", "60 sec/side"),
      movement("T-Spine Open Books", "reps", "8/side"),
    ],
  },
  {
    id: "post-run",
    name: "Post-Run Reset",
    goal: "Calves, hips, hamstrings, and quads",
    movements: [
      movement("Calf Stretch", "time", "60 sec/side"),
      movement("Hamstring Sweep", "reps", "10/side"),
      movement("Hip Flexor Stretch", "time", "60 sec/side"),
      movement("Quad Stretch", "time", "45 sec/side"),
    ],
  },
];

export function getMobilityRoutine() {
  if (typeof window === "undefined") return [];
  return read(ROUTINE_KEY, []);
}

export function saveMobilityRoutine(routine) {
  if (typeof window === "undefined") return [];
  const safeRoutine = Array.isArray(routine) ? routine : [];
  localStorage.setItem(ROUTINE_KEY, JSON.stringify(safeRoutine));
  return safeRoutine;
}

export function getMobilityLog() {
  if (typeof window === "undefined") return [];
  return read(LOG_KEY, []);
}

export function addMobilityLog(entry) {
  const updated = [{ id: crypto.randomUUID(), date: Date.now(), ...entry }, ...getMobilityLog()];
  localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  return updated;
}

function movement(name, mode, target) {
  return { id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), name, mode, target };
}

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}
