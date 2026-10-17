import { roundTo, toDisplay } from "./units";

// All weight numbers the coach depends on live here, per display unit. Stored
// weights are always lb; the coach converts history into the display unit and
// runs on that unit's own gym values (a 20 kg bar, 2.5 kg steps), not on
// converted pound numbers.
export const UNIT_LOADS = {
  lbs: {
    barWeight: 45,
    ezBarWeight: 20,
    minLoad: 5,
    // Spacing of loadable weights per load type: barbell = 2.5 lb plates each side,
    // dumbbells/machines/free weights/bodyweight belts in 5 lb steps. EZ-bars are
    // "barbell" lifts and share the barbell grid (anchored on the 20 lb bar).
    gridSteps: { barbell: 5, dumbbell: 5, machine: 5, free: 5, bodyweight: 5 },
    // Normal session-to-session change for each load type.
    progressionSteps: { barbell: 5, dumbbell: 5, machine: 5, free: 5, bodyweight: 5 },
    // Heavy barbell lifts take a bigger jump after a strong session.
    heavyBarbellJump: 10,
    heavyBarbellThreshold: 100,
    // Under this, a lift progresses reps before load (a fixed jump is a big relative change).
    lightLoadThreshold: 50,
    // Warmup ramp thresholds: no ramp under minWorking; the bar-only first set needs
    // barbellStart; a second set from secondSet; a heavy single-ish set from heavySet.
    rampThresholds: { minWorking: 50, barbellStart: 95, secondSet: 100, heavySet: 185 },
    // A history weight that was not entered in this unit (e.g. logged in kg) is
    // snapped to the plate step before the coach repeats or grades it, so jumps
    // from it are whole steps.
    foreignSnapStep: 5,
  },
  kg: {
    barWeight: 20,
    ezBarWeight: 10,
    minLoad: 2.5,
    // 1.25 kg plates each side on a bar; 2.5 kg dumbbell/machine/belt steps.
    gridSteps: { barbell: 2.5, dumbbell: 2.5, machine: 2.5, free: 2.5, bodyweight: 2.5 },
    progressionSteps: { barbell: 2.5, dumbbell: 2.5, machine: 2.5, free: 2.5, bodyweight: 2.5 },
    heavyBarbellJump: 5,
    heavyBarbellThreshold: 45,
    lightLoadThreshold: 22.5,
    rampThresholds: { minWorking: 22.5, barbellStart: 42.5, secondSet: 45, heavySet: 85 },
    foreignSnapStep: 2.5,
  },
};

export function getUnitLoads(units) {
  return units === "kg" ? UNIT_LOADS.kg : UNIT_LOADS.lbs;
}

// The lb values, kept as named exports.
export const BAR_WEIGHT = UNIT_LOADS.lbs.barWeight;
export const EZ_BAR_WEIGHT = UNIT_LOADS.lbs.ezBarWeight;
export const MIN_LOAD = UNIT_LOADS.lbs.minLoad;
export const LOAD_TYPES = ["barbell", "machine", "dumbbell", "bodyweight", "free"];
export const LOAD_GRID_STEPS = UNIT_LOADS.lbs.gridSteps;
export const PROGRESSION_STEPS = UNIT_LOADS.lbs.progressionSteps;
export const HEAVY_BARBELL_JUMP = UNIT_LOADS.lbs.heavyBarbellJump;
export const HEAVY_BARBELL_THRESHOLD = UNIT_LOADS.lbs.heavyBarbellThreshold;
export const LIGHT_LOAD_THRESHOLD = UNIT_LOADS.lbs.lightLoadThreshold;
export const RAMP_THRESHOLDS = UNIT_LOADS.lbs.rampThresholds;

// A stored lb weight as the coach sees it in the display unit. A value that was
// entered in this unit converts back to (within float noise) a number with at most
// two decimals and is used exactly, so a hold repeats what was lifted (60 kg logged
// -> 60). A value entered in the other unit (185 lb -> 83.91 kg) is not something
// this user loaded, so it snaps to the unit's foreignSnapStep (-> 85 kg). In lb,
// weights typed in lb are unchanged; values logged in kg snap to 5 lb.
export function toCoachWeight(lb, units) {
  const value = toDisplay(lb, units);
  if (!(value > 0)) return 0;
  const exact = roundTo(value, 2);
  if (Math.abs(value - exact) < 1e-6) return exact;
  const step = getUnitLoads(units).foreignSnapStep;
  return roundWeight(Math.round(value / step) * step);
}

const EPSILON = 1e-6;

// Without `units` (or with "lbs") the minimum is the stored lb value. With "kg" it
// is in kg: a stored minimum that is one of the lb defaults means that default's kg
// counterpart (45 lb bar -> 20 kg, 20 lb EZ-bar -> 10 kg, 5 lb -> 2.5 kg), so a kg
// barbell floor is 20 kg, not 20.41 kg; any other stored minimum is converted.
export function getLoadProfile(lift = {}, units = "lbs") {
  const exercise = lift.exercise || lift.baseExercise;
  const inferredType = inferLoadType(exercise);
  const type = normalizeLoadType(lift.loadType) || inferredType;
  const configuredMinimum = Number(lift.minimumLoad || lift.minLoad || 0);
  const defaultMinimum = getDefaultMinimumLoad(type, exercise, units);

  if (!(configuredMinimum > 0)) return { type, minimumLoad: defaultMinimum };
  if (units !== "kg") return { type, minimumLoad: configuredMinimum };
  const kg = UNIT_LOADS.kg;
  const counterpart = { [BAR_WEIGHT]: kg.barWeight, [EZ_BAR_WEIGHT]: kg.ezBarWeight, [MIN_LOAD]: kg.minLoad };
  if (counterpart[configuredMinimum]) return { type, minimumLoad: counterpart[configuredMinimum] };
  return { type, minimumLoad: toCoachWeight(configuredMinimum, units) };
}

export function getDefaultMinimumLoad(type, exercise, units = "lbs") {
  const loads = getUnitLoads(units);
  if (type !== "barbell") return loads.minLoad;
  return isEzBar(exercise) ? loads.ezBarWeight : loads.barWeight;
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

export function getProgressionStep(type, units = "lbs") {
  const steps = getUnitLoads(units).progressionSteps;
  return steps[type] || steps.free;
}

// Loadable weights for a profile are base + k * step. Barbell grids start at the
// bar (so a 20 lb EZ-bar or a custom bar weight stays loadable); others at zero.
// `profile.minimumLoad` must be in the same unit as `units`.
export function getLoadGrid(profile = {}, units = "lbs") {
  const steps = getUnitLoads(units).gridSteps;
  const step = steps[profile.type] || steps.free;
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
