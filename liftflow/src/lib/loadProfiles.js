// All weight numbers the coach depends on live here (in lb), so unit support can
// swap them in one place.
export const BAR_WEIGHT = 45;
export const EZ_BAR_WEIGHT = 20;
export const MIN_LOAD = 5;
export const LOAD_TYPES = ["barbell", "machine", "dumbbell", "bodyweight", "free"];

// Spacing of loadable weights per load type: barbell = 2.5 lb plates each side,
// dumbbells/machines/free weights/bodyweight belts in 5 lb steps. EZ-bars are
// "barbell" lifts and share the barbell grid (anchored on the 20 lb bar).
export const LOAD_GRID_STEPS = { barbell: 5, dumbbell: 5, machine: 5, free: 5, bodyweight: 5 };
// Normal session-to-session change for each load type.
export const PROGRESSION_STEPS = { barbell: 5, dumbbell: 5, machine: 5, free: 5, bodyweight: 5 };
// Heavy barbell lifts take a bigger jump after a strong session.
export const HEAVY_BARBELL_JUMP = 10;
export const HEAVY_BARBELL_THRESHOLD = 100;
// Under this, a lift progresses reps before load (a fixed jump is a big relative change).
export const LIGHT_LOAD_THRESHOLD = 50;
// Warmup ramp thresholds: no ramp under minWorking; the bar-only first set needs
// barbellStart; a second set from secondSet; a heavy single-ish set from heavySet.
export const RAMP_THRESHOLDS = { minWorking: 50, barbellStart: 95, secondSet: 100, heavySet: 185 };

const EPSILON = 1e-6;

export function getLoadProfile(lift = {}) {
  const inferredType = inferLoadType(lift.exercise || lift.baseExercise);
  const type = normalizeLoadType(lift.loadType) || inferredType;
  const configuredMinimum = Number(lift.minimumLoad || lift.minLoad || 0);

  if (configuredMinimum > 0) {
    return { type, minimumLoad: configuredMinimum };
  }

  return { type, minimumLoad: getDefaultMinimumLoad(type, lift.exercise || lift.baseExercise) };
}

export function getDefaultMinimumLoad(type, exercise) {
  if (type !== "barbell") return MIN_LOAD;
  return isEzBar(exercise) ? EZ_BAR_WEIGHT : BAR_WEIGHT;
}

// Order matters: explicit equipment first, then movement names. A bare "squat"
// means a barbell squat, but goblet, hack and split squats do not use a 45 lb bar.
export function inferLoadType(exercise) {
  const name = String(exercise || "").toLowerCase();
  if (/\bdumbbells?\b|\bdb\b|\bgoblet\b/.test(name)) return "dumbbell";
  if (isEzBar(name)) return "barbell";
  if (
    /\bcable\b|\bmachine\b|\bsmith\b|\bpulldown\b|\bpec deck\b|\bleg press\b|\bleg curl\b|\bleg extension\b|\bhack squat\b|\bpush-?down\b|\bpress-?down\b|\bface pull\b|\bbayesian\b|\bhip (abduction|adduction)\b/.test(
      name,
    )
  )
    return "machine";
  if (/\bpull[- ]?ups?\b|\bchin[- ]?ups?\b|\bpush[- ]?ups?\b|\bdips?\b|\bplanks?\b|\bhanging\b/.test(name))
    return "bodyweight";
  if (/\bbarbell\b|\btrap bar\b/.test(name)) return "barbell";
  if (/\bsplit squat\b|\bbulgarian\b/.test(name)) return "free";
  if (/\bbench\b|\bsquat\b|\bdeadlift\b|\brdl\b|\boverhead press\b|\bohp\b|\bpush press\b/.test(name)) return "barbell";
  if (/\bhammer curl\b|\blateral raise\b/.test(name)) return "dumbbell";
  return "free";
}

function isEzBar(exercise) {
  return /\bez[- ]?bar\b/i.test(String(exercise || ""));
}

export function normalizeLoadType(value) {
  const type = String(value || "").toLowerCase();
  return LOAD_TYPES.includes(type) ? type : "";
}

export function getProgressionStep(type) {
  return PROGRESSION_STEPS[type] || PROGRESSION_STEPS.free;
}

// Loadable weights for a profile are base + k * step. Barbell grids start at the
// bar (so a 20 lb EZ-bar or a custom bar weight stays loadable); others at zero.
export function getLoadGrid(profile = {}) {
  const step = LOAD_GRID_STEPS[profile.type] || LOAD_GRID_STEPS.free;
  const base = profile.type === "barbell" ? Number(profile.minimumLoad || 0) : 0;
  return { step, base };
}

function gridPoint(grid, k) {
  return roundWeight(grid.base + k * grid.step);
}

// Heaviest grid weight <= value.
export function gridFloor(value, grid) {
  return gridPoint(grid, Math.floor((value - grid.base) / grid.step + EPSILON));
}

// Lightest grid weight >= value.
export function gridCeil(value, grid) {
  return gridPoint(grid, Math.ceil((value - grid.base) / grid.step - EPSILON));
}

export function gridNearest(value, grid) {
  return gridPoint(grid, Math.round((value - grid.base) / grid.step));
}

