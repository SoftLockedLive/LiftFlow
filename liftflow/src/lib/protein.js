const KEY = "liftflow_protein";
const TARGET_KEY = "liftflow_protein_target";

export function getProteinTarget() {
  if (typeof window === "undefined") return 160;
  return Number(localStorage.getItem(TARGET_KEY) || 160);
}

export function saveProteinTarget(target) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TARGET_KEY, String(Number(target) || 0));
}

export function getProteinLog() {
  if (typeof window === "undefined") return {};
  return JSON.parse(localStorage.getItem(KEY) || "{}");
}

export function saveProteinLog(log) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(log));
}

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addProtein(amount, dateKey = getTodayKey()) {
  const log = getProteinLog();
  const current = Number(log[dateKey] || 0);
  const updated = {
    ...log,
    [dateKey]: Math.max(0, current + Number(amount || 0)),
  };

  saveProteinLog(updated);
  return updated;
}

export function setProteinForDay(amount, dateKey = getTodayKey()) {
  const log = getProteinLog();
  const updated = {
    ...log,
    [dateKey]: Math.max(0, Number(amount || 0)),
  };

  saveProteinLog(updated);
  return updated;
}

export function getProteinSummary(log = getProteinLog(), target = getProteinTarget()) {
  const todayKey = getTodayKey();
  const today = Number(log[todayKey] || 0);

  return {
    today,
    target,
    remaining: Math.max(0, target - today),
    percent: target > 0 ? Math.min(100, Math.round((today / target) * 100)) : 0,
    streak: calculateProteinStreak(log, target),
  };
}

function calculateProteinStreak(log, target) {
  if (!target) return 0;

  let streak = 0;
  const cursor = new Date();

  for (let i = 0; i < 365; i += 1) {
    const key = getTodayKey(cursor);
    if (Number(log[key] || 0) < target) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
