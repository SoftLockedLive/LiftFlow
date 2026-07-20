import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import ConfirmDialog from "../components/ConfirmDialog";
import { getProfile } from "../lib/profile";
import {
  averageDaily,
  buildInsights,
  buildRecoverySummary,
  compareWeeks,
  deleteDailyCheckIn,
  formatGoalType,
  getCurrentRollingAverage,
  getDailyCheckIns,
  getPreviousRollingAverage,
  getProgressTargets,
  getProteinAdherence,
  getRangeEntries,
  getWeightEntries,
  getWeeklyWeightChangeRate,
  restoreDailyCheckIn,
  rollingAverage,
  saveDailyCheckIn,
  saveProgressTargets,
} from "../lib/progressTracking";
import {
  DEFAULT_MEASUREMENT_TYPES,
  DEFAULT_TRACKED_LIFTS,
  PHASE_TYPES,
  applyCalorieRecommendation,
  buildCalorieRecommendation,
  buildPhaseCompletionSummary,
  buildPhaseOverviewMessage,
  buildPhaseProgress,
  buildPhaseTargets,
  buildRelativeStrength,
  deleteBodyMeasurement,
  deletePhase,
  formatPhaseType,
  generateWeeklyReview,
  getActivePhase,
  getBodyMeasurements,
  getCalorieRecommendations,
  getCalorieTargetHistory,
  getMeasurementChanges,
  getPhases,
  getTrackedLifts,
  getWeekStartDay,
  getWeeklyReviews,
  reorderPlannedPhase,
  restorePhase,
  saveBodyMeasurement,
  saveCalorieRecommendation,
  saveCalorieTargetHistory,
  savePhase,
  saveTrackedLifts,
  saveWeekStartDay,
  saveWeeklyReview,
} from "../lib/progressPhase2";
import { getTodayKey } from "../lib/protein";
import { addNote } from "../lib/notes";
import { getManualPRs } from "../lib/manualPRs";
import { buildPRRecords } from "../lib/prRecords";
import { getWorkouts } from "../lib/workoutStorage";
import { buildProgressData } from "../lib/workoutAnalytics";

const ACCENT = "#21d9ff";
const YELLOW = "#efff38";
const GREEN = "#43f08d";
const ORANGE = "#ffb238";
const RED = "#ff7047";
const SECTIONS = ["Overview", "Strength", "Body", "Phases"];
const RANGE_OPTIONS = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "3M", value: "90" },
  { label: "All", value: "all" },
];
const EMPTY_FORM = {
  date: "",
  morningWeight: "",
  calories: "",
  protein: "",
  steps: "",
  sleepHours: "",
  sleepScore: "",
  restingHeartRate: "",
  energy: "",
  hunger: "",
  soreness: "",
  stress: "",
  activeMinutes: "",
  workoutDurationMinutes: "",
  notes: "",
};
const EMPTY_PHASE_FORM = {
  id: "",
  name: "",
  type: "lean-bulk",
  status: "planned",
  startDate: "",
  plannedEndDate: "",
  actualEndDate: "",
  startingWeight: "",
  targetWeight: "",
  endingWeight: "",
  startingCalorieTarget: "",
  currentCalorieTarget: "",
  proteinTarget: "",
  targetWeeklyWeightChangeMin: "",
  targetWeeklyWeightChangeMax: "",
  notes: "",
};

