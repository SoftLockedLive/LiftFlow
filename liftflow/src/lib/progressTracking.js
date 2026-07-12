import { getProteinLog, getProteinTarget, getTodayKey, saveProteinLog } from "./protein";

const CHECK_INS_KEY = "liftflow_daily_checkins";
const TARGETS_KEY = "liftflow_progress_targets";

export const DEFAULT_TARGETS = {
  goalType: "lean-bulk",
  calorieTarget: 2800,
  proteinTarget: 160,
  stepGoal: 8000,
  sleepGoalHours: 8,
  targetWeeklyWeightChangeMin: 0.25,
  targetWeeklyWeightChangeMax: 0.5,
  weightUnit: "lb",
};

const GOAL_RANGES = {
  "lean-bulk": [0.25, 0.5],
  maintenance: [-0.25, 0.25],
  cut: [-1, -0.5],
};

export function getProgressTargets() {
  if (typeof window === "undefined") return DEFAULT_TARGETS;

  const saved = parseJson(localStorage.getItem(TARGETS_KEY), {});
  const proteinTarget = getProteinTarget();
  return normalizeTargets({
    ...DEFAULT_TARGETS,
    proteinTarget,
    ...saved,
  });
}

export function saveProgressTargets(targets) {
  if (typeof window === "undefined") return DEFAULT_TARGETS;

  const current = getProgressTargets();
  const next = normalizeTargets({ ...current, ...targets });
  localStorage.setItem(TARGETS_KEY, JSON.stringify(next));
  return next;
}

