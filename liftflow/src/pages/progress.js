import { useEffect, useMemo, useState } from "react";
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
import { getTodayKey } from "../lib/protein";
import { getWorkouts } from "../lib/workoutStorage";
import { buildProgressData } from "../lib/workoutAnalytics";

const ACCENT = "#32cfff";
const YELLOW = "#e4ff2f";
const GREEN = "#32df76";
const ORANGE = "#ff9b34";
const RED = "#ff6b2c";
const SECTIONS = ["Overview", "Strength", "Body"];
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

export default function Progress() {
  const [workouts, setWorkouts] = useState([]);
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedTargets = getProgressTargets();
      const savedCheckIns = getDailyCheckIns();
      const today = getTodayKey();
      const todayEntry = savedCheckIns.find((entry) => entry.date === today);

      setWorkouts(getWorkouts());
      setProfile(getProfile());
      setTargets(savedTargets);
      setTargetDraft(savedTargets);
      setCheckIns(savedCheckIns);
      setForm(toForm(todayEntry || { date: today }));
      setEditingId(todayEntry?.id || "");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const strengthData = useMemo(() => buildProgressData(workouts), [workouts]);
  const goals = useMemo(() => buildGoals(profile, strengthData.exerciseBest), [profile, strengthData.exerciseBest]);
  const strengthTrend = useMemo(() => buildTrend(strengthData.sessions), [strengthData.sessions]);
  const activeTargets = useMemo(() => targets || targetDraft || {}, [targets, targetDraft]);
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
          onCheckIn={() => {
            setActiveSection("Body");
            window.setTimeout(() => document.getElementById("daily-check-in")?.scrollIntoView({ behavior: "smooth" }), 0);
          }}
        />
      )}

      {activeSection === "Strength" && (
        <StrengthSection data={strengthData} goals={goals} trend={strengthTrend} />
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
      </section>
    </>
  );
}