export default function Progress() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState([]);
  const [manualPrs, setManualPrs] = useState([]);
  const [profile, setProfile] = useState({});
  const [checkIns, setCheckIns] = useState([]);
  const [targets, setTargets] = useState(null);
  const [activeSection, setActiveSection] = useState("Overview");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletedEntry, setDeletedEntry] = useState(null);
  const [chartRange, setChartRange] = useState("30");
  const [targetDraft, setTargetDraft] = useState(null);
  const [phases, setPhases] = useState([]);
  const [phaseForm, setPhaseForm] = useState(EMPTY_PHASE_FORM);
  const [expandedPhaseId, setExpandedPhaseId] = useState("");
  const [pendingPhaseDelete, setPendingPhaseDelete] = useState(null);
  const [deletedPhase, setDeletedPhase] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [measurementForm, setMeasurementForm] = useState(createMeasurementForm());
  const [pendingMeasurementDelete, setPendingMeasurementDelete] = useState(null);
  const [deletedMeasurement, setDeletedMeasurement] = useState(null);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [weekStartDay, setWeekStartDay] = useState(1);
  const [recommendations, setRecommendations] = useState([]);
  const [targetHistory, setTargetHistory] = useState([]);
  const [trackedLifts, setTrackedLifts] = useState(DEFAULT_TRACKED_LIFTS);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedTargets = getProgressTargets();
      const savedCheckIns = getDailyCheckIns();
      const today = getTodayKey();
      const todayEntry = savedCheckIns.find((entry) => entry.date === today);

      setWorkouts(getWorkouts());
      setManualPrs(getManualPRs());
      setProfile(getProfile());
      setTargets(savedTargets);
      setTargetDraft(savedTargets);
      setCheckIns(savedCheckIns);
      setForm(toForm(todayEntry || { date: today }));
      setEditingId(todayEntry?.id || "");
      setPhases(getPhases());
      setMeasurements(getBodyMeasurements());
      setWeeklyReviews(getWeeklyReviews());
      setWeekStartDay(getWeekStartDay());
      setRecommendations(getCalorieRecommendations());
      setTargetHistory(getCalorieTargetHistory());
      setTrackedLifts(getTrackedLifts());
      if (window.location.search.includes("checkIn=1")) {
        setActiveSection("Body");
        window.setTimeout(() => document.getElementById("daily-check-in")?.scrollIntoView({ behavior: "smooth" }), 0);
        router.replace("/progress", undefined, { shallow: true, scroll: false });
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router]);

  const strengthData = useMemo(() => buildProgressData(workouts), [workouts]);
  const strengthPrRecords = useMemo(() => buildPRRecords(workouts, manualPrs), [workouts, manualPrs]);
  const strengthBest = useMemo(() => buildExerciseBestFromPRs(strengthPrRecords), [strengthPrRecords]);
  const strengthDisplayData = useMemo(
    () => ({ ...strengthData, exerciseBest: strengthBest }),
    [strengthData, strengthBest]
  );
  const goals = useMemo(() => buildGoals(profile, strengthBest), [profile, strengthBest]);
  const strengthTrend = useMemo(() => buildTrend(strengthData.sessions), [strengthData.sessions]);
  const activePhase = useMemo(() => getActivePhase(phases), [phases]);
  const activeTargets = useMemo(() => buildPhaseTargets(targets || targetDraft || {}, activePhase), [targets, targetDraft, activePhase]);
  const weights = useMemo(() => getWeightEntries(checkIns), [checkIns]);
  const currentAverage = useMemo(() => getCurrentRollingAverage(weights, 7), [weights]);
  const previousAverage = useMemo(() => getPreviousRollingAverage(weights, 7), [weights]);
  const weeklyRate = useMemo(() => getWeeklyWeightChangeRate(weights), [weights]);
  const rangedWeights = useMemo(() => getRangeEntries(weights, chartRange), [weights, chartRange]);
  const rangedAverage = useMemo(() => rollingAverage(rangedWeights, 7), [rangedWeights]);
  const todayEntry = checkIns.find((entry) => entry.date === getTodayKey()) || null;
  const latestEntry = checkIns[checkIns.length - 1] || null;
  const recovery = useMemo(() => buildRecoverySummary(checkIns, activeTargets), [checkIns, activeTargets]);
  const insights = useMemo(() => buildInsights(checkIns, activeTargets), [checkIns, activeTargets]);
  const proteinAdherence = useMemo(
    () => getProteinAdherence(checkIns, Number(activeTargets.proteinTarget || 0), 7),
    [checkIns, activeTargets.proteinTarget]
  );
  const stepsWeek = useMemo(() => compareWeeks(checkIns, "steps"), [checkIns]);
  const workoutDurationToday = useMemo(() => getWorkoutMinutesForDate(workouts, form.date || getTodayKey()), [workouts, form.date]);
  const phaseProgress = useMemo(() => buildPhaseProgress(activePhase, checkIns), [activePhase, checkIns]);
  const phaseMessage = useMemo(() => buildPhaseOverviewMessage(activePhase, checkIns), [activePhase, checkIns]);
  const relativeStrength = useMemo(
    () => buildRelativeStrength(workouts, checkIns, trackedLifts, activePhase, strengthPrRecords),
    [workouts, checkIns, trackedLifts, activePhase, strengthPrRecords]
  );
  const calorieRecommendation = useMemo(
    () => buildCalorieRecommendation(activePhase, checkIns, recommendations),
    [activePhase, checkIns, recommendations]
  );

  function refreshCheckIns(next) {
    setCheckIns(next);
    const currentFormDate = form.date || getTodayKey();
    const matching = next.find((entry) => entry.date === currentFormDate);
    if (matching) {
      setEditingId(matching.id);
      setForm(toForm(matching));
    }
  }

  function updateForm(field, value) {
    const next = { ...form, [field]: value };
    if (field === "date") {
      const existing = checkIns.find((entry) => entry.date === value);
      setEditingId(existing?.id || "");
      setForm(toForm(existing || { date: value }));
      return;
    }
    setForm(next);
  }

  function saveForm(event) {
    event?.preventDefault?.();
    const next = saveDailyCheckIn({
      ...fromDailyForm(form),
      workoutDurationMinutes: form.workoutDurationMinutes || workoutDurationToday || "",
    });
    refreshCheckIns(next);
    setDeletedEntry(null);
  }

  function saveMorningWeight(event) {
    event?.preventDefault?.();
    const next = saveDailyCheckIn({
      date: form.date || getTodayKey(),
      morningWeight: form.morningWeight,
      sleepHours: form.sleepHours,
      sleepScore: form.sleepScore,
      energy: form.energy,
      hunger: form.hunger,
      soreness: form.soreness,
      stress: form.stress,
    });
    refreshCheckIns(next);
    setDeletedEntry(null);
  }

  function editEntry(entry) {
    setForm(toForm(entry));
    setEditingId(entry.id);
    setActiveSection("Body");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const result = deleteDailyCheckIn(pendingDelete.id);
    setCheckIns(result.checkIns);
    setDeletedEntry(result.deleted);
    setPendingDelete(null);
    if (result.deleted?.id === editingId) {
      const today = getTodayKey();
      setForm(toForm({ date: today }));
      setEditingId("");
    }
  }

  function undoDelete() {
    if (!deletedEntry) return;
    const restored = restoreDailyCheckIn(deletedEntry);
    setCheckIns(restored);
    setDeletedEntry(null);
  }

  function saveTargets(nextTargets = targetDraft) {
    const saved = saveProgressTargets(nextTargets);
    setTargets(saved);
    setTargetDraft(saved);
  }

  function editPhase(phase) {
    setPhaseForm(toPhaseForm(phase));
    setActiveSection("Phases");
  }

  function resetPhaseForm() {
    setPhaseForm(toPhaseForm({
      ...EMPTY_PHASE_FORM,
      startDate: getTodayKey(),
      plannedEndDate: addDateDays(getTodayKey(), 55),
      startingWeight: currentAverage || latestEntry?.morningWeight || "",
      startingCalorieTarget: activeTargets.calorieTarget || "",
      currentCalorieTarget: activeTargets.calorieTarget || "",
      proteinTarget: activeTargets.proteinTarget || "",
    }));
  }

  function savePhaseForm(event) {
    event?.preventDefault?.();
    const previous = phases.find((phase) => phase.id === phaseForm.id);
    const nextPhases = savePhase(fromPhaseForm(phaseForm));
    const saved = nextPhases.find((phase) => phase.id === phaseForm.id) || nextPhases[nextPhases.length - 1];
    if (saved && Number(previous?.currentCalorieTarget || 0) !== Number(saved.currentCalorieTarget || 0)) {
      setTargetHistory(saveCalorieTargetHistory({
        phaseId: saved.id,
        previousTarget: previous?.currentCalorieTarget,
        newTarget: saved.currentCalorieTarget,
        source: previous ? "phase-update" : "phase-start",
        reason: previous ? "Phase calorie target edited" : "Phase created",
      }));
    }
    setPhases(nextPhases);
    setPhaseForm(EMPTY_PHASE_FORM);
  }

  function changePhaseStatus(phase, status) {
    const patch = { ...phase, status };
    if (status === "active") {
      patch.startDate = phase.startDate || getTodayKey();
      patch.startingWeight = phase.startingWeight || currentAverage || latestEntry?.morningWeight || "";
      patch.startingCalorieTarget = phase.startingCalorieTarget || phase.currentCalorieTarget || activeTargets.calorieTarget;
      setTargetHistory(saveCalorieTargetHistory({
        phaseId: phase.id,
        newTarget: patch.currentCalorieTarget || activeTargets.calorieTarget,
        source: "phase-start",
        reason: "Phase started",
      }));
    }
    if (status === "completed") {
      patch.actualEndDate = getTodayKey();
      patch.endingWeight = currentAverage || latestEntry?.morningWeight || "";
    }
    setPhases(savePhase(patch));
  }

  function confirmPhaseDelete() {
    if (!pendingPhaseDelete) return;
    const result = deletePhase(pendingPhaseDelete.id);
    setPhases(result.phases);
    setDeletedPhase(result.deleted);
    setPendingPhaseDelete(null);
  }

  function undoPhaseDelete() {
    if (!deletedPhase) return;
    setPhases(restorePhase(deletedPhase));
    setDeletedPhase(null);
  }

  function movePhase(id, direction) {
    setPhases(reorderPlannedPhase(id, direction));
  }

  function saveMeasurementForm(event) {
    event?.preventDefault?.();
    const saved = saveBodyMeasurement(fromMeasurementForm(measurementForm, activePhase));
    setMeasurements(saved);
    setMeasurementForm(createMeasurementForm({ date: measurementForm.date, unit: measurementForm.unit }));
  }

  function confirmMeasurementDelete() {
    if (!pendingMeasurementDelete) return;
    const result = deleteBodyMeasurement(pendingMeasurementDelete.id);
    setMeasurements(result.measurements);
    setDeletedMeasurement(result.deleted);
    setPendingMeasurementDelete(null);
  }

  function undoMeasurementDelete() {
    if (!deletedMeasurement) return;
    setMeasurements(saveBodyMeasurement(deletedMeasurement));
    setDeletedMeasurement(null);
  }

  function generateReview() {
    const review = generateWeeklyReview({ checkIns, workouts, phases, measurements, weekStartDay });
    setWeeklyReviews(saveWeeklyReview(review));
  }

  function updateReviewNotes(review, notes) {
    setWeeklyReviews(saveWeeklyReview({ ...review, userNotes: notes }));
  }

  function exportReviewToNotes(review) {
    addNote({
      level: "solid",
      text: `Weekly Review ${review.weekStart} to ${review.weekEnd}\n\n${review.summary}\n\n${review.userNotes || ""}`,
      tags: ["weekly-review", "progress"],
    });
  }

  function applyRecommendation() {
    if (!activePhase || !calorieRecommendation.adjustment) return;
    const nextPhases = applyCalorieRecommendation(calorieRecommendation, activePhase);
    setPhases(nextPhases);
    setRecommendations(getCalorieRecommendations());
    setTargetHistory(getCalorieTargetHistory());
  }

  function updateRecommendation(status) {
    setRecommendations(saveCalorieRecommendation({ ...calorieRecommendation, status }));
  }

  function toggleTrackedLift(lift) {
    const exists = trackedLifts.includes(lift);
    setTrackedLifts(saveTrackedLifts(exists ? trackedLifts.filter((item) => item !== lift) : [...trackedLifts, lift]));
  }

  function updateWeekStart(nextDay) {
    const saved = saveWeekStartDay(nextDay);
    setWeekStartDay(saved);
  }

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Trends Dashboard</p>
          <h1 style={title}>Progress</h1>
        </div>
      </header>

      <div style={sectionTabs} role="tablist" aria-label="Progress sections">
        {SECTIONS.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(section)}
            style={{
              ...sectionTab,
              ...(activeSection === section ? sectionTabActive : {}),
            }}
          >
            {section}
          </button>
        ))}
      </div>

      {activeSection === "Overview" && (
        <OverviewSection
          checkIns={checkIns}
          todayEntry={todayEntry}
          latestEntry={latestEntry}
          targets={activeTargets}
          weights={weights}
          currentAverage={currentAverage}
          weeklyRate={weeklyRate}
          recovery={recovery}
          insights={insights}
          proteinAdherence={proteinAdherence}
          stepsWeek={stepsWeek}
          activePhase={activePhase}
          phaseProgress={phaseProgress}
          phaseMessage={phaseMessage}
          onOpenPhases={() => setActiveSection("Phases")}
          onGenerateReview={generateReview}
          onCheckIn={() => {
            setActiveSection("Body");
            window.setTimeout(() => document.getElementById("daily-check-in")?.scrollIntoView({ behavior: "smooth" }), 0);
          }}
        />
      )}

      {activeSection === "Strength" && (
        <StrengthSection
          data={strengthDisplayData}
          goals={goals}
          trend={strengthTrend}
          relativeStrength={relativeStrength}
          trackedLifts={trackedLifts}
          toggleTrackedLift={toggleTrackedLift}
        />
      )}

      {activeSection === "Body" && (
        <BodySection
          form={form}
          editingId={editingId}
          checkIns={checkIns}
          targets={activeTargets}
          targetDraft={targetDraft || activeTargets}
          setTargetDraft={setTargetDraft}
          saveTargets={saveTargets}
          updateForm={updateForm}
          saveForm={saveForm}
          saveMorningWeight={saveMorningWeight}
          workoutDurationToday={workoutDurationToday}
          weights={weights}
          currentAverage={currentAverage}
          previousAverage={previousAverage}
          weeklyRate={weeklyRate}
          rangedWeights={rangedWeights}
          rangedAverage={rangedAverage}
          chartRange={chartRange}
          setChartRange={setChartRange}
          recovery={recovery}
          proteinAdherence={proteinAdherence}
          stepsWeek={stepsWeek}
          editEntry={editEntry}
          requestDelete={setPendingDelete}
          deletedEntry={deletedEntry}
          undoDelete={undoDelete}
          measurements={measurements}
          measurementForm={measurementForm}
          setMeasurementForm={setMeasurementForm}
          saveMeasurementForm={saveMeasurementForm}
          requestMeasurementDelete={setPendingMeasurementDelete}
          deletedMeasurement={deletedMeasurement}
          undoMeasurementDelete={undoMeasurementDelete}
          activePhase={activePhase}
        />
      )}

      {activeSection === "Phases" && (
        <PhasesSection
          phases={phases}
          activePhase={activePhase}
          phaseProgress={phaseProgress}
          phaseForm={phaseForm}
          setPhaseForm={setPhaseForm}
          resetPhaseForm={resetPhaseForm}
          savePhaseForm={savePhaseForm}
          editPhase={editPhase}
          changePhaseStatus={changePhaseStatus}
          requestPhaseDelete={setPendingPhaseDelete}
          expandedPhaseId={expandedPhaseId}
          setExpandedPhaseId={setExpandedPhaseId}
          movePhase={movePhase}
          deletedPhase={deletedPhase}
          undoPhaseDelete={undoPhaseDelete}
          weeklyReviews={weeklyReviews}
          weekStartDay={weekStartDay}
          updateWeekStart={updateWeekStart}
          generateReview={generateReview}
          updateReviewNotes={updateReviewNotes}
          exportReviewToNotes={exportReviewToNotes}
          recommendation={calorieRecommendation}
          applyRecommendation={applyRecommendation}
          updateRecommendation={updateRecommendation}
          targetHistory={targetHistory}
          measurements={measurements}
          relativeStrength={relativeStrength}
          checkIns={checkIns}
          workouts={workouts}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete check-in?"
        message={`Delete the ${pendingDelete?.date || ""} check-in? You can undo it after deletion.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={Boolean(pendingPhaseDelete)}
        title="Delete phase?"
        message={`Delete ${pendingPhaseDelete?.name || "this phase"}? You can undo it after deletion.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingPhaseDelete(null)}
        onConfirm={confirmPhaseDelete}
      />
      <ConfirmDialog
        open={Boolean(pendingMeasurementDelete)}
        title="Delete measurement?"
        message={`Delete the ${pendingMeasurementDelete?.date || ""} measurement entry? You can undo it after deletion.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingMeasurementDelete(null)}
        onConfirm={confirmMeasurementDelete}
      />
    </div>
  );
}

function OverviewSection({
  checkIns,
  todayEntry,
  latestEntry,
  targets,
  weights,
  currentAverage,
  weeklyRate,
  recovery,
  insights,
  proteinAdherence,
  stepsWeek,
  activePhase,
  phaseProgress,
  phaseMessage,
  onOpenPhases,
  onGenerateReview,
  onCheckIn,
}) {
  const caloriesToday = Number(todayEntry?.calories || 0);
  const proteinToday = Number(todayEntry?.protein || 0);
  const latestWeight = todayEntry?.morningWeight ?? latestEntry?.morningWeight;

  return (
    <>
      <section style={heroPanel}>
        <div>
          <p style={heroLabel}>Today</p>
          <h2 style={heroTitle}>{latestWeight ? `${latestWeight} ${targets.weightUnit || "lb"}` : "--"}</h2>
          <p style={muted}>{currentAverage ? `7-day average ${currentAverage} ${targets.weightUnit || "lb"}` : "Log morning weight to begin tracking your trend."}</p>
        </div>
        <div style={heroTrend}>
          <span style={heroLabel}>Weekly Rate</span>
          <strong style={{ ...heroTrendValue, color: weeklyRate === null ? "#777" : weeklyRate >= 0 ? GREEN : ORANGE }}>
            {weeklyRate === null ? "Baseline" : `${weeklyRate > 0 ? "+" : ""}${weeklyRate} ${targets.weightUnit || "lb"}`}
          </strong>
          <button type="button" className="primary" onClick={onCheckIn} style={compactPrimary}>
            Daily Check-In
          </button>
        </div>
      </section>

      <section style={panel}>
        <div style={metricRows}>
          <MetricRow label="Current morning bodyweight" value={latestWeight ? `${latestWeight} ${targets.weightUnit || "lb"}` : "--"} />
          <MetricRow label="7-day average bodyweight" value={currentAverage ? `${currentAverage} ${targets.weightUnit || "lb"}` : "--"} />
          <MetricRow label="Weekly weight-change rate" value={weeklyRate === null ? "Need more data" : `${weeklyRate > 0 ? "+" : ""}${weeklyRate} ${targets.weightUnit || "lb"}`} />
          <MetricRow label="Calories consumed today" value={`${caloriesToday} / ${targets.calorieTarget || 0}`} accent={ACCENT} />
          <MetricRow label="Protein consumed today" value={`${proteinToday}g / ${targets.proteinTarget || 0}g`} accent={GREEN} />
          <MetricRow label="Steps today" value={`${Number(todayEntry?.steps || 0).toLocaleString()} / ${Number(targets.stepGoal || 0).toLocaleString()}`} />
          <MetricRow label="Sleep last night" value={todayEntry?.sleepHours ? `${todayEntry.sleepHours} hr` : "--"} />
          <MetricRow label="Nutrition goal" value={formatGoalType(targets.goalType)} accent={YELLOW} />
        </div>
      </section>

      <section style={panel}>
        <div style={sectionHeaderRow}>
          <div>
            <p style={eyebrow}>Current Phase</p>
            <h2 style={sectionTitle}>{activePhase?.name || "No Active Phase"}</h2>
          </div>
          <button type="button" onClick={onOpenPhases} style={ghostButton}>
            Phases
          </button>
        </div>
        {activePhase ? (
          <div style={metricRows}>
            <MetricRow label="Phase type" value={formatPhaseType(activePhase.type)} accent={YELLOW} />
            <MetricRow label="Current trend" value={phaseProgress?.weeklyRate === null ? "Need more data" : `${phaseProgress?.weeklyRate > 0 ? "+" : ""}${phaseProgress?.weeklyRate} ${targets.weightUnit || "lb"}/wk`} />
            <MetricRow label="Target trend" value={phaseProgress?.targetWeeklyRate || "--"} />
            <MetricRow label="Calorie target" value={activePhase.currentCalorieTarget || targets.calorieTarget || "--"} accent={ACCENT} />
            <MetricRow label="Protein target" value={`${activePhase.proteinTarget || targets.proteinTarget || "--"}g`} accent={GREEN} />
            <MetricRow label="Estimated completion" value={phaseProgress?.projectedEndDate || activePhase.plannedEndDate || "--"} />
            <MetricRow label="Status" value={activePhase.status} />
          </div>
        ) : (
          <EmptyState copy="Create your first phase to connect nutrition targets with bodyweight trends." />
        )}
        <p style={muted}>{phaseMessage}</p>
      </section>

      <section style={grid}>
        <section style={panel}>
          <p style={eyebrow}>Insights</p>
          <h2 style={sectionTitle}>Trend Notes</h2>
          <div style={compactList}>
            {(insights.length ? insights : ["More bodyweight data is needed before calculating a reliable trend."]).map((insight) => (
              <div key={insight} style={insightRow}>{insight}</div>
            ))}
          </div>
        </section>

        <section style={panel}>
          <p style={eyebrow}>Recovery</p>
          <h2 style={sectionTitle}>{recovery.label}</h2>
          <p style={muted}>{recovery.copy}</p>
          <div style={pillRow}>
            <span style={miniPill}>Protein {proteinAdherence.hits}/{proteinAdherence.days || 7}</span>
            <span style={miniPill}>Steps {stepsWeek.delta === null ? "baseline" : stepsWeek.delta >= 0 ? "up" : "down"}</span>
            <span style={miniPill}>{weights.length} weigh-ins</span>
          </div>
        </section>

        <section style={panel}>
          <p style={eyebrow}>Weekly</p>
          <h2 style={sectionTitle}>Review</h2>
          <p style={muted}>Generate this week’s review from logged weight, nutrition, workouts, recovery, and measurements.</p>
          <div style={pillRow}>
            <button type="button" className="primary" onClick={onGenerateReview} style={compactPrimary}>
              Generate Review
            </button>
            <button type="button" onClick={onOpenPhases} style={ghostButton}>
              Open Reviews
            </button>
          </div>
        </section>
      </section>
    </>
  );
}

function StrengthSection({ data, goals, trend, relativeStrength, trackedLifts, toggleTrackedLift }) {
  const leadGoal = goals[0] || {
    label: "Bench",
    current: 0,
    target: 315,
    percent: 0,
    remaining: 315,
  };

  return (
    <>
      <section style={heroPanel}>
        <div>
          <p style={heroLabel}>Top Strength Target</p>
          <h2 style={heroTitle}>{leadGoal.label}</h2>
          <p style={muted}>
            {leadGoal.current} / {leadGoal.target} lb · {leadGoal.remaining > 0 ? `${leadGoal.remaining} lb left` : "Goal hit"}
          </p>
        </div>
        <div style={heroTrend}>
          <span style={heroLabel}>Volume Trend</span>
          <strong style={{ ...heroTrendValue, color: trend.color }}>{trend.label}</strong>
          <span style={heroMini}>Last 3 vs previous 3 workouts</span>
        </div>
      </section>

      <section style={panel}>
        <div style={panelHeader}>
          <div>
            <p style={eyebrow}>Goals</p>
            <h2 style={sectionTitle}>Strength Targets</h2>
          </div>
        </div>

        <div style={goalList}>
          {goals.map((goal) => (
            <GoalCard key={goal.label} goal={goal} />
          ))}
          {goals.length === 0 && <EmptyState copy="Log workouts or add profile goals to build your strength targets." />}
        </div>
      </section>

      <section style={grid}>
        <section style={panel}>
          <p style={eyebrow}>Recent Work</p>
          <h2 style={sectionTitle}>Recent Volume</h2>
          <div style={trendBox}>
            <strong style={{ ...trendValue, color: trend.color }}>{trend.label}</strong>
            <p style={muted}>{trend.copy}</p>
            <p style={mutedSmall}>{trend.source}</p>
          </div>
        </section>

        <section style={panel}>
          <p style={eyebrow}>Best Work</p>
          <h2 style={sectionTitle}>Top Lifts</h2>
          <div style={compactList}>
            {Object.entries(data.exerciseBest).slice(0, 6).map(([exercise, weight]) => (
              <div key={exercise} style={compactRow}>
                <span>{exercise}</span>
                <strong>{weight} lb</strong>
              </div>
            ))}
            {Object.keys(data.exerciseBest).length === 0 && <div style={empty}>Log workouts to build this list.</div>}
          </div>
        </section>
      </section>

      <section style={panel}>
        <div style={sectionHeaderRow}>
          <div>
            <p style={eyebrow}>Relative Strength</p>
            <h2 style={sectionTitle}>Strength-To-Bodyweight</h2>
          </div>
        </div>
        <div style={pillRow}>
          {DEFAULT_TRACKED_LIFTS.map((lift) => (
            <button
              key={lift}
              type="button"
              onClick={() => toggleTrackedLift(lift)}
              style={{ ...smallButton, ...(trackedLifts.includes(lift) ? activeSmallButton : {}) }}
            >
              {lift}
            </button>
          ))}
        </div>
        <div style={compactList}>
          {relativeStrength.map((item) => (
            <div key={item.lift} style={historyRow}>
              <div>
                <strong>{item.lift}</strong>
                <p style={mutedSmall}>
                  {item.currentBest ? `${item.currentBest.weight} lb x ${item.currentBest.reps} · e1RM ${item.currentEstimated1rm?.estimated1rm || "--"} lb` : "Complete more workouts to calculate relative-strength trends."}
                </p>
              </div>
              <div style={ratioStack}>
                <strong>{item.bestRatio?.e1rmRatio ? `${item.bestRatio.e1rmRatio}x` : "--"}</strong>
                <span style={mutedSmall}>best ratio</span>
                <span style={mutedSmall}>phase {item.phaseRatioChange === null ? "--" : `${item.phaseRatioChange > 0 ? "+" : ""}${item.phaseRatioChange}x`}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function BodySection({
  form,
  editingId,
  checkIns,
  targets,
  targetDraft,
  setTargetDraft,
  saveTargets,
  updateForm,
  saveForm,
  saveMorningWeight,
  workoutDurationToday,
  weights,
  currentAverage,
  previousAverage,
  weeklyRate,
  rangedWeights,
  rangedAverage,
  chartRange,
  setChartRange,
  recovery,
  proteinAdherence,
  stepsWeek,
  editEntry,
  requestDelete,
  deletedEntry,
  undoDelete,
  measurements,
  measurementForm,
  setMeasurementForm,
  saveMeasurementForm,
  requestMeasurementDelete,
  deletedMeasurement,
  undoMeasurementDelete,
  activePhase,
}) {
  const latestWeight = weights[weights.length - 1]?.value;
  const startWeight = weights[0]?.value;
  const changeSinceStart = latestWeight && startWeight ? Math.round((latestWeight - startWeight) * 10) / 10 : null;
  const averageCalories = averageDaily(checkIns, "calories", 7);
  const averageProtein = averageDaily(checkIns, "protein", 7);
  const averageSleep = averageDaily(checkIns, "sleepHours", 7);
  const averageSteps = averageDaily(checkIns, "steps", 7);
  const activeEntry = checkIns.find((entry) => entry.date === (form.date || getTodayKey())) || {};
  const waistTrend = getMeasurementChanges(measurements, activePhase, "Waist");

  return (
    <>
      <section style={panel}>
        <div style={sectionHeaderRow}>
          <div>
            <p style={eyebrow}>Morning</p>
            <h2 style={sectionTitle}>Bodyweight + Readiness</h2>
          </div>
          <span style={saveHint}>Best after waking</span>
        </div>
        <form onSubmit={saveMorningWeight} style={morningGrid}>
          <Field label="Date" type="date" value={form.date} onChange={(value) => updateForm("date", value)} />
          <Field label={`Morning bodyweight (${targets.weightUnit || "lb"})`} type="number" value={form.morningWeight} onChange={(value) => updateForm("morningWeight", value)} step="0.1" />
          <Field label="Sleep hours" type="number" value={form.sleepHours} onChange={(value) => updateForm("sleepHours", value)} step="0.25" />
          <Field label="Sleep score" type="number" value={form.sleepScore} onChange={(value) => updateForm("sleepScore", value)} />
          <ScaleField label="Energy" value={form.energy} onChange={(value) => updateForm("energy", value)} />
          <ScaleField label="Hunger" value={form.hunger} onChange={(value) => updateForm("hunger", value)} />
          <ScaleField label="Soreness" value={form.soreness} onChange={(value) => updateForm("soreness", value)} />
          <ScaleField label="Stress" value={form.stress} onChange={(value) => updateForm("stress", value)} />
          <p style={morningHint}>
            Log sleep and bodyweight after waking. Energy, hunger, stress, and soreness work best before training or around midday once you know how you feel.
          </p>
          <button type="submit" className="primary" style={saveButton}>
            Save Morning Check-In
          </button>
        </form>
      </section>

      <section id="daily-check-in" style={panel}>
        <div style={sectionHeaderRow}>
          <div>
            <p style={eyebrow}>Evening</p>
            <h2 style={sectionTitle}>{editingId ? "Update Check-In" : "Night Check-In"}</h2>
          </div>
          <span style={saveHint}>Recovery, activity, notes</span>
        </div>
        <form onSubmit={saveForm} style={formGrid}>
          <Field label="Date" type="date" value={form.date} onChange={(value) => updateForm("date", value)} full />
          <Field label="Steps" type="number" value={form.steps} onChange={(value) => updateForm("steps", value)} />
          <Field label="Resting HR" type="number" value={form.restingHeartRate} onChange={(value) => updateForm("restingHeartRate", value)} />
          <Field label="Active minutes" type="number" value={form.activeMinutes} onChange={(value) => updateForm("activeMinutes", value)} />
          <Field
            label="Workout minutes"
            type="number"
            value={form.workoutDurationMinutes || workoutDurationToday || ""}
            onChange={(value) => updateForm("workoutDurationMinutes", value)}
          />
          <label style={{ ...field, gridColumn: "1 / -1" }}>
            <span style={fieldLabel}>Notes</span>
            <input value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Optional" />
          </label>

          <div style={stickyActions}>
            <button type="submit" className="primary" style={saveButton}>
              {editingId ? "Update Entry" : "Save Check-In"}
            </button>
          </div>
        </form>
      </section>

      <section style={grid}>
        <section style={panel}>
          <div style={sectionHeaderRow}>
            <div>
              <p style={eyebrow}>Bodyweight</p>
              <h2 style={sectionTitle}>Weight Trend</h2>
            </div>
            <div style={rangeTabs}>
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChartRange(option.value)}
                  style={{ ...rangeButton, ...(chartRange === option.value ? rangeButtonActive : {}) }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div style={metricRows}>
            <MetricRow label="Today" value={form.morningWeight ? `${form.morningWeight} ${targets.weightUnit || "lb"}` : "--"} />
            <MetricRow label="Latest recorded" value={latestWeight ? `${latestWeight} ${targets.weightUnit || "lb"}` : "--"} />
            <MetricRow label="7-day average" value={currentAverage ? `${currentAverage} ${targets.weightUnit || "lb"}` : "Using available data"} />
            <MetricRow label="Previous 7-day average" value={previousAverage ? `${previousAverage} ${targets.weightUnit || "lb"}` : "--"} />
            <MetricRow label="Weekly rate" value={weeklyRate === null ? "Need more entries" : `${weeklyRate > 0 ? "+" : ""}${weeklyRate} ${targets.weightUnit || "lb"}`} />
            <MetricRow label="Change since start" value={changeSinceStart === null ? "--" : `${changeSinceStart > 0 ? "+" : ""}${changeSinceStart} ${targets.weightUnit || "lb"}`} />
          </div>
          {rangedWeights.length ? (
            <WeightChart entries={rangedWeights} averages={rangedAverage} />
          ) : (
            <EmptyState copy="Log your morning weight to begin tracking your trend." />
          )}
          {weights.length > 0 && weights.length < 7 && <p style={muted}>Average uses {weights.length} available entries until seven are logged.</p>}
        </section>

        <section style={panel}>
          <p style={eyebrow}>Targets</p>
          <h2 style={sectionTitle}>Nutrition Goals</h2>
          <div style={targetGrid}>
            <Field label="Goal type" as="select" value={targetDraft.goalType} onChange={(value) => setTargetDraft({ ...targetDraft, goalType: value })}>
              <option value="lean-bulk">Lean bulk</option>
              <option value="maintenance">Maintenance</option>
              <option value="cut">Cut</option>
              <option value="custom">Custom</option>
            </Field>
            <Field label="Calories" type="number" value={targetDraft.calorieTarget} onChange={(value) => setTargetDraft({ ...targetDraft, calorieTarget: value })} />
            <Field label="Protein" type="number" value={targetDraft.proteinTarget} onChange={(value) => setTargetDraft({ ...targetDraft, proteinTarget: value })} />
            <Field label="Step goal" type="number" value={targetDraft.stepGoal} onChange={(value) => setTargetDraft({ ...targetDraft, stepGoal: value })} />
            <Field label="Sleep goal" type="number" value={targetDraft.sleepGoalHours} onChange={(value) => setTargetDraft({ ...targetDraft, sleepGoalHours: value })} step="0.25" />
            <Field label="Weight unit" as="select" value={targetDraft.weightUnit} onChange={(value) => setTargetDraft({ ...targetDraft, weightUnit: value })}>
              <option value="lb">LB</option>
              <option value="kg">KG</option>
            </Field>
            <Field label="Weekly min" type="number" value={targetDraft.targetWeeklyWeightChangeMin} onChange={(value) => setTargetDraft({ ...targetDraft, targetWeeklyWeightChangeMin: value, goalType: "custom" })} step="0.1" />
            <Field label="Weekly max" type="number" value={targetDraft.targetWeeklyWeightChangeMax} onChange={(value) => setTargetDraft({ ...targetDraft, targetWeeklyWeightChangeMax: value, goalType: "custom" })} step="0.1" />
          </div>
          <button type="button" className="primary" onClick={() => saveTargets(targetDraft)} style={saveTargetsButton}>
            Save Targets
          </button>
        </section>
      </section>

      <section style={grid}>
        <SummaryPanel title="Nutrition Adherence" eyebrowText="Nutrition">
          <ProgressBar label="Calories" value={Number(activeEntry.calories || 0)} target={Number(targets.calorieTarget || 0)} />
          <ProgressBar label="Protein" value={Number(activeEntry.protein || 0)} target={Number(targets.proteinTarget || 0)} suffix="g" />
          <MetricRow label="7-day average calories" value={averageCalories ? `${averageCalories}` : "--"} />
          <MetricRow label="7-day average protein" value={averageProtein ? `${averageProtein}g` : "--"} />
          <MetricRow label="Protein target days" value={`${proteinAdherence.hits} / ${proteinAdherence.days || 7}`} />
        </SummaryPanel>

        <SummaryPanel title="Activity Summary" eyebrowText="Activity">
          <ProgressBar label="Steps" value={Number(form.steps || 0)} target={Number(targets.stepGoal || 0)} />
          <MetricRow label="7-day average steps" value={averageSteps ? averageSteps.toLocaleString() : "--"} />
          <MetricRow label="Previous week comparison" value={stepsWeek.delta === null ? "--" : `${stepsWeek.delta > 0 ? "+" : ""}${stepsWeek.delta.toLocaleString()}`} />
          <MetricRow label="Workout duration" value={form.workoutDurationMinutes || workoutDurationToday ? `${form.workoutDurationMinutes || workoutDurationToday} min` : "--"} />
        </SummaryPanel>

        <SummaryPanel title="Recovery Summary" eyebrowText="Recovery">
          <h3 style={recoveryLabel}>{recovery.label}</h3>
          <p style={muted}>{recovery.copy}</p>
          <MetricRow label="Average sleep" value={averageSleep ? `${averageSleep} hr` : "--"} />
          <MetricRow label="Factors" value={recovery.factors.join(", ")} />
        </SummaryPanel>
      </section>

      <section style={panel}>
        <div style={sectionHeaderRow}>
          <div>
            <p style={eyebrow}>Measurements</p>
            <h2 style={sectionTitle}>Body Measurements</h2>
          </div>
          {deletedMeasurement && (
            <button type="button" onClick={undoMeasurementDelete} style={ghostButton}>
              Undo Delete
            </button>
          )}
        </div>
        <div style={metricRows}>
          <MetricRow label="Latest waist" value={waistTrend.latest ? `${waistTrend.latest} ${measurementForm.unit}` : "--"} accent={YELLOW} />
          <MetricRow label="Change from previous" value={waistTrend.previousChange === null ? "--" : `${waistTrend.previousChange > 0 ? "+" : ""}${waistTrend.previousChange} ${measurementForm.unit}`} />
          <MetricRow label="Change this month" value={waistTrend.monthChange === null ? "--" : `${waistTrend.monthChange > 0 ? "+" : ""}${waistTrend.monthChange} ${measurementForm.unit}`} />
          <MetricRow label="Change in phase" value={waistTrend.phaseChange === null ? "--" : `${waistTrend.phaseChange > 0 ? "+" : ""}${waistTrend.phaseChange} ${measurementForm.unit}`} />
        </div>
        <form onSubmit={saveMeasurementForm} style={measurementGrid}>
          <Field label="Date" type="date" value={measurementForm.date} onChange={(value) => setMeasurementForm({ ...measurementForm, date: value })} />
          <Field label="Unit" as="select" value={measurementForm.unit} onChange={(value) => setMeasurementForm({ ...measurementForm, unit: value })}>
            <option value="in">Inches</option>
            <option value="cm">Centimeters</option>
          </Field>
          {DEFAULT_MEASUREMENT_TYPES.map((type) => (
            <Field
              key={type}
              label={type}
              type="number"
              step="0.1"
              value={measurementForm.measurements[type] || ""}
              onChange={(value) =>
                setMeasurementForm({
                  ...measurementForm,
                  measurements: { ...measurementForm.measurements, [type]: value },
                })
              }
            />
          ))}
          <label style={{ ...field, gridColumn: "1 / -1" }}>
            <span style={fieldLabel}>Notes</span>
            <input value={measurementForm.notes} onChange={(event) => setMeasurementForm({ ...measurementForm, notes: event.target.value })} placeholder="Optional" />
          </label>
          <div style={stickyActions}>
            <button type="submit" className="primary" style={saveButton}>
              Save Measurements
            </button>
          </div>
        </form>
        <div style={compactList}>
          {measurements.slice(-5).reverse().map((entry) => (
            <div key={entry.id} style={historyRow}>
              <div>
                <strong>{entry.date}</strong>
                <p style={mutedSmall}>
                  {Object.entries(entry.measurements).slice(0, 4).map(([name, value]) => `${name}: ${value}${entry.unit}`).join(" · ")}
                </p>
              </div>
              <button type="button" onClick={() => requestMeasurementDelete(entry)} style={dangerGhost}>
                Delete
              </button>
            </div>
          ))}
          {measurements.length === 0 && <EmptyState copy="Add waist measurements to monitor changes during your bulk or cut." />}
        </div>
      </section>

      <section style={panel}>
        <div style={sectionHeaderRow}>
          <div>
            <p style={eyebrow}>History</p>
            <h2 style={sectionTitle}>Recent Check-Ins</h2>
          </div>
          {deletedEntry && (
            <button type="button" onClick={undoDelete} style={ghostButton}>
              Undo Delete
            </button>
          )}
        </div>
        <div style={compactList}>
          {checkIns.slice(-7).reverse().map((entry) => (
            <div key={entry.id} style={historyRow}>
              <div>
                <strong>{entry.date}</strong>
                <p style={mutedSmall}>
                  {entry.morningWeight ? `${entry.morningWeight} ${targets.weightUnit || "lb"} · ` : ""}
                  {Number(entry.calories || 0)} cal · {Number(entry.protein || 0)}g protein
                </p>
              </div>
              <div style={rowActions}>
                <button type="button" onClick={() => editEntry(entry)} style={smallButton}>Edit</button>
                <button type="button" onClick={() => requestDelete(entry)} style={dangerGhost}>Delete</button>
              </div>
            </div>
          ))}
          {checkIns.length === 0 && <EmptyState copy="Complete today’s check-in to view recovery insights." />}
        </div>
      </section>
    </>
  );
}

function PhasesSection({
  phases,
  activePhase,
  phaseProgress,
  phaseForm,
  setPhaseForm,
  resetPhaseForm,
  savePhaseForm,
  editPhase,
  changePhaseStatus,
  requestPhaseDelete,
  expandedPhaseId,
  setExpandedPhaseId,
  movePhase,
  deletedPhase,
  undoPhaseDelete,
  weeklyReviews,
  weekStartDay,
  updateWeekStart,
  generateReview,
  updateReviewNotes,
  exportReviewToNotes,
  recommendation,
  applyRecommendation,
  updateRecommendation,
  targetHistory,
  measurements,
  relativeStrength,
  checkIns,
  workouts,
}) {
  const completionSummary = activePhase
    ? buildPhaseCompletionSummary(activePhase, checkIns, workouts, measurements, relativeStrength)
    : null;

  return (
    <>
      <section style={grid}>
        <section style={panel}>
          <div style={sectionHeaderRow}>
            <div>
              <p style={eyebrow}>Current</p>
              <h2 style={sectionTitle}>{activePhase?.name || "No Active Phase"}</h2>
            </div>
            <button type="button" onClick={resetPhaseForm} className="primary" style={compactPrimary}>
              New Phase
            </button>
          </div>
          {activePhase ? (
            <div style={metricRows}>
              <MetricRow label="Type" value={formatPhaseType(activePhase.type)} accent={YELLOW} />
              <MetricRow label="Dates" value={`${activePhase.startDate} to ${activePhase.plannedEndDate || "--"}`} />
              <MetricRow label="Current 7-day weight" value={phaseProgress?.currentWeight ? `${phaseProgress.currentWeight} lb` : "--"} />
              <MetricRow label="Starting weight" value={phaseProgress?.startingWeight ? `${phaseProgress.startingWeight} lb` : "--"} />
              <MetricRow label="Target weight" value={phaseProgress?.targetWeight ? `${phaseProgress.targetWeight} lb` : "Maintenance range"} />
              <MetricRow label="Weight changed" value={phaseProgress?.weightChange === null ? "--" : `${phaseProgress.weightChange > 0 ? "+" : ""}${phaseProgress.weightChange} lb`} />
              <MetricRow label="Target progress" value={activePhase.type === "maintenance" ? (phaseProgress?.maintenanceInRange ? "Within range" : "Outside range") : phaseProgress?.percent === null ? "--" : `${phaseProgress.percent}%`} />
              <MetricRow label="Days completed" value={phaseProgress?.daysCompleted ?? "--"} />
              <MetricRow label="Days remaining" value={phaseProgress?.daysRemaining ?? "--"} />
              <MetricRow label="Actual weekly rate" value={phaseProgress?.weeklyRate === null ? "--" : `${phaseProgress.weeklyRate > 0 ? "+" : ""}${phaseProgress.weeklyRate} lb/wk`} />
              <MetricRow label="Target weekly rate" value={phaseProgress?.targetWeeklyRate || "--"} />
              <MetricRow label="Calories / Protein" value={`${activePhase.currentCalorieTarget || "--"} cal · ${activePhase.proteinTarget || "--"}g`} />
            </div>
          ) : (
            <EmptyState copy="Create your first phase to connect nutrition targets with bodyweight trends." />
          )}
        </section>

        <section style={panel}>
          <p style={eyebrow}>Calorie Recommendation</p>
          <h2 style={sectionTitle}>{formatRecommendation(recommendation)}</h2>
          <p style={muted}>{recommendation.reason}</p>
          <div style={metricRows}>
            <MetricRow label="Current target" value={recommendation.currentTarget || activePhase?.currentCalorieTarget || "--"} />
            <MetricRow label="Recommended target" value={recommendation.recommendedTarget || "--"} />
            <MetricRow label="Confidence" value={recommendation.confidence} />
          </div>
          <div style={pillRow}>
            {recommendation.adjustment ? (
              <button type="button" className="primary" onClick={applyRecommendation} style={compactPrimary}>
                Apply
              </button>
            ) : null}
            <button type="button" onClick={() => updateRecommendation("dismissed")} style={ghostButton}>
              Dismiss
            </button>
            <button type="button" onClick={() => updateRecommendation("snoozed")} style={ghostButton}>
              Snooze 1 Week
            </button>
          </div>
        </section>
      </section>

      {phaseForm.startDate && (
        <section style={panel}>
          <p style={eyebrow}>{phaseForm.id ? "Edit" : "Create"}</p>
          <h2 style={sectionTitle}>Phase Details</h2>
          <form onSubmit={savePhaseForm} style={formGrid}>
            <Field label="Name" value={phaseForm.name} onChange={(value) => setPhaseForm({ ...phaseForm, name: value })} />
            <Field label="Type" as="select" value={phaseForm.type} onChange={(value) => setPhaseForm(applyPhaseTypeDefaults({ ...phaseForm, type: value }))}>
              {PHASE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
            </Field>
            <Field label="Status" as="select" value={phaseForm.status} onChange={(value) => setPhaseForm({ ...phaseForm, status: value })}>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Field>
            <Field label="Start date" type="date" value={phaseForm.startDate} onChange={(value) => setPhaseForm({ ...phaseForm, startDate: value })} />
            <Field label="Planned end" type="date" value={phaseForm.plannedEndDate} onChange={(value) => setPhaseForm({ ...phaseForm, plannedEndDate: value })} />
            <Field label="Actual end" type="date" value={phaseForm.actualEndDate} onChange={(value) => setPhaseForm({ ...phaseForm, actualEndDate: value })} />
            <Field label="Starting weight" type="number" step="0.1" value={phaseForm.startingWeight} onChange={(value) => setPhaseForm({ ...phaseForm, startingWeight: value })} />
            <Field label="Target weight" type="number" step="0.1" value={phaseForm.targetWeight} onChange={(value) => setPhaseForm({ ...phaseForm, targetWeight: value })} />
            <Field label="Ending weight" type="number" step="0.1" value={phaseForm.endingWeight} onChange={(value) => setPhaseForm({ ...phaseForm, endingWeight: value })} />
            <Field label="Starting calories" type="number" value={phaseForm.startingCalorieTarget} onChange={(value) => setPhaseForm({ ...phaseForm, startingCalorieTarget: value })} />
            <Field label="Current calories" type="number" value={phaseForm.currentCalorieTarget} onChange={(value) => setPhaseForm({ ...phaseForm, currentCalorieTarget: value })} />
            <Field label="Protein" type="number" value={phaseForm.proteinTarget} onChange={(value) => setPhaseForm({ ...phaseForm, proteinTarget: value })} />
            <Field label="Weekly min" type="number" step="0.1" value={phaseForm.targetWeeklyWeightChangeMin} onChange={(value) => setPhaseForm({ ...phaseForm, targetWeeklyWeightChangeMin: value })} />
            <Field label="Weekly max" type="number" step="0.1" value={phaseForm.targetWeeklyWeightChangeMax} onChange={(value) => setPhaseForm({ ...phaseForm, targetWeeklyWeightChangeMax: value })} />
            <label style={{ ...field, gridColumn: "1 / -1" }}>
              <span style={fieldLabel}>Notes</span>
              <input value={phaseForm.notes} onChange={(event) => setPhaseForm({ ...phaseForm, notes: event.target.value })} />
            </label>
            <div style={stickyActions}>
              <button type="submit" className="primary" style={saveButton}>Save Phase</button>
            </div>
          </form>
        </section>
      )}

      <section style={panel}>
        <div style={sectionHeaderRow}>
          <div>
            <p style={eyebrow}>Timeline</p>
            <h2 style={sectionTitle}>Phases</h2>
          </div>
          {deletedPhase && <button type="button" onClick={undoPhaseDelete} style={ghostButton}>Undo Delete</button>}
        </div>
        <div style={timeline}>
          {phases.map((phase) => {
            const open = expandedPhaseId === phase.id;
            const progress = buildPhaseProgress(phase, checkIns);
            return (
              <article key={phase.id} style={{ ...timelineItem, ...(phase.status === "active" ? activeTimelineItem : {}) }}>
                <button type="button" onClick={() => setExpandedPhaseId(open ? "" : phase.id)} style={timelineHeader}>
                  <span style={timelineDot} />
                  <span>
                    <strong>{phase.name}</strong>
                    <small style={mutedSmall}>{formatPhaseType(phase.type)} · {phase.status} · {phase.startDate} to {phase.actualEndDate || phase.plannedEndDate || "--"}</small>
                  </span>
                  <strong>{phase.currentCalorieTarget || "--"} cal</strong>
                </button>
                {open && (
                  <div style={timelineDetails}>
                    <div style={metricRows}>
                      <MetricRow label="Starting / target / ending weight" value={`${phase.startingWeight || "--"} / ${phase.targetWeight || "--"} / ${phase.endingWeight || "--"}`} />
                      <MetricRow label="Planned / actual rate" value={`${progress?.targetWeeklyRate || "--"} · ${progress?.weeklyRate ?? "--"} lb/wk`} />
                      <MetricRow label="Duration" value={`${progress?.totalDays || "--"} days`} />
                      <MetricRow label="Protein target" value={`${phase.proteinTarget || "--"}g`} />
                      <MetricRow label="Notes" value={phase.notes || "--"} />
                    </div>
                    <div style={rowActions}>
                      <button type="button" onClick={() => editPhase(phase)} style={smallButton}>Edit</button>
                      {phase.status === "planned" && <button type="button" onClick={() => changePhaseStatus(phase, "active")} style={smallButton}>Start</button>}
                      {phase.status === "planned" && <button type="button" onClick={() => movePhase(phase.id, -1)} style={smallButton}>Up</button>}
                      {phase.status === "planned" && <button type="button" onClick={() => movePhase(phase.id, 1)} style={smallButton}>Down</button>}
                      {phase.status === "active" && <button type="button" onClick={() => changePhaseStatus(phase, "completed")} style={smallButton}>Complete</button>}
                      {phase.status !== "cancelled" && <button type="button" onClick={() => changePhaseStatus(phase, "cancelled")} style={smallButton}>Cancel</button>}
                      <button type="button" onClick={() => requestPhaseDelete(phase)} style={dangerGhost}>Delete</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {phases.length === 0 && <EmptyState copy="Create your first phase to connect nutrition targets with bodyweight trends." />}
        </div>
      </section>

      <section style={grid}>
        <section style={panel}>
          <div style={sectionHeaderRow}>
            <div>
              <p style={eyebrow}>Weekly</p>
              <h2 style={sectionTitle}>Reviews</h2>
            </div>
            <button type="button" className="primary" onClick={generateReview} style={compactPrimary}>Generate</button>
          </div>
          <Field label="Week starts" as="select" value={weekStartDay} onChange={updateWeekStart}>
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="6">Saturday</option>
          </Field>
          <div style={compactList}>
            {weeklyReviews.slice(0, 4).map((review) => (
              <article key={review.id} style={insightRow}>
                <strong>{review.weekStart} to {review.weekEnd}</strong>
                <p style={muted}>{review.summary}</p>
                <div style={metricRows}>
                  <MetricRow label="Completeness" value={`${review.dataCompleteness || 0}% · ${review.confidence}`} />
                  <MetricRow label="Weight / calories / protein" value={`${review.averageWeight || "--"} lb · ${review.averageCalories || "--"} cal · ${review.averageProtein || "--"}g`} />
                  <MetricRow label="Workouts" value={review.workoutsCompleted || 0} />
                </div>
                <input value={review.userNotes || ""} onChange={(event) => updateReviewNotes(review, event.target.value)} placeholder="Review notes" />
                <button type="button" onClick={() => exportReviewToNotes(review)} style={ghostButton}>Export to Notes</button>
              </article>
            ))}
            {weeklyReviews.length === 0 && <EmptyState copy="Your weekly review will appear after enough data is logged." />}
          </div>
        </section>

        <section style={panel}>
          <p style={eyebrow}>Calorie History</p>
          <h2 style={sectionTitle}>Target Changes</h2>
          <div style={compactList}>
            {targetHistory.filter((entry) => !activePhase || entry.phaseId === activePhase.id).slice(0, 6).map((entry) => (
              <div key={entry.id} style={compactRow}>
                <span>{entry.date} · {entry.source}</span>
                <strong>{entry.previousTarget || "--"} → {entry.newTarget}</strong>
              </div>
            ))}
            {targetHistory.length === 0 && <EmptyState copy="Calorie target history will appear when a phase starts or a recommendation is applied." />}
          </div>
        </section>
      </section>

      {activePhase && (
        <section style={panel}>
          <p style={eyebrow}>Completion Preview</p>
          <h2 style={sectionTitle}>Phase Summary</h2>
          <div style={metricRows}>
            <MetricRow label="Weight change" value={completionSummary?.totalWeightChange === null ? "--" : `${completionSummary?.totalWeightChange > 0 ? "+" : ""}${completionSummary?.totalWeightChange} lb`} />
            <MetricRow label="Average weekly change" value={completionSummary?.averageWeeklyWeightChange === null ? "--" : `${completionSummary?.averageWeeklyWeightChange} lb/wk`} />
            <MetricRow label="Calories" value={`${completionSummary?.startingCalorieTarget || "--"} → ${completionSummary?.endingCalorieTarget || "--"}`} />
            <MetricRow label="Average intake" value={`${completionSummary?.averageCalories || "--"} cal · ${completionSummary?.averageProtein || "--"}g protein`} />
            <MetricRow label="Waist change" value={completionSummary?.waistChange === null ? "--" : `${completionSummary?.waistChange > 0 ? "+" : ""}${completionSummary?.waistChange}`} />
            <MetricRow label="Workouts" value={completionSummary?.workoutsCompleted || 0} />
            <MetricRow label="Average sleep" value={completionSummary?.averageSleep ? `${completionSummary.averageSleep} hr` : "--"} />
          </div>
        </section>
      )}
    </>
  );
}

function GoalCard({ goal }) {
  return (
    <article style={goalCard}>
      <div style={goalTop}>
        <div>
          <h3 style={goalTitle}>{goal.label}</h3>
          <p style={muted}>{goal.current} / {goal.target} lb</p>
        </div>
        <strong style={{ ...goalPercent, color: goal.percent >= 100 ? YELLOW : ACCENT }}>{goal.percent}%</strong>
      </div>
      <div style={barTrack}>
        <div style={{ ...barFill, width: `${Math.min(100, goal.percent)}%`, background: goal.percent >= 100 ? YELLOW : ACCENT }} />
      </div>
      <p style={goalCopy}>{goal.remaining > 0 ? `${goal.remaining} lb to go` : "Goal hit"}</p>
    </article>
  );
}

function Field({ label, value, onChange, type = "text", step, as, children, full = false }) {
  return (
    <label style={{ ...field, ...(full ? fullField : {}) }}>
      <span style={fieldLabel}>{label}</span>
      {as === "select" ? (
        <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
      ) : (
        <input type={type} step={step} value={value || ""} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function ScaleField({ label, value, onChange }) {
  return (
    <div style={field}>
      <span style={fieldLabel}>{label}</span>
      <div style={scaleRow}>
        {[1, 2, 3, 4, 5].map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onChange(String(number))}
            style={{ ...scaleButton, ...(Number(value) === number ? scaleButtonActive : {}) }}
          >
            {number}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({ label, value, target, suffix = "" }) {
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const remaining = Math.max(0, target - value);
  return (
    <div style={progressWrap}>
      <div style={progressLabelRow}>
        <strong>{label}</strong>
        <span>{value.toLocaleString()}{suffix} / {target.toLocaleString()}{suffix}</span>
      </div>
      <div style={barTrack}>
        <div style={{ ...barFill, width: `${percent}%`, background: percent >= 100 ? YELLOW : ACCENT }} />
      </div>
      <p style={mutedSmall}>{remaining.toLocaleString()}{suffix} remaining · {percent}% complete</p>
    </div>
  );
}

function MetricRow({ label, value, accent }) {
  return (
    <div style={compactRow}>
      <span>{label}</span>
      <strong style={accent ? { color: accent } : null}>{value}</strong>
    </div>
  );
}

function SummaryPanel({ title, eyebrowText, children }) {
  return (
    <section style={panel}>
      <p style={eyebrow}>{eyebrowText}</p>
      <h2 style={sectionTitle}>{title}</h2>
      <div style={summaryStack}>{children}</div>
    </section>
  );
}

function EmptyState({ copy }) {
  return <div style={emptyState}>{copy}</div>;
}

function WeightChart({ entries, averages }) {
  const values = [...entries.map((entry) => entry.value), ...averages.map((entry) => entry.value)].filter((value) => Number.isFinite(Number(value)));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(1, max - min);

  return (
    <div style={chartWrap} aria-label="Bodyweight chart">
      <div style={chart}>
        {entries.map((entry, index) => {
          const left = entries.length === 1 ? 50 : (index / (entries.length - 1)) * 100;
          const bottom = ((entry.value - min) / spread) * 72 + 10;
          const average = averages[index];
          const averageBottom = average ? ((average.value - min) / spread) * 72 + 10 : bottom;

          return (
            <div key={entry.date} style={{ ...chartPointColumn, left: `${left}%` }}>
              <span style={{ ...dailyDot, bottom: `${bottom}%` }} title={`${entry.date}: ${entry.value}`} />
              <span style={{ ...averageDot, bottom: `${averageBottom}%` }} title={`${entry.date}: avg ${average?.value || entry.value}`} />
            </div>
          );
        })}
      </div>
      <div style={chartLegend}>
        <span><i style={{ ...legendDot, background: "#555" }} /> Daily</span>
        <span><i style={{ ...legendDot, background: YELLOW }} /> 7-day average</span>
      </div>
    </div>
  );
}

function toForm(entry = {}) {
  return {
    ...EMPTY_FORM,
    ...Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, value ?? ""])),
    date: entry.date || getTodayKey(),
  };
}

function fromDailyForm(form) {
  const next = { date: form.date || getTodayKey(), notes: form.notes || "" };
  [
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
  ].forEach((field) => {
    if (form[field] !== "") next[field] = Number(form[field]);
  });
  return next;
}

function createMeasurementForm(seed = {}) {
  return {
    date: seed.date || getTodayKey(),
    unit: seed.unit || "in",
    measurements: seed.measurements || {},
    bodyweight: seed.bodyweight || "",
    notes: seed.notes || "",
  };
}

function fromMeasurementForm(form, activePhase) {
  const measurements = {};
  Object.entries(form.measurements || {}).forEach(([key, value]) => {
    if (value !== "") measurements[key] = Number(value);
  });
  return {
    date: form.date || getTodayKey(),
    unit: form.unit || "in",
    measurements,
    bodyweight: form.bodyweight || "",
    phaseId: activePhase?.id || "",
    notes: form.notes || "",
  };
}

function toPhaseForm(phase) {
  return {
    ...EMPTY_PHASE_FORM,
    ...Object.fromEntries(Object.entries(phase || {}).map(([key, value]) => [key, value ?? ""])),
    startDate: phase?.startDate || getTodayKey(),
    plannedEndDate: phase?.plannedEndDate || addDateDays(getTodayKey(), 55),
  };
}

function fromPhaseForm(form) {
  const numeric = [
    "startingWeight",
    "targetWeight",
    "endingWeight",
    "startingCalorieTarget",
    "currentCalorieTarget",
    "proteinTarget",
    "targetWeeklyWeightChangeMin",
    "targetWeeklyWeightChangeMax",
  ];
  const phase = {
    id: form.id || "",
    name: form.name || formatPhaseType(form.type),
    type: form.type || "lean-bulk",
    status: form.status || "planned",
    startDate: form.startDate || getTodayKey(),
    plannedEndDate: form.plannedEndDate || "",
    actualEndDate: form.actualEndDate || "",
    notes: form.notes || "",
  };
  numeric.forEach((field) => {
    if (form[field] !== "") phase[field] = Number(form[field]);
  });
  return phase;
}

function applyPhaseTypeDefaults(form) {
  const type = PHASE_TYPES.find((item) => item.id === form.type);
  if (!type) return form;
  return {
    ...form,
    targetWeeklyWeightChangeMin: form.targetWeeklyWeightChangeMin || type.defaults[0],
    targetWeeklyWeightChangeMax: form.targetWeeklyWeightChangeMax || type.defaults[1],
    name: form.name || type.label,
  };
}

function formatRecommendation(recommendation) {
  if (!recommendation) return "Insufficient data";
  if (recommendation.outcome === "increase") return `Increase ${recommendation.adjustment || 0} calories`;
  if (recommendation.outcome === "decrease") return `Decrease ${Math.abs(recommendation.adjustment || 0)} calories`;
  if (recommendation.outcome === "keep") return "Keep calories";
  if (recommendation.outcome === "unstable-data") return "Unstable data";
  return "Insufficient data";
}

function addDateDays(dateKey, days) {
  const [year, month, day] = String(dateKey || getTodayKey()).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return getTodayKey(date);
}

function getWorkoutMinutesForDate(workouts, dateKey) {
  const sessions = (workouts || []).filter((workout) => getTodayKey(new Date(workout.date || Date.now())) === dateKey);
  const manual = sessions.reduce((sum, workout) => sum + Number(workout.durationMinutes || workout.summary?.durationMinutes || 0), 0);
  if (manual) return manual;
  return "";
}

function buildGoals(profile, bests) {
  const goals = [
    { label: "Bench", current: findBest(bests, "bench") || Number(profile.benchPR || 0), target: Number(profile.goalBench || 315) },
    { label: "Squat", current: findBest(bests, "squat") || Number(profile.squatPR || 0), target: Number(profile.goalSquat || 0) },
    { label: "Deadlift", current: findBest(bests, "deadlift") || Number(profile.deadliftPR || 0), target: Number(profile.goalDeadlift || 0) },
    { label: "Bodyweight", current: Number(profile.weight || profile.bodyweight || 0), target: Number(profile.goalWeight || 0) },
  ];

  return goals
    .filter((goal) => goal.target > 0 || goal.current > 0)
    .map((goal) => ({
      ...goal,
      percent: goal.target > 0 ? Math.min(999, Math.round((goal.current / goal.target) * 100)) : 0,
      remaining: goal.target > 0 ? Math.max(0, goal.target - goal.current) : 0,
    }));
}

function buildExerciseBestFromPRs(prs) {
  return (prs || []).reduce((best, pr) => {
    const weight = Number(pr.weight || 0);
    if (pr.exercise && weight > 0) best[pr.exercise] = weight;
    return best;
  }, {});
}

function findBest(bests, keyword) {
  return Math.max(
    0,
    ...Object.entries(bests)
      .filter(([exercise]) => exercise.toLowerCase().includes(keyword))
      .map(([, weight]) => Number(weight || 0))
  );
}

function buildTrend(sessions) {
  if (sessions.length < 2) {
    return { label: "Building baseline", color: "#777", copy: "Log a few workouts and this will compare recent total volume.", source: "Needs at least two logged workouts." };
  }

  const recent = sessions.slice(-3).reduce((sum, session) => sum + session.volume, 0);
  const previous = sessions.slice(-6, -3).reduce((sum, session) => sum + session.volume, 0);
  if (!previous) {
    return {
      label: "Baseline set",
      color: ACCENT,
      copy: `${recent.toLocaleString()} lb lifted across your latest sessions.`,
      source: "Needs at least six workouts for a last-3 vs previous-3 comparison.",
    };
  }

  const change = Math.round(((recent - previous) / previous) * 100);
  const source = `Last 3 workouts: ${recent.toLocaleString()} lb. Previous 3: ${previous.toLocaleString()} lb.`;
  if (change > 5) return { label: `Up ${change}%`, color: GREEN, copy: "Recent total workout volume is trending up.", source };
  if (change < -5) return { label: `Down ${Math.abs(change)}%`, color: ORANGE, copy: "Recent total workout volume is lower. This may reflect recovery, fewer sets, or lighter sessions.", source };
  return { label: "Steady", color: ACCENT, copy: "Recent total workout volume is holding steady.", source };
}

const wrap = { maxWidth: 980, margin: "0 auto" };
const header = { marginBottom: 14 };
const eyebrow = { margin: 0, color: ACCENT, fontSize: 12, fontWeight: 850, textTransform: "uppercase" };
const title = { margin: "6px 0 0", fontSize: 34, lineHeight: 1 };
const sectionTabs = { display: "flex", gap: 8, overflowX: "auto", marginBottom: 14, paddingBottom: 2 };
const sectionTab = { flex: "0 0 auto", borderColor: "#2f3844", background: "linear-gradient(180deg, #12171d, #090c10)", color: "#b8b3a4", padding: "8px 14px" };
const sectionTabActive = { background: `linear-gradient(135deg, ${ACCENT}, ${YELLOW})`, borderColor: ACCENT, color: "#020305", boxShadow: "0 0 20px rgba(33, 217, 255, 0.22)" };
const heroPanel = { border: "1px solid rgba(33, 217, 255, 0.38)", borderRadius: 12, background: "linear-gradient(135deg, rgba(33, 217, 255, 0.18), rgba(239, 255, 56, 0.09)), #10151b", padding: 14, marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", boxShadow: "inset 0 1px 0 rgba(255, 253, 242, 0.08), 0 0 30px rgba(33, 217, 255, 0.08)" };
const heroLabel = { display: "block", color: "#b8b3a4", fontSize: 12, fontWeight: 850, textTransform: "uppercase" };
const heroTitle = { margin: "5px 0 0", color: ACCENT, fontSize: 28, lineHeight: 1 };
const heroTrend = { minWidth: 120, textAlign: "right" };
const heroTrendValue = { display: "block", marginTop: 5, fontSize: 24, lineHeight: 1 };
const heroMini = { display: "block", marginTop: 6, color: "#9a9689", fontSize: 12, fontWeight: 750 };
const compactPrimary = { marginTop: 10, padding: "8px 12px" };
const panel = { border: "1px solid #2f3844", borderRadius: 12, background: "linear-gradient(180deg, #151a20, #0f1217)", padding: 14, marginBottom: 14, boxShadow: "inset 0 1px 0 rgba(255, 253, 242, 0.045)" };
const panelHeader = { marginBottom: 12 };
const sectionHeaderRow = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 };
const sectionTitle = { margin: "5px 0 0", fontSize: 22 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 };
const goalList = { display: "grid", gap: 10 };
const goalCard = { border: "1px solid #26313d", borderRadius: 10, background: "linear-gradient(180deg, #11161c, #0a0d11)", padding: 12 };
const goalTop = { display: "flex", justifyContent: "space-between", gap: 12 };
const goalTitle = { margin: 0, fontSize: 17 };
const goalPercent = { fontSize: 22 };
const muted = { margin: "7px 0 0", color: "#9a9689", fontWeight: 750, lineHeight: 1.35 };
const mutedSmall = { margin: "4px 0 0", color: "#8b867a", fontSize: 13, fontWeight: 750 };
const barTrack = { height: 8, borderRadius: 999, background: "#06080b", overflow: "hidden", marginTop: 8, border: "1px solid #1d2630" };
const barFill = { height: "100%", borderRadius: 999 };
const goalCopy = { margin: "8px 0 0", color: "#b8b3a4", fontSize: 13, fontWeight: 750 };
const trendBox = { marginTop: 12 };
const trendValue = { fontSize: 30 };
const compactList = { display: "grid", gap: 8, marginTop: 12 };
const compactRow = { display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid #1d2630", padding: "8px 0", color: "#e5e1d3", alignItems: "center" };
const metricRows = { display: "grid", gap: 2 };
const insightRow = { border: "1px solid #26313d", borderRadius: 8, padding: 10, color: "#e5e1d3", background: "linear-gradient(180deg, #11161c, #0a0d11)", fontWeight: 750 };
const empty = { color: "#716d63", fontWeight: 850 };
const emptyState = { color: "#9a9689", border: "1px dashed #3a4654", borderRadius: 10, padding: 12, fontWeight: 800, background: "#0c0f13" };
const pillRow = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 };
const miniPill = { border: "1px solid #2f3844", borderRadius: 999, padding: "7px 10px", color: "#e5e1d3", background: "#0c0f13", fontSize: 12, fontWeight: 850 };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 };
const morningGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, alignItems: "end" };
const measurementGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 12 };
const field = { display: "grid", gap: 6, minWidth: 0 };
const fullField = { gridColumn: "1 / -1" };
const fieldLabel = { color: "#b8b3a4", fontSize: 12, fontWeight: 850, textTransform: "uppercase" };
const scaleRow = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 };
const scaleButton = { padding: "9px 0", borderRadius: 8, background: "#0c0f13", color: "#b8b3a4" };
const scaleButtonActive = { background: ACCENT, borderColor: ACCENT, color: "#050505" };
const saveHint = { color: "#9a9689", fontSize: 12, fontWeight: 850 };
const morningHint = { gridColumn: "1 / -1", margin: 0, color: "#9a9689", fontSize: 12, fontWeight: 750, lineHeight: 1.35 };
const stickyActions = { gridColumn: "1 / -1", position: "sticky", bottom: 78, zIndex: 10, display: "flex", justifyContent: "flex-end", paddingTop: 4 };
const saveButton = { minWidth: 150, minHeight: 42 };
const rangeTabs = { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" };
const rangeButton = { padding: "7px 10px", borderRadius: 999, color: "#b8b3a4", background: "#0c0f13" };
const rangeButtonActive = { color: "#050505", background: YELLOW, borderColor: YELLOW };
const targetGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 12 };
const saveTargetsButton = { width: "100%", marginTop: 12 };
const summaryStack = { display: "grid", gap: 10, marginTop: 12 };
const progressWrap = { display: "grid", gap: 2 };
const progressLabelRow = { display: "flex", justifyContent: "space-between", gap: 10, color: "#e5e1d3", fontSize: 13 };
const recoveryLabel = { margin: 0, color: GREEN, fontSize: 28 };
const chartWrap = { marginTop: 14 };
const chart = { position: "relative", height: 180, border: "1px solid #26313d", borderRadius: 10, background: "linear-gradient(180deg, #0b1117, #06080b)", overflow: "hidden" };
const chartPointColumn = { position: "absolute", top: 0, bottom: 0, width: 0 };
const dailyDot = { position: "absolute", width: 5, height: 5, marginLeft: -2, borderRadius: "50%", background: "#8b867a", opacity: 0.9 };
const averageDot = { position: "absolute", width: 10, height: 10, marginLeft: -5, borderRadius: "50%", background: YELLOW, boxShadow: "0 0 18px rgba(239, 255, 56, 0.42)" };
const chartLegend = { display: "flex", gap: 12, marginTop: 8, color: "#9a9689", fontSize: 12, fontWeight: 850 };
const legendDot = { display: "inline-block", width: 8, height: 8, borderRadius: "50%", marginRight: 5 };
const historyRow = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", border: "1px solid #26313d", borderRadius: 10, padding: 10, background: "linear-gradient(180deg, #11161c, #0a0d11)" };
const rowActions = { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" };
const smallButton = { padding: "7px 10px", borderRadius: 8 };
const activeSmallButton = { background: ACCENT, borderColor: ACCENT, color: "#050505" };
const dangerGhost = { ...smallButton, color: RED, borderColor: "rgba(255, 107, 44, 0.35)", background: "rgba(255, 107, 44, 0.08)" };
const ghostButton = { color: ACCENT, borderColor: "rgba(50, 207, 255, 0.35)", background: "rgba(50, 207, 255, 0.08)" };
const ratioStack = { display: "grid", gap: 2, textAlign: "right", minWidth: 84 };
const timeline = { display: "grid", gap: 10 };
const timelineItem = { border: "1px solid #26313d", borderRadius: 10, background: "linear-gradient(180deg, #11161c, #0a0d11)", overflow: "hidden" };
const activeTimelineItem = { borderColor: "rgba(239, 255, 56, 0.52)", boxShadow: "0 0 0 1px rgba(239, 255, 56, 0.12), 0 0 24px rgba(239, 255, 56, 0.08)" };
const timelineHeader = { width: "100%", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center", border: 0, borderRadius: 0, background: "transparent", textAlign: "left", padding: 12 };
const timelineDot = { width: 10, height: 10, borderRadius: "50%", background: YELLOW, boxShadow: "0 0 16px rgba(239, 255, 56, 0.42)" };
const timelineDetails = { borderTop: "1px solid #1d2630", padding: 12 };