// Heaviest grid weight <= last + jump that is still above last; if there is none,
// the next grid weight above last. 17.5 + 5 -> 20, 102.5 + 10 -> 110.
export function increaseLoad(last, jump, grid) {
  const target = gridFloor(last + jump, grid);
  return target > last + EPSILON ? target : roundWeight(gridFloor(last, grid) + grid.step);
}

// Lightest grid weight >= last - step that is still below last (or the next grid
// weight below last), never below the floor and never above last. 17.5 - 5 -> 15.
export function decreaseLoad(last, step, floor, grid) {
  const candidate = gridCeil(last - step, grid);
  const target = candidate < last - EPSILON ? candidate : roundWeight(gridCeil(last, grid) - grid.step);
  return Math.min(last, Math.max(floor, target));
}

export function roundWeight(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

// ---- One-time repair of load types stored by older code ----

// inferLoadType as it shipped before the goblet/hack/EZ-bar fix. Plans, saved
// splits and custom exercises built from templates or the Auto option stored
// exactly this, so a stored type equal to it carries no user intent.
function legacyInferLoadType(exercise) {
  const name = String(exercise || "").toLowerCase();
  if (/\bdumbbell\b|\bdb\b/.test(name)) return "dumbbell";
  if (/\bcable\b|\bmachine\b|\bpulldown\b|\bpec deck\b|\bleg press\b|\bleg curl\b|\bleg extension\b/.test(name))
    return "machine";
  if (/\bpull-up\b|\bpush-up\b|\bplank\b|\bhanging\b/.test(name)) return "bodyweight";
  if (/\bbarbell\b|\bbench press\b|\bsquat\b|\bdeadlift\b|\boverhead press\b|\bez-bar\b/.test(name)) return "barbell";
  return "free";
}

// Old code always stored the default minimum for the stored type (no UI sets it),
// so a different minimum means someone set it on purpose.
function isLegacyDefaultMinimum(type, minimumLoad, exercise) {
  if (!minimumLoad) return true;
  return (
    minimumLoad === (type === "barbell" ? BAR_WEIGHT : MIN_LOAD) ||
    minimumLoad === getDefaultMinimumLoad(type, exercise)
  );
}

// Returns the lift with a re-derived loadType/minimumLoad, or the same object when
// the stored values should stay.
//
// A stored type is treated as a stale default (and re-derived) only when it differs
// from today's inference, its minimum is the default for that type, AND it is a
// value older code wrote without the user choosing it:
//   - "free": the old Program editor / custom-exercise default, or
//   - the old inference for that name (templates, library adds, the Auto option).
// Any other stored type could only come from the user picking it in the Load type
// selector, so it is kept (e.g. "machine" for "Bench Press").
export function repairStoredLoadProfile(lift) {
  if (!lift || typeof lift !== "object") return lift;
  const exercise = lift.exercise || lift.baseExercise;
  if (!exercise) return lift;
  const storedType = normalizeLoadType(lift.loadType);
  if (!storedType) return lift;

  const storedMinimum = Number(lift.minimumLoad || lift.minLoad || 0);
  if (!isLegacyDefaultMinimum(storedType, storedMinimum, exercise)) return lift;

  const inferred = inferLoadType(exercise);
  const staleType = storedType !== inferred && (storedType === "free" || storedType === legacyInferLoadType(exercise));
  const type = staleType ? inferred : storedType;
  const minimumLoad = getDefaultMinimumLoad(type, exercise);

  if (type === storedType && (!storedMinimum || storedMinimum === minimumLoad)) return lift;
  const repaired = { ...lift, loadType: type };
  // Lifts stored without a minimum get the type's default from getLoadProfile.
  if (storedMinimum) repaired.minimumLoad = minimumLoad;
  return repaired;
}

export function repairPlanLoadProfiles(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return plan;
  let changed = false;
  const next = {};
  for (const [key, value] of Object.entries(plan)) {
    if (Array.isArray(value)) {
      const lifts = value.map(repairStoredLoadProfile);
      if (lifts.some((lift, index) => lift !== value[index])) {
        changed = true;
        next[key] = lifts;
        continue;
      }
    }
    next[key] = value;
  }
  return changed ? next : plan;
}

export const MIGRATIONS_KEY = "liftflow_migrations";

function readAppliedMigrations() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MIGRATIONS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Runs `migrate` once per device for the given id and returns true if it ran.
// Never throws: a failure leaves the id unrecorded so the next read tries again.
export function runStorageMigration(id, migrate) {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
  try {
    const applied = readAppliedMigrations();
    if (applied.includes(id)) return false;
    migrate();
    localStorage.setItem(MIGRATIONS_KEY, JSON.stringify([...readAppliedMigrations().filter((x) => x !== id), id]));
    return true;
  } catch {
    return false;
  }
}

// Rewrites one stored JSON key with `transform`, only if it changed something.
export function migrateStoredJson(key, transform) {
  const raw = localStorage.getItem(key);
  if (!raw) return;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  const next = transform(parsed);
  if (next !== parsed) localStorage.setItem(key, JSON.stringify(next));
}