function StrengthSection({ data, goals, trend }) {
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
          <p style={heroLabel}>Main Target</p>
          <h2 style={heroTitle}>{leadGoal.label}</h2>
          <p style={muted}>
            {leadGoal.current} / {leadGoal.target} lb · {leadGoal.remaining > 0 ? `${leadGoal.remaining} lb left` : "Goal hit"}
          </p>
        </div>
        <div style={heroTrend}>
          <span style={heroLabel}>Trend</span>
          <strong style={{ ...heroTrendValue, color: trend.color }}>{trend.label}</strong>
          <span style={heroMini}>{data.sessions.length} workouts logged</span>
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
          <h2 style={sectionTitle}>Training Trend</h2>
          <div style={trendBox}>
            <strong style={{ ...trendValue, color: trend.color }}>{trend.label}</strong>
            <p style={muted}>{trend.copy}</p>
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
}) {
  const latestWeight = weights[weights.length - 1]?.value;
  const startWeight = weights[0]?.value;
  const changeSinceStart = latestWeight && startWeight ? Math.round((latestWeight - startWeight) * 10) / 10 : null;
  const averageCalories = averageDaily(checkIns, "calories", 7);
  const averageProtein = averageDaily(checkIns, "protein", 7);
  const averageSleep = averageDaily(checkIns, "sleepHours", 7);
  const averageSteps = averageDaily(checkIns, "steps", 7);
  const activeEntry = checkIns.find((entry) => entry.date === (form.date || getTodayKey())) || {};

  return (
    <>
      <section style={panel}>
        <div style={sectionHeaderRow}>
          <div>
            <p style={eyebrow}>Morning</p>
            <h2 style={sectionTitle}>Bodyweight</h2>
          </div>
          <span style={saveHint}>Best after waking</span>
        </div>
        <form onSubmit={saveMorningWeight} style={morningGrid}>
          <Field label="Date" type="date" value={form.date} onChange={(value) => updateForm("date", value)} />
          <Field label={`Morning bodyweight (${targets.weightUnit || "lb"})`} type="number" value={form.morningWeight} onChange={(value) => updateForm("morningWeight", value)} step="0.1" />
          <button type="submit" className="primary" style={saveButton}>
            Save Weight
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
          <Field label="Date" type="date" value={form.date} onChange={(value) => updateForm("date", value)} />
          <Field label="Steps" type="number" value={form.steps} onChange={(value) => updateForm("steps", value)} />
          <Field label="Sleep hours" type="number" value={form.sleepHours} onChange={(value) => updateForm("sleepHours", value)} step="0.25" />
          <Field label="Sleep score" type="number" value={form.sleepScore} onChange={(value) => updateForm("sleepScore", value)} />
          <Field label="Resting HR" type="number" value={form.restingHeartRate} onChange={(value) => updateForm("restingHeartRate", value)} />
          <ScaleField label="Energy" value={form.energy} onChange={(value) => updateForm("energy", value)} />
          <ScaleField label="Hunger" value={form.hunger} onChange={(value) => updateForm("hunger", value)} />
          <ScaleField label="Soreness" value={form.soreness} onChange={(value) => updateForm("soreness", value)} />
          <ScaleField label="Stress" value={form.stress} onChange={(value) => updateForm("stress", value)} />
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

function Field({ label, value, onChange, type = "text", step, as, children }) {
  return (
    <label style={field}>
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
    return { label: "Building baseline", color: "#777", copy: "Log a few workouts and this will compare your recent volume." };
  }

  const recent = sessions.slice(-3).reduce((sum, session) => sum + session.volume, 0);
  const previous = sessions.slice(-6, -3).reduce((sum, session) => sum + session.volume, 0);
  if (!previous) return { label: "Baseline set", color: ACCENT, copy: `${recent.toLocaleString()} lb lifted across your latest sessions.` };

  const change = Math.round(((recent - previous) / previous) * 100);
  if (change > 5) return { label: `Up ${change}%`, color: GREEN, copy: "Your recent training volume is trending up." };
  if (change < -5) return { label: `Down ${Math.abs(change)}%`, color: ORANGE, copy: "Recent volume is lower. That may be recovery or a lighter week." };
  return { label: "Steady", color: ACCENT, copy: "Your recent volume is holding steady." };
}

const wrap = { maxWidth: 980, margin: "0 auto" };
const header = { marginBottom: 14 };
const eyebrow = { margin: 0, color: ACCENT, fontSize: 12, fontWeight: 850, textTransform: "uppercase" };
const title = { margin: "6px 0 0", fontSize: 34, lineHeight: 1 };
const sectionTabs = { display: "flex", gap: 8, overflowX: "auto", marginBottom: 14, paddingBottom: 2 };
const sectionTab = { flex: "0 0 auto", borderColor: "#242424", background: "#050505", color: "#777", padding: "8px 14px" };
const sectionTabActive = { background: "#f7f7f2", borderColor: "#f7f7f2", color: "#050505" };
const heroPanel = { border: "1px solid rgba(50, 207, 255, 0.3)", borderRadius: 12, background: "linear-gradient(135deg, rgba(50, 207, 255, 0.12), rgba(228, 255, 47, 0.05))", padding: 14, marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" };
const heroLabel = { display: "block", color: "#777", fontSize: 12, fontWeight: 850, textTransform: "uppercase" };
const heroTitle = { margin: "5px 0 0", color: ACCENT, fontSize: 28, lineHeight: 1 };
const heroTrend = { minWidth: 120, textAlign: "right" };
const heroTrendValue = { display: "block", marginTop: 5, fontSize: 24, lineHeight: 1 };
const heroMini = { display: "block", marginTop: 6, color: "#777", fontSize: 12, fontWeight: 750 };
const compactPrimary = { marginTop: 10, padding: "8px 12px" };
const panel = { border: "1px solid #242424", borderRadius: 12, background: "#101010", padding: 14, marginBottom: 14 };
const panelHeader = { marginBottom: 12 };
const sectionHeaderRow = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 };
const sectionTitle = { margin: "5px 0 0", fontSize: 22 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 };
const goalList = { display: "grid", gap: 10 };
const goalCard = { border: "1px solid #202020", borderRadius: 10, background: "#0b0b0b", padding: 12 };
const goalTop = { display: "flex", justifyContent: "space-between", gap: 12 };
const goalTitle = { margin: 0, fontSize: 17 };
const goalPercent = { fontSize: 22 };
const muted = { margin: "7px 0 0", color: "#777", fontWeight: 750, lineHeight: 1.35 };
const mutedSmall = { margin: "4px 0 0", color: "#666", fontSize: 13, fontWeight: 750 };
const barTrack = { height: 8, borderRadius: 999, background: "#050505", overflow: "hidden", marginTop: 8, border: "1px solid #1d1d1d" };
const barFill = { height: "100%", borderRadius: 999 };
const goalCopy = { margin: "8px 0 0", color: "#8a8a8a", fontSize: 13, fontWeight: 750 };
const trendBox = { marginTop: 12 };
const trendValue = { fontSize: 30 };
const compactList = { display: "grid", gap: 8, marginTop: 12 };
const compactRow = { display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid #1d1d1d", padding: "8px 0", color: "#d7d7d2", alignItems: "center" };
const metricRows = { display: "grid", gap: 2 };
const insightRow = { border: "1px solid #1f1f1f", borderRadius: 8, padding: 10, color: "#d7d7d2", background: "#0b0b0b", fontWeight: 750 };
const empty = { color: "#555", fontWeight: 850 };
const emptyState = { color: "#666", border: "1px dashed #2a2a2a", borderRadius: 10, padding: 12, fontWeight: 800, background: "#0b0b0b" };
const pillRow = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 };
const miniPill = { border: "1px solid #242424", borderRadius: 999, padding: "7px 10px", color: "#aaa", background: "#0b0b0b", fontSize: 12, fontWeight: 850 };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 };
const morningGrid = { display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" };
const field = { display: "grid", gap: 6, minWidth: 0 };
const fieldLabel = { color: "#777", fontSize: 12, fontWeight: 850, textTransform: "uppercase" };
const scaleRow = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 };
const scaleButton = { padding: "9px 0", borderRadius: 8, background: "#0b0b0b", color: "#777" };
const scaleButtonActive = { background: ACCENT, borderColor: ACCENT, color: "#050505" };
const saveHint = { color: "#777", fontSize: 12, fontWeight: 850 };
const stickyActions = { gridColumn: "1 / -1", position: "sticky", bottom: 78, zIndex: 10, display: "flex", justifyContent: "flex-end", paddingTop: 4 };
const saveButton = { minWidth: 150 };
const rangeTabs = { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" };
const rangeButton = { padding: "7px 10px", borderRadius: 999, color: "#777", background: "#0b0b0b" };
const rangeButtonActive = { color: "#050505", background: YELLOW, borderColor: YELLOW };
const targetGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 12 };
const saveTargetsButton = { width: "100%", marginTop: 12 };
const summaryStack = { display: "grid", gap: 10, marginTop: 12 };
const progressWrap = { display: "grid", gap: 2 };
const progressLabelRow = { display: "flex", justifyContent: "space-between", gap: 10, color: "#d7d7d2", fontSize: 13 };
const recoveryLabel = { margin: 0, color: GREEN, fontSize: 28 };
const chartWrap = { marginTop: 14 };
const chart = { position: "relative", height: 180, border: "1px solid #202020", borderRadius: 10, background: "#080808", overflow: "hidden" };
const chartPointColumn = { position: "absolute", top: 0, bottom: 0, width: 0 };
const dailyDot = { position: "absolute", width: 5, height: 5, marginLeft: -2, borderRadius: "50%", background: "#666", opacity: 0.8 };
const averageDot = { position: "absolute", width: 10, height: 10, marginLeft: -5, borderRadius: "50%", background: YELLOW, boxShadow: "0 0 16px rgba(228, 255, 47, 0.35)" };
const chartLegend = { display: "flex", gap: 12, marginTop: 8, color: "#777", fontSize: 12, fontWeight: 850 };
const legendDot = { display: "inline-block", width: 8, height: 8, borderRadius: "50%", marginRight: 5 };
const historyRow = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", border: "1px solid #1f1f1f", borderRadius: 10, padding: 10, background: "#0b0b0b" };
const rowActions = { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" };
const smallButton = { padding: "7px 10px", borderRadius: 8 };
const dangerGhost = { ...smallButton, color: RED, borderColor: "rgba(255, 107, 44, 0.35)", background: "rgba(255, 107, 44, 0.08)" };
const ghostButton = { color: ACCENT, borderColor: "rgba(50, 207, 255, 0.35)", background: "rgba(50, 207, 255, 0.08)" };
