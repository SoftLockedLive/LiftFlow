import { getLiftSets, getWorkoutItems } from "./workoutAnalytics";
import {
  averageDaily,
  getCurrentRollingAverage,
  getPreviousRollingAverage,
  getWeightEntries,
  getWeeklyWeightChangeRate,
} from "./progressTracking";
import { getTodayKey } from "./protein";

const PHASES_KEY = "liftflow_progress_phases";
const REVIEWS_KEY = "liftflow_weekly_reviews";
const MEASUREMENTS_KEY = "liftflow_body_measurements";
const RECOMMENDATIONS_KEY = "liftflow_calorie_recommendations";
const TARGET_HISTORY_KEY = "liftflow_calorie_target_history";
const WEEK_START_KEY = "liftflow_week_start_day";
const TRACKED_LIFTS_KEY = "liftflow_relative_strength_lifts";

export const PHASE_TYPES = [
  { id: "lean-bulk", label: "Lean bulk", nutrition: true, defaults: [0.25, 0.5] },
  { id: "maintenance", label: "Maintenance", nutrition: true, defaults: [-0.25, 0.25] },
  { id: "mini-cut", label: "Mini cut", nutrition: true, defaults: [-1.25, -0.75] },
  { id: "full-cut", label: "Full cut", nutrition: true, defaults: [-1, -0.5] },
  { id: "strength-block", label: "Strength block", nutrition: false, defaults: [0, 0] },
  { id: "deload", label: "Deload", nutrition: false, defaults: [0, 0] },
  { id: "recomposition", label: "Recomposition", nutrition: true, defaults: [-0.25, 0.25] },
  { id: "custom", label: "Custom", nutrition: true, defaults: [0, 0] },
];

export const DEFAULT_MEASUREMENT_TYPES = [
  "Waist",
  "Chest",
  "Shoulders",
  "Left arm",
  "Right arm",
  "Hips",
  "Left thigh",
  "Right thigh",
  "Left calf",
  "Right calf",
  "Neck",
];

export const DEFAULT_TRACKED_LIFTS = ["Bench Press", "Squat", "Deadlift", "Overhead Press"];

export function getPhases() {
  if (typeof window === "undefined") return [];
  return readArray(PHASES_KEY).map(normalizePhase).sort(comparePhases);
}

export function savePhase(phase) {
  if (typeof window === "undefined") return [];
  const now = new Date().toISOString();
  const existing = getPhases();
  const incoming = normalizePhase({
    ...phase,
    id: phase.id || crypto.randomUUID(),
    createdAt: phase.createdAt || now,
    updatedAt: now,
  });
  const next = existing.map((item) => {
    if (item.id === incoming.id) return incoming;
    if (incoming.status === "active" && isNutritionPhase(incoming) && item.status === "active" && isNutritionPhase(item)) {
      return { ...item, status: "completed", actualEndDate: incoming.startDate, updatedAt: now };
    }
    return item;
  });
  if (!next.some((item) => item.id === incoming.id)) next.push(incoming);
  writeArray(PHASES_KEY, next.sort(comparePhases));
  return getPhases();
}

export function deletePhase(id) {
  const phase = getPhases().find((item) => item.id === id) || null;
  const next = getPhases().filter((item) => item.id !== id);
  writeArray(PHASES_KEY, next);
  return { phases: next, deleted: phase };
}

export function restorePhase(phase) {
  if (!phase) return getPhases();
  return savePhase(phase);
}

export function reorderPlannedPhase(id, direction) {
  const phases = getPhases();
  const planned = phases.filter((phase) => phase.status === "planned");
  const index = planned.findIndex((phase) => phase.id === id);
  const swapIndex = index + direction;
  if (index < 0 || swapIndex < 0 || swapIndex >= planned.length) return phases;
  const currentDate = planned[index].startDate;
  planned[index].startDate = planned[swapIndex].startDate;
  planned[swapIndex].startDate = currentDate;
  const byId = Object.fromEntries(planned.map((phase) => [phase.id, phase]));
  writeArray(PHASES_KEY, phases.map((phase) => byId[phase.id] || phase).sort(comparePhases));
  return getPhases();
}

export function getActivePhase(phases = getPhases(), nutritionOnly = true) {
  return (phases || []).find((phase) => phase.status === "active" && (!nutritionOnly || isNutritionPhase(phase))) || null;
}

export function buildPhaseTargets(baseTargets, activePhase) {
  if (!activePhase) return baseTargets;
  return {
    ...baseTargets,
    goalType: mapPhaseTypeToGoal(activePhase.type),
    calorieTarget: activePhase.currentCalorieTarget || baseTargets.calorieTarget,
    proteinTarget: activePhase.proteinTarget || baseTargets.proteinTarget,
    targetWeeklyWeightChangeMin: activePhase.targetWeeklyWeightChangeMin ?? baseTargets.targetWeeklyWeightChangeMin,
    targetWeeklyWeightChangeMax: activePhase.targetWeeklyWeightChangeMax ?? baseTargets.targetWeeklyWeightChangeMax,
  };
}