export function getDailyCheckIns() {
  if (typeof window === "undefined") return [];

  const rawSaved = localStorage.getItem(CHECK_INS_KEY);
  const saved = parseJson(rawSaved, []);
  const checkIns = Array.isArray(saved) ? saved : Object.values(saved || {});
  const proteinLog = getProteinLog();
  const proteinMigrations = rawSaved
    ? []
    : Object.entries(proteinLog).map(([date, protein]) => ({
        id: `${date}-protein`,
        date,
        protein,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

  const normalized = [...checkIns, ...proteinMigrations]
    .filter((entry) => entry && entry.date)
    .map((entry) => normalizeCheckIn({
      ...entry,
      protein: entry.protein ?? proteinLog[entry.date],
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!rawSaved && proteinMigrations.length) {
    localStorage.setItem(CHECK_INS_KEY, JSON.stringify(normalized));
  }

  return normalized;
}

export function saveDailyCheckIn(entry) {
  if (typeof window === "undefined") return [];

  const now = new Date().toISOString();
  const date = entry.date || getTodayKey();
  const existing = getDailyCheckIns();
  const previous = existing.find((item) => item.date === date);
  const nextEntry = normalizeCheckIn({
    ...previous,
    ...entry,
    id: previous?.id || entry.id || crypto.randomUUID(),
    date,
    createdAt: previous?.createdAt || entry.createdAt || now,
    updatedAt: now,
  });

  const next = [...existing.filter((item) => item.date !== date), nextEntry].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  localStorage.setItem(CHECK_INS_KEY, JSON.stringify(next));
  syncProteinForCheckIn(nextEntry);
  return next;
}

export function deleteDailyCheckIn(id) {
  if (typeof window === "undefined") return { checkIns: [], deleted: null };

  const existing = getDailyCheckIns();
  const deleted = existing.find((entry) => entry.id === id) || null;
  const next = existing.filter((entry) => entry.id !== id);
  localStorage.setItem(CHECK_INS_KEY, JSON.stringify(next));
  return { checkIns: next, deleted };
}

export function restoreDailyCheckIn(entry) {
  if (!entry) return getDailyCheckIns();
  return saveDailyCheckIn(entry);
}

export function getWeightEntries(checkIns) {
  return (checkIns || [])
    .filter((entry) => isFiniteNumber(entry.morningWeight))
    .map((entry) => ({ date: entry.date, value: Number(entry.morningWeight) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function rollingAverage(entries, days = 7) {
  return (entries || []).map((entry, index, list) => {
    const slice = list.slice(Math.max(0, index - days + 1), index + 1);
    return {
      date: entry.date,
      value: round1(average(slice.map((item) => item.value))),
      count: slice.length,
    };
  });
}

export function getCurrentRollingAverage(entries, days = 7) {
  const values = (entries || []).slice(-days).map((entry) => entry.value);
  return values.length ? round1(average(values)) : null;
}

export function getPreviousRollingAverage(entries, days = 7) {
  const values = (entries || []).slice(-days * 2, -days).map((entry) => entry.value);
  return values.length ? round1(average(values)) : null;
}

export function getWeeklyWeightChangeRate(entries) {
  const current = getCurrentRollingAverage(entries, 7);
  const previous = getPreviousRollingAverage(entries, 7);
  if (!isFiniteNumber(current) || !isFiniteNumber(previous)) return null;
  return round1(current - previous);
}

export function getRangeEntries(entries, range) {
  if (range === "all") return entries || [];

  const days = range === "7" ? 7 : range === "30" ? 30 : 90;
  return (entries || []).slice(-days);
}

export function averageDaily(checkIns, field, days = 7) {
  const values = (checkIns || [])
    .slice(-days)
    .map((entry) => entry[field])
    .filter(isFiniteNumber)
    .map(Number);
  return values.length ? round1(average(values)) : null;
}

export function getProteinAdherence(checkIns, target, days = 7) {
  if (!target) return { hits: 0, days: 0 };
  const recent = (checkIns || []).slice(-days);
  return {
    hits: recent.filter((entry) => Number(entry.protein || 0) >= target).length,
    days: recent.length,
  };
}

export function compareWeeks(checkIns, field) {
  const current = averageDaily(checkIns, field, 7);
  const previousValues = (checkIns || [])
    .slice(-14, -7)
    .map((entry) => entry[field])
    .filter(isFiniteNumber)
    .map(Number);
  const previous = previousValues.length ? round1(average(previousValues)) : null;
  if (!isFiniteNumber(current) || !isFiniteNumber(previous)) return { current, previous, delta: null };
  return { current, previous, delta: round1(current - previous) };
}

export function buildRecoverySummary(checkIns, targets) {
  const latest = (checkIns || [])[checkIns.length - 1];
  if (!latest) {
    return {
      label: "Needs check-in",
      copy: "Complete today's check-in to view recovery insights.",
      factors: ["No recent recovery entry"],
    };
  }

  const sleepAverage = averageDaily(checkIns, "sleepHours", 7);
  const sorenessAverage = averageDaily(checkIns, "soreness", 7);
  const stressAverage = averageDaily(checkIns, "stress", 7);
  const factors = [];

  if (isFiniteNumber(latest.sleepHours) && latest.sleepHours < Math.min(targets.sleepGoalHours, sleepAverage || targets.sleepGoalHours) - 0.5) {
    factors.push("sleep below recent average");
  }
  if (Number(latest.soreness || 0) >= 4 || Number(sorenessAverage || 0) >= 4) factors.push("soreness is high");
  if (Number(latest.stress || 0) >= 4 || Number(stressAverage || 0) >= 4) factors.push("stress is high");
  if (Number(latest.energy || 0) > 0 && Number(latest.energy || 0) <= 2) factors.push("energy is low");

  if (factors.length >= 2) {
    return { label: "Reduced", copy: `Recovery is reduced because ${joinFactors(factors)}.`, factors };
  }
  if (factors.length === 1) {
    return { label: "Normal", copy: `Recovery is normal with ${factors[0]} flagged.`, factors };
  }
  return { label: "Good", copy: "Recovery looks good based on your recent check-ins.", factors: ["sleep, energy, soreness, and stress"] };
}

export function buildInsights(checkIns, targets) {
  const weights = getWeightEntries(checkIns);
  const rate = getWeeklyWeightChangeRate(weights);
  const protein = getProteinAdherence(checkIns, targets.proteinTarget, 7);
  const sleep = averageDaily(checkIns, "sleepHours", 7);
  const steps = compareWeeks(checkIns, "steps");
  const insights = [];

  if (weights.length < 7) {
    insights.push("More bodyweight data is needed before calculating a reliable trend.");
  } else if (isFiniteNumber(rate)) {
    insights.push(`Your 7-day average weight ${rate >= 0 ? "increased" : "decreased"} by ${Math.abs(rate)} ${targets.weightUnit}.`);
    if (weights.length >= 10 && rate >= targets.targetWeeklyWeightChangeMin && rate <= targets.targetWeeklyWeightChangeMax) {
      insights.push(`Your current rate matches your ${formatGoalType(targets.goalType)} target.`);
    }
  }

  if (protein.days > 0) insights.push(`Protein has reached its target on ${protein.hits} of the last ${protein.days} days.`);
  if (isFiniteNumber(sleep) && sleep < targets.sleepGoalHours) insights.push("Average sleep is below your goal.");
  if (isFiniteNumber(steps.delta) && steps.delta < 0) insights.push("Steps are lower than last week.");

  return insights.slice(0, 5);
}

export function formatGoalType(goalType) {
  return String(goalType || "custom").replace("-", " ");
}

function normalizeTargets(targets) {
  const goalType = ["lean-bulk", "maintenance", "cut", "custom"].includes(targets.goalType)
    ? targets.goalType
    : "lean-bulk";
  const range = goalType === "custom" ? [] : GOAL_RANGES[goalType];

  return {
    goalType,
    calorieTarget: clampNumber(targets.calorieTarget, 0, 20000, DEFAULT_TARGETS.calorieTarget),
    proteinTarget: clampNumber(targets.proteinTarget, 0, 1000, DEFAULT_TARGETS.proteinTarget),
    stepGoal: clampNumber(targets.stepGoal, 0, 100000, DEFAULT_TARGETS.stepGoal),
    sleepGoalHours: clampNumber(targets.sleepGoalHours, 0, 24, DEFAULT_TARGETS.sleepGoalHours),
    targetWeeklyWeightChangeMin: clampNumber(range[0] ?? targets.targetWeeklyWeightChangeMin, -10, 10, DEFAULT_TARGETS.targetWeeklyWeightChangeMin),
    targetWeeklyWeightChangeMax: clampNumber(range[1] ?? targets.targetWeeklyWeightChangeMax, -10, 10, DEFAULT_TARGETS.targetWeeklyWeightChangeMax),
    weightUnit: targets.weightUnit === "kg" ? "kg" : "lb",
  };
}

function normalizeCheckIn(entry) {
  const numericFields = [
    "morningWeight",
    "calories",
    "protein",
    "steps",
    "sleepHours",
    "sleepScore",
    "restingHeartRate",
    "energy",
    "hunger",
    "soreness",
    "stress",
    "activeMinutes",
    "workoutDurationMinutes",
  ];
  const next = {
    id: entry.id || `${entry.date || getTodayKey()}-checkin`,
    date: entry.date || getTodayKey(),
    notes: entry.notes || "",
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString(),
  };

  numericFields.forEach((field) => {
    const value = toOptionalNumber(entry[field]);
    if (value !== undefined) next[field] = ["energy", "hunger", "soreness", "stress"].includes(field)
      ? clampNumber(value, 1, 5, value)
      : value;
  });

  return next;
}

function syncProteinForCheckIn(entry) {
  if (!entry.date || !isFiniteNumber(entry.protein)) return;
  saveProteinLog({
    ...getProteinLog(),
    [entry.date]: Number(entry.protein || 0),
  });
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function toOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function joinFactors(factors) {
  if (factors.length <= 1) return factors[0] || "";
  return `${factors.slice(0, -1).join(", ")} and ${factors[factors.length - 1]}`;
}