export function buildPhaseProgress(phase, checkIns) {
  if (!phase) return null;
  const weights = getWeightEntries(checkIns);
  const currentWeight = getCurrentRollingAverage(weights, 7) ?? weights[weights.length - 1]?.value ?? null;
  const startingWeight = phase.startingWeight ?? closestWeightOnOrBefore(weights, phase.startDate);
  const targetWeight = phase.targetWeight ?? null;
  const start = parseDate(phase.startDate);
  const end = parseDate(phase.actualEndDate || phase.plannedEndDate || getTodayKey());
  const today = parseDate(getTodayKey());
  const plannedEnd = parseDate(phase.plannedEndDate || getTodayKey());
  const totalDays = Math.max(1, daysBetween(start, plannedEnd) + 1);
  const daysCompleted = Math.max(0, Math.min(totalDays, daysBetween(start, today) + 1));
  const daysRemaining = Math.max(0, totalDays - daysCompleted);
  const weightChange = isNumber(currentWeight) && isNumber(startingWeight) ? round1(currentWeight - startingWeight) : null;
  const targetDelta = isNumber(targetWeight) && isNumber(startingWeight) ? targetWeight - startingWeight : null;
  const percent = targetDelta && isNumber(weightChange) ? Math.max(0, Math.min(100, Math.round((weightChange / targetDelta) * 100))) : null;
  const weeklyRate = calculatePhaseWeeklyRate(phase, checkIns);
  const completed = phase.status === "completed" ? daysBetween(start, end) + 1 : daysCompleted;

  return {
    currentWeight,
    startingWeight,
    targetWeight,
    weightChange,
    percent,
    daysCompleted: completed,
    daysRemaining,
    totalDays,
    weeklyRate,
    targetWeeklyRate: formatRateRange(phase.targetWeeklyWeightChangeMin, phase.targetWeeklyWeightChangeMax),
    projectedEndDate: projectPhaseEndDate(phase, currentWeight, weeklyRate),
    maintenanceInRange: isMaintenanceInRange(phase, weeklyRate),
  };
}

export function calculatePhaseWeeklyRate(phase, checkIns) {
  const entries = getWeightEntries(checkIns).filter((entry) => entry.date >= phase.startDate);
  if (entries.length < 2) return null;
  const first = entries[0];
  const last = entries[entries.length - 1];
  const days = Math.max(1, daysBetween(parseDate(first.date), parseDate(last.date)));
  return round1(((last.value - first.value) / days) * 7);
}

export function buildPhaseOverviewMessage(activePhase, checkIns) {
  if (!activePhase) return "Create your first phase to connect nutrition targets with bodyweight trends.";
  const progress = buildPhaseProgress(activePhase, checkIns);
  if (!isNumber(progress?.weeklyRate)) return "Insufficient data to compare your current rate.";
  if (activePhase.type === "maintenance" || activePhase.type === "recomposition") {
    return progress.maintenanceInRange
      ? "Your weight has been stable within the maintenance range."
      : "Your weight is drifting outside the selected maintenance range.";
  }
  if (progress.weeklyRate >= Number(activePhase.targetWeeklyWeightChangeMin ?? -999) && progress.weeklyRate <= Number(activePhase.targetWeeklyWeightChangeMax ?? 999)) {
    return `You are changing ${Math.abs(progress.weeklyRate)} lb per week, within your ${formatPhaseType(activePhase.type)} target.`;
  }
  if (progress.weeklyRate > Number(activePhase.targetWeeklyWeightChangeMax ?? 999)) return `${activePhase.name} is progressing faster than planned.`;
  return `${activePhase.name} is progressing slower than planned.`;
}

export function getWeekStartDay() {
  if (typeof window === "undefined") return 1;
  return Number(localStorage.getItem(WEEK_START_KEY) || 1);
}

export function saveWeekStartDay(day) {
  if (typeof window === "undefined") return 1;
  const value = Math.max(0, Math.min(6, Number(day || 1)));
  localStorage.setItem(WEEK_START_KEY, String(value));
  return value;
}

export function getWeeklyReviews() {
  if (typeof window === "undefined") return [];
  return readArray(REVIEWS_KEY).map(normalizeReview).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export function saveWeeklyReview(review) {
  if (typeof window === "undefined") return [];
  const now = new Date().toISOString();
  const existing = getWeeklyReviews();
  const previous = existing.find((item) => item.weekStart === review.weekStart);
  const nextReview = normalizeReview({
    ...previous,
    ...review,
    id: previous?.id || review.id || crypto.randomUUID(),
    createdAt: previous?.createdAt || review.createdAt || now,
    updatedAt: now,
  });
  const next = [nextReview, ...existing.filter((item) => item.weekStart !== review.weekStart)];
  writeArray(REVIEWS_KEY, next);
  return getWeeklyReviews();
}

export function generateWeeklyReview({ checkIns, workouts, phases, measurements, weekStartDay = 1, weekDate = getTodayKey() }) {
  const weekStart = getWeekStartForDate(weekDate, weekStartDay);
  const weekEnd = addDays(weekStart, 6);
  const current = filterByDate(checkIns, weekStart, weekEnd);
  const previous = filterByDate(checkIns, addDays(weekStart, -7), addDays(weekStart, -1));
  const activePhase = (phases || []).find((phase) => phase.startDate <= weekEnd && (phase.actualEndDate || phase.plannedEndDate || "9999-12-31") >= weekStart);
  const averageWeight = averageField(current, "morningWeight");
  const previousAverageWeight = averageField(previous, "morningWeight");
  const workoutsInWeek = (workouts || []).filter((workout) => dateKeyFromMs(workout.date) >= weekStart && dateKeyFromMs(workout.date) <= weekEnd);
  const measurementSummary = getMeasurementChanges(measurements, activePhase, "Waist");
  const completeness = scoreDataCompleteness(current, workoutsInWeek, measurements, weekStart, weekEnd);
  const summaryLines = buildWeeklySummaryLines({
    averageWeight,
    weightChange: isNumber(averageWeight) && isNumber(previousAverageWeight) ? round1(averageWeight - previousAverageWeight) : null,
    averageProtein: averageField(current, "protein"),
    proteinTarget: activePhase?.proteinTarget,
    averageSleep: averageField(current, "sleepHours"),
    sleepGoal: 8,
    waistChange: measurementSummary.phaseChange,
    daysLogged: current.length,
    completeness,
    phase: activePhase,
  });

  return normalizeReview({
    weekStart,
    weekEnd,
    phaseId: activePhase?.id,
    averageWeight,
    weightChange: isNumber(averageWeight) && isNumber(previousAverageWeight) ? round1(averageWeight - previousAverageWeight) : undefined,
    weeklyWeightRate: isNumber(averageWeight) && isNumber(previousAverageWeight) ? round1(averageWeight - previousAverageWeight) : undefined,
    averageCalories: averageField(current, "calories"),
    averageProtein: averageField(current, "protein"),
    proteinAdherencePercent: adherencePercent(current, "protein", activePhase?.proteinTarget),
    calorieAdherencePercent: adherencePercent(current, "calories", activePhase?.currentCalorieTarget),
    averageSteps: averageField(current, "steps"),
    averageSleepHours: averageField(current, "sleepHours"),
    averageRestingHeartRate: averageField(current, "restingHeartRate"),
    averageEnergy: averageField(current, "energy"),
    averageSoreness: averageField(current, "soreness"),
    averageStress: averageField(current, "stress"),
    workoutsCompleted: workoutsInWeek.length,
    totalWorkoutMinutes: current.reduce((sum, entry) => sum + Number(entry.workoutDurationMinutes || 0), 0),
    strengthPrs: workoutsInWeek.flatMap((workout) => workout.prs || []).map((pr) => `${pr.exercise} ${pr.weight} lb`),
    dataCompleteness: completeness.score,
    confidence: completeness.confidence,
    summary: summaryLines.join(" "),
  });
}

export function scoreDataCompleteness(checkIns, workouts, measurements, weekStart, weekEnd) {
  const count = (field) => (checkIns || []).filter((entry) => entry[field] !== undefined).length;
  const measurementCount = (measurements || []).filter((entry) => entry.date >= weekStart && entry.date <= weekEnd).length;
  const weighted =
    Math.min(7, count("morningWeight")) * 2 +
    Math.min(7, count("calories")) * 2 +
    Math.min(7, count("protein")) * 2 +
    Math.min(4, (workouts || []).length) * 2 +
    Math.min(7, count("steps")) +
    Math.min(7, count("sleepHours")) +
    Math.min(7, count("energy")) * 0.5 +
    Math.min(2, measurementCount);
  const score = Math.round((weighted / 57.5) * 100);
  const label = score >= 80 ? "Complete" : score >= 60 ? "Mostly complete" : score >= 35 ? "Partial" : "Limited data";
  const confidence = score >= 75 ? "high" : score >= 45 ? "moderate" : "limited";
  return { score, label, confidence };
}

export function getCalorieRecommendations() {
  if (typeof window === "undefined") return [];
  return readArray(RECOMMENDATIONS_KEY).map(normalizeRecommendation).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveCalorieRecommendation(recommendation) {
  if (typeof window === "undefined") return [];
  const existing = getCalorieRecommendations();
  const next = normalizeRecommendation({
    ...recommendation,
    id: recommendation.id || crypto.randomUUID(),
    createdAt: recommendation.createdAt || new Date().toISOString(),
  });
  writeArray(RECOMMENDATIONS_KEY, [next, ...existing.filter((item) => item.id !== next.id)]);
  return getCalorieRecommendations();
}

export function buildCalorieRecommendation(activePhase, checkIns, recommendations) {
  if (!activePhase || !isNutritionPhase(activePhase)) return baseRecommendation("insufficient-data", "Create or start a nutrition phase before calorie recommendations are available.");
  const weights = getWeightEntries(checkIns).filter((entry) => entry.date >= activePhase.startDate);
  const calories = (checkIns || []).filter((entry) => entry.date >= activePhase.startDate && isNumber(entry.calories));
  const daysActive = daysBetween(parseDate(activePhase.startDate), parseDate(getTodayKey())) + 1;
  const lastApplied = (recommendations || []).find((item) => item.phaseId === activePhase.id && item.status === "applied");
  if (weights.length < 10) return baseRecommendation("insufficient-data", "Log at least 10 weight entries before calorie recommendations are available.", activePhase);
  if (calories.slice(-10).length < 7) return baseRecommendation("insufficient-data", "Log at least 7 recent calorie entries before adjusting calories.", activePhase);
  if (daysActive < 10) return baseRecommendation("insufficient-data", "This phase needs at least 10 days of data first.", activePhase);
  if (lastApplied && daysBetween(parseDate(lastApplied.appliedAt || lastApplied.createdAt), parseDate(getTodayKey())) < 7) {
    return baseRecommendation("unstable-data", "Wait at least 7 days after applying a calorie change before generating another one.", activePhase);
  }
  const recentCalories = calories.slice(-10).map((entry) => Number(entry.calories));
  const averageCalories = round1(recentCalories.reduce((sum, value) => sum + value, 0) / recentCalories.length);
  const calorieSpread = Math.max(...recentCalories) - Math.min(...recentCalories);
  if (calorieSpread > 900) return baseRecommendation("unstable-data", "Average intake is inconsistent, so no calorie adjustment is recommended yet.", activePhase);
  const weeklyRate = getWeeklyWeightChangeRate(weights);
  if (!isNumber(weeklyRate)) return baseRecommendation("insufficient-data", "More weight trend data is needed.", activePhase);
  if ((activePhase.notes || "").toLowerCase().includes("illness") || (activePhase.notes || "").toLowerCase().includes("sick")) {
    return baseRecommendation("unstable-data", "Recent illness notes may distort the trend.", activePhase);
  }
  const min = Number(activePhase.targetWeeklyWeightChangeMin ?? 0);
  const max = Number(activePhase.targetWeeklyWeightChangeMax ?? 0);
  if ((activePhase.type === "maintenance" || activePhase.type === "recomposition") && weeklyRate >= min && weeklyRate <= max) {
    return baseRecommendation("keep", "You remain within the maintenance range. Keep calories unchanged.", activePhase, 0, "high", averageCalories, weeklyRate);
  }
  let adjustment = 0;
  let reason = "Weight is changing within your target range. Keep calories unchanged.";
  if (weeklyRate < min) {
    adjustment = activePhase.type.includes("cut") ? -100 : 150;
    reason = activePhase.type.includes("cut")
      ? "Weight is dropping slower than planned during your cut. Consider reducing calories by 100."
      : "Weight is not increasing fast enough for this phase. Consider adding 150 calories.";
  } else if (weeklyRate > max) {
    adjustment = activePhase.type.includes("cut") ? 150 : -100;
    reason = activePhase.type.includes("cut")
      ? "Weight is dropping too quickly during your cut. Consider adding 150 calories."
      : "Weight is increasing faster than planned. Consider reducing calories by 100.";
  }
  adjustment = Math.max(-200, Math.min(200, adjustment));
  return baseRecommendation(adjustment > 0 ? "increase" : adjustment < 0 ? "decrease" : "keep", reason, activePhase, adjustment, "moderate", averageCalories, weeklyRate);
}

export function applyCalorieRecommendation(recommendation, phase) {
  if (!recommendation || !phase || !recommendation.adjustment) return getPhases();
  const previousTarget = Number(phase.currentCalorieTarget || recommendation.currentTarget || 0);
  const nextTarget = previousTarget + Number(recommendation.adjustment || 0);
  saveCalorieTargetHistory({
    phaseId: phase.id,
    previousTarget,
    newTarget: nextTarget,
    source: "recommendation",
    reason: recommendation.reason,
  });
  saveCalorieRecommendation({ ...recommendation, status: "applied", appliedAt: new Date().toISOString() });
  return savePhase({ ...phase, currentCalorieTarget: nextTarget });
}

export function getCalorieTargetHistory() {
  if (typeof window === "undefined") return [];
  return readArray(TARGET_HISTORY_KEY).sort((a, b) => b.date.localeCompare(a.date));
}

export function saveCalorieTargetHistory(entry) {
  if (typeof window === "undefined") return [];
  const next = {
    id: entry.id || crypto.randomUUID(),
    date: entry.date || getTodayKey(),
    previousTarget: optionalNumber(entry.previousTarget),
    newTarget: Number(entry.newTarget || 0),
    phaseId: entry.phaseId || "",
    source: entry.source || "user-edit",
    reason: entry.reason || "",
  };
  writeArray(TARGET_HISTORY_KEY, [next, ...getCalorieTargetHistory()]);
  return getCalorieTargetHistory();
}

export function getBodyMeasurements() {
  if (typeof window === "undefined") return [];
  return readArray(MEASUREMENTS_KEY).map(normalizeMeasurement).sort((a, b) => a.date.localeCompare(b.date));
}

export function saveBodyMeasurement(entry) {
  if (typeof window === "undefined") return [];
  const now = new Date().toISOString();
  const existing = getBodyMeasurements();
  const nextEntry = normalizeMeasurement({
    ...entry,
    id: entry.id || crypto.randomUUID(),
    createdAt: entry.createdAt || now,
    updatedAt: now,
  });
  writeArray(MEASUREMENTS_KEY, [...existing.filter((item) => item.id !== nextEntry.id), nextEntry].sort((a, b) => a.date.localeCompare(b.date)));
  return getBodyMeasurements();
}

export function deleteBodyMeasurement(id) {
  const existing = getBodyMeasurements();
  const deleted = existing.find((entry) => entry.id === id) || null;
  const next = existing.filter((entry) => entry.id !== id);
  writeArray(MEASUREMENTS_KEY, next);
  return { measurements: next, deleted };
}

export function getMeasurementChanges(measurements, phase, type = "Waist") {
  const entries = (measurements || []).filter((entry) => isNumber(entry.measurements?.[type])).sort((a, b) => a.date.localeCompare(b.date));
  const latest = entries[entries.length - 1] || null;
  const previous = entries[entries.length - 2] || null;
  const monthStart = addDays(getTodayKey(), -30);
  const monthBase = entries.find((entry) => entry.date >= monthStart) || entries[0] || null;
  const phaseBase = phase ? entries.find((entry) => entry.date >= phase.startDate) : null;
  return {
    latest: latest?.measurements?.[type] ?? null,
    previousChange: latest && previous ? round1(latest.measurements[type] - previous.measurements[type]) : null,
    monthChange: latest && monthBase ? round1(latest.measurements[type] - monthBase.measurements[type]) : null,
    phaseChange: latest && phaseBase ? round1(latest.measurements[type] - phaseBase.measurements[type]) : null,
  };
}

export function getTrackedLifts() {
  if (typeof window === "undefined") return DEFAULT_TRACKED_LIFTS;
  const saved = readArray(TRACKED_LIFTS_KEY);
  return saved.length ? saved : DEFAULT_TRACKED_LIFTS;
}

export function saveTrackedLifts(lifts) {
  if (typeof window === "undefined") return DEFAULT_TRACKED_LIFTS;
  const next = Array.from(new Set((lifts || []).map((lift) => String(lift || "").trim()).filter(Boolean)));
  writeArray(TRACKED_LIFTS_KEY, next);
  return next;
}

export function buildRelativeStrength(workouts, checkIns, trackedLifts = DEFAULT_TRACKED_LIFTS, activePhase = null, prRecords = []) {
  const weights = getWeightEntries(checkIns);
  const latestBodyweight = weights[weights.length - 1]?.value || null;
  return trackedLifts.map((liftName) => {
    const sets = [];
    (workouts || []).forEach((session, sessionIndex) => {
      const date = dateKeyFromMs(session.date || Date.now());
      getWorkoutItems(session).forEach((lift) => {
        if (!sameLift(lift.exercise, liftName)) return;
        getLiftSets(lift).forEach((set, setIndex) => {
          const weight = Number(set.weight || 0);
          const reps = Number(set.reps || 0);
          if (!weight || !reps) return;
          const bodyweight = closestBodyweight(weights, date);
          const estimated1rm = estimate1rm(weight, reps);
          sets.push({
            id: `${session.id || sessionIndex}-${liftName}-${setIndex}`,
            date,
            lift: liftName,
            weight,
            reps,
            estimated1rm,
            bodyweight: bodyweight.value,
            estimatedBodyweight: bodyweight.estimated,
            ratio: bodyweight.value ? round2(weight / bodyweight.value) : null,
            e1rmRatio: bodyweight.value ? round2(estimated1rm / bodyweight.value) : null,
          });
        });
      });
    });
    const sorted = sets.sort((a, b) => a.date.localeCompare(b.date));
    const bestLift = [...sorted].sort((a, b) => b.weight - a.weight)[0] || null;
    const best1rm = [...sorted].sort((a, b) => b.estimated1rm - a.estimated1rm)[0] || null;
    const bestRatio = [...sorted].filter((set) => isNumber(set.e1rmRatio)).sort((a, b) => b.e1rmRatio - a.e1rmRatio)[0] || null;
    const manualPr = (prRecords || []).find((pr) => pr.source === "manual" && sameLift(pr.exercise, liftName));
    const manualWeight = Number(manualPr?.weight || 0);
    const manualReps = Number(manualPr?.reps || 1) || 1;
    const manualEstimated1rm = manualWeight ? estimate1rm(manualWeight, manualReps) : 0;
    const manualBest = manualWeight
      ? {
          id: `manual-${liftName}`,
          date: getTodayKey(),
          lift: liftName,
          weight: manualWeight,
          reps: manualReps,
          estimated1rm: manualEstimated1rm,
          bodyweight: latestBodyweight,
          estimatedBodyweight: false,
          ratio: latestBodyweight ? round2(manualWeight / latestBodyweight) : null,
          e1rmRatio: latestBodyweight ? round2(manualEstimated1rm / latestBodyweight) : null,
          source: "manual",
        }
      : null;
    const currentBest = manualBest || bestLift;
    const currentEstimated1rm = manualBest || best1rm;
    const currentBestRatio = manualBest?.e1rmRatio ? manualBest : bestRatio;
    const monthStart = addDays(getTodayKey(), -30);
    const monthBase = sorted.find((set) => set.date >= monthStart);
    const phaseBase = activePhase ? sorted.find((set) => set.date >= activePhase.startDate) : null;
    return {
      lift: liftName,
      currentBest,
      currentEstimated1rm,
      bestRatio: currentBestRatio,
      monthChange: currentEstimated1rm && monthBase ? round1(currentEstimated1rm.estimated1rm - monthBase.estimated1rm) : null,
      phaseRatioChange: currentBestRatio && phaseBase?.e1rmRatio ? round2(currentBestRatio.e1rmRatio - phaseBase.e1rmRatio) : null,
      entries: sorted,
    };
  });
}

export function buildPhaseCompletionSummary(phase, checkIns, workouts, measurements, relativeStrength) {
  const progress = buildPhaseProgress(phase, checkIns);
  const inPhase = (checkIns || []).filter((entry) => entry.date >= phase.startDate && entry.date <= (phase.actualEndDate || getTodayKey()));
  return {
    startDate: phase.startDate,
    endDate: phase.actualEndDate || getTodayKey(),
    startingWeight: progress?.startingWeight,
    endingWeight: progress?.currentWeight,
    totalWeightChange: progress?.weightChange,
    averageWeeklyWeightChange: progress?.weeklyRate,
    startingCalorieTarget: phase.startingCalorieTarget,
    endingCalorieTarget: phase.currentCalorieTarget,
    averageCalories: averageDaily(inPhase, "calories", inPhase.length || 7),
    averageProtein: averageDaily(inPhase, "protein", inPhase.length || 7),
    waistChange: getMeasurementChanges(measurements, phase, "Waist").phaseChange,
    workoutsCompleted: (workouts || []).filter((workout) => dateKeyFromMs(workout.date) >= phase.startDate && dateKeyFromMs(workout.date) <= (phase.actualEndDate || getTodayKey())).length,
    averageSleep: averageDaily(inPhase, "sleepHours", inPhase.length || 7),
    relativeStrengthChanges: (relativeStrength || []).map((item) => `${item.lift}: ${item.phaseRatioChange ?? "--"}x`),
  };
}

export function formatPhaseType(type) {
  return PHASE_TYPES.find((phase) => phase.id === type)?.label || "Custom";
}

function normalizePhase(phase) {
  const type = PHASE_TYPES.some((item) => item.id === phase.type) ? phase.type : "lean-bulk";
  const defaults = PHASE_TYPES.find((item) => item.id === type)?.defaults || [0, 0];
  const startDate = phase.startDate || getTodayKey();
  return {
    id: phase.id || `${startDate}-${type}`,
    name: phase.name || formatPhaseType(type),
    type,
    status: ["planned", "active", "completed", "cancelled"].includes(phase.status) ? phase.status : "planned",
    startDate,
    plannedEndDate: phase.plannedEndDate || addDays(startDate, 55),
    actualEndDate: phase.actualEndDate || "",
    startingWeight: optionalNumber(phase.startingWeight),
    targetWeight: optionalNumber(phase.targetWeight),
    endingWeight: optionalNumber(phase.endingWeight),
    startingCalorieTarget: optionalNumber(phase.startingCalorieTarget),
    currentCalorieTarget: optionalNumber(phase.currentCalorieTarget),
    proteinTarget: optionalNumber(phase.proteinTarget),
    targetWeeklyWeightChangeMin: optionalNumber(phase.targetWeeklyWeightChangeMin) ?? defaults[0],
    targetWeeklyWeightChangeMax: optionalNumber(phase.targetWeeklyWeightChangeMax) ?? defaults[1],
    notes: phase.notes || "",
    createdAt: phase.createdAt || new Date().toISOString(),
    updatedAt: phase.updatedAt || new Date().toISOString(),
  };
}

function normalizeReview(review) {
  return {
    id: review.id || `${review.weekStart}-review`,
    weekStart: review.weekStart,
    weekEnd: review.weekEnd,
    phaseId: review.phaseId || "",
    averageWeight: optionalNumber(review.averageWeight),
    weightChange: optionalNumber(review.weightChange),
    weeklyWeightRate: optionalNumber(review.weeklyWeightRate),
    averageCalories: optionalNumber(review.averageCalories),
    averageProtein: optionalNumber(review.averageProtein),
    proteinAdherencePercent: optionalNumber(review.proteinAdherencePercent),
    calorieAdherencePercent: optionalNumber(review.calorieAdherencePercent),
    averageSteps: optionalNumber(review.averageSteps),
    averageSleepHours: optionalNumber(review.averageSleepHours),
    averageRestingHeartRate: optionalNumber(review.averageRestingHeartRate),
    averageEnergy: optionalNumber(review.averageEnergy),
    averageSoreness: optionalNumber(review.averageSoreness),
    averageStress: optionalNumber(review.averageStress),
    workoutsCompleted: optionalNumber(review.workoutsCompleted),
    totalWorkoutMinutes: optionalNumber(review.totalWorkoutMinutes),
    strengthPrs: Array.isArray(review.strengthPrs) ? review.strengthPrs : [],
    dataCompleteness: optionalNumber(review.dataCompleteness),
    confidence: ["high", "moderate", "limited"].includes(review.confidence) ? review.confidence : "limited",
    summary: review.summary || "",
    userNotes: review.userNotes || "",
    createdAt: review.createdAt || new Date().toISOString(),
    updatedAt: review.updatedAt || new Date().toISOString(),
  };
}

function normalizeMeasurement(entry) {
  const measurements = {};
  Object.entries(entry.measurements || {}).forEach(([key, value]) => {
    if (isNumber(value)) measurements[key] = Number(value);
  });
  return {
    id: entry.id || crypto.randomUUID(),
    date: entry.date || getTodayKey(),
    measurements,
    unit: entry.unit === "cm" ? "cm" : "in",
    bodyweight: optionalNumber(entry.bodyweight),
    phaseId: entry.phaseId || "",
    notes: entry.notes || "",
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString(),
  };
}

function normalizeRecommendation(recommendation) {
  return {
    id: recommendation.id || crypto.randomUUID(),
    phaseId: recommendation.phaseId || "",
    createdAt: recommendation.createdAt || new Date().toISOString(),
    currentTarget: Number(recommendation.currentTarget || 0),
    recommendedTarget: optionalNumber(recommendation.recommendedTarget),
    adjustment: optionalNumber(recommendation.adjustment),
    outcome: ["keep", "increase", "decrease", "insufficient-data", "unstable-data"].includes(recommendation.outcome) ? recommendation.outcome : "insufficient-data",
    reason: recommendation.reason || "",
    confidence: ["high", "moderate", "low"].includes(recommendation.confidence) ? recommendation.confidence : "low",
    status: ["pending", "applied", "dismissed", "snoozed"].includes(recommendation.status) ? recommendation.status : "pending",
    appliedAt: recommendation.appliedAt || "",
  };
}

function baseRecommendation(outcome, reason, phase = null, adjustment = 0, confidence = "low", averageCalories = null, weeklyRate = null) {
  const currentTarget = Number(phase?.currentCalorieTarget || 0);
  return normalizeRecommendation({
    phaseId: phase?.id || "",
    currentTarget,
    recommendedTarget: adjustment ? currentTarget + adjustment : currentTarget,
    adjustment,
    outcome,
    reason,
    confidence,
    status: "pending",
    averageCalories,
    weeklyRate,
  });
}

function readArray(key) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray(key, value) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
}

function comparePhases(a, b) {
  if (a.status === "active" && b.status !== "active") return -1;
  if (b.status === "active" && a.status !== "active") return 1;
  return String(a.startDate).localeCompare(String(b.startDate));
}

function isNutritionPhase(phase) {
  return PHASE_TYPES.find((item) => item.id === phase.type)?.nutrition !== false;
}

function mapPhaseTypeToGoal(type) {
  if (type === "full-cut" || type === "mini-cut") return "cut";
  if (type === "maintenance" || type === "recomposition") return "maintenance";
  return type === "lean-bulk" ? "lean-bulk" : "custom";
}

function isMaintenanceInRange(phase, weeklyRate) {
  if (!isNumber(weeklyRate)) return false;
  return weeklyRate >= Number(phase.targetWeeklyWeightChangeMin ?? -0.25) && weeklyRate <= Number(phase.targetWeeklyWeightChangeMax ?? 0.25);
}

function projectPhaseEndDate(phase, currentWeight, weeklyRate) {
  if (!isNumber(currentWeight) || !isNumber(weeklyRate) || !isNumber(phase.targetWeight) || weeklyRate === 0) return phase.plannedEndDate || "";
  const weeksRemaining = (Number(phase.targetWeight) - currentWeight) / weeklyRate;
  if (!Number.isFinite(weeksRemaining) || weeksRemaining < 0) return phase.plannedEndDate || "";
  return addDays(getTodayKey(), Math.round(weeksRemaining * 7));
}

function formatRateRange(min, max) {
  if (!isNumber(min) || !isNumber(max)) return "--";
  return `${min > 0 ? "+" : ""}${min} to ${max > 0 ? "+" : ""}${max} lb/wk`;
}

function closestWeightOnOrBefore(weights, date) {
  const before = [...weights].filter((entry) => entry.date <= date).pop();
  return before?.value ?? weights[weights.length - 1]?.value ?? null;
}

function closestBodyweight(weights, date) {
  if (!weights.length) return { value: null, estimated: true };
  const target = parseDate(date).getTime();
  const closest = [...weights].sort((a, b) => Math.abs(parseDate(a.date).getTime() - target) - Math.abs(parseDate(b.date).getTime() - target))[0];
  const diffDays = Math.abs(daysBetween(parseDate(closest.date), parseDate(date)));
  return { value: closest.value, estimated: diffDays > 7 };
}

function getWeekStartForDate(dateKey, weekStartDay) {
  const date = parseDate(dateKey);
  const diff = (date.getDay() - Number(weekStartDay || 0) + 7) % 7;
  return addDays(toDateKey(date), -diff);
}

function filterByDate(items, start, end) {
  return (items || []).filter((item) => item.date >= start && item.date <= end);
}

function averageField(items, field) {
  const values = (items || []).map((item) => item[field]).filter(isNumber).map(Number);
  return values.length ? round1(values.reduce((sum, value) => sum + value, 0) / values.length) : undefined;
}

function adherencePercent(items, field, target) {
  if (!target) return undefined;
  const logged = (items || []).filter((item) => isNumber(item[field]));
  if (!logged.length) return undefined;
  return Math.round((logged.filter((item) => Number(item[field]) >= Number(target)).length / logged.length) * 100);
}

function buildWeeklySummaryLines(review) {
  const lines = [];
  if (isNumber(review.weightChange)) lines.push(`Your average weight ${review.weightChange >= 0 ? "increased" : "decreased"} ${Math.abs(review.weightChange)} lb.`);
  if (isNumber(review.averageProtein) && review.proteinTarget) lines.push(`Protein averaged ${review.averageProtein}g against a ${review.proteinTarget}g target.`);
  if (isNumber(review.averageSleep) && review.averageSleep < review.sleepGoal) lines.push(`Sleep averaged ${review.averageSleep} hours, below your ${review.sleepGoal}-hour goal.`);
  if (isNumber(review.waistChange)) lines.push(`Waist changed ${review.waistChange > 0 ? "+" : ""}${review.waistChange}.`);
  if (review.daysLogged < 4) lines.push("Only a few days were logged, so this review has limited confidence.");
  if (review.phase && isNumber(review.weightChange) && review.weightChange >= Number(review.phase.targetWeeklyWeightChangeMin ?? -999) && review.weightChange <= Number(review.phase.targetWeeklyWeightChangeMax ?? 999)) {
    lines.push(`That matches your ${formatPhaseType(review.phase.type)} target.`);
  }
  lines.push(`Data confidence: ${review.completeness.label}.`);
  return lines;
}

function sameLift(exercise, target) {
  const source = String(exercise || "").toLowerCase();
  const wanted = String(target || "").toLowerCase();
  if (!source || !wanted) return false;
  if (wanted === "bench press") return source.includes("bench");
  if (wanted === "overhead press") return source.includes("overhead") || source.includes("shoulder press");
  return source.includes(wanted.replace(" press", ""));
}

function estimate1rm(weight, reps) {
  return Math.round(Number(weight || 0) * (1 + Number(reps || 0) / 30));
}

function parseDate(dateKey) {
  const [year, month, day] = String(dateKey || getTodayKey()).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(dateKey, days) {
  const date = parseDate(dateKey);
  date.setDate(date.getDate() + Number(days || 0));
  return toDateKey(date);
}

function daysBetween(start, end) {
  return Math.round((parseDate(toDateKey(end)).getTime() - parseDate(toDateKey(start)).getTime()) / 86400000);
}

function dateKeyFromMs(value) {
  const date = new Date(value || Date.now());
  return toDateKey(date);
}

function optionalNumber(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function isNumber(value) {
  return Number.isFinite(Number(value));
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
