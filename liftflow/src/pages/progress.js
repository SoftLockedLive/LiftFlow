import { useEffect, useMemo, useState } from "react";
import { getBigThree } from "../lib/bigThree";
import { getProfile } from "../lib/profile";
import { getManualPRs } from "../lib/manualPRs";
import { buildPRRecords } from "../lib/prRecords";
import { getWorkouts } from "../lib/workoutStorage";
import { buildProgressData } from "../lib/workoutAnalytics";
import { colors, radii, type } from "../lib/theme";

export default function Progress() {
  const [workouts, setWorkouts] = useState([]);
  const [manualPrs, setManualPrs] = useState([]);
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWorkouts(getWorkouts());
      setManualPrs(getManualPRs());
      setProfile(getProfile());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const strengthData = useMemo(() => buildProgressData(workouts), [workouts]);
  const strengthPrRecords = useMemo(() => buildPRRecords(workouts, manualPrs), [workouts, manualPrs]);
  const strengthBest = useMemo(() => buildExerciseBestFromPRs(strengthPrRecords), [strengthPrRecords]);
  const strengthDisplayData = useMemo(
    () => ({ ...strengthData, exerciseBest: strengthBest }),
    [strengthData, strengthBest],
  );
  const goals = useMemo(() => buildGoals(profile, getBigThree(workouts, manualPrs)), [profile, workouts, manualPrs]);
  const strengthTrend = useMemo(() => buildTrend(strengthData.sessions), [strengthData.sessions]);

  return (
    <div style={wrap}>
      <header style={pageHeader}>
        <h1 style={type.pageTitle}>Progress</h1>
      </header>

      <StrengthSection data={strengthDisplayData} goals={goals} trend={strengthTrend} />
    </div>
  );
}

function StrengthSection({ data, goals, trend }) {
  const leadGoal = goals.find((goal) => goal.target > 0 && goal.label !== "Bodyweight") ||
    goals[0] || { label: "Bench", current: 0, target: 0, percent: 0, remaining: 0 };
  const exerciseBest = Object.entries(data.exerciseBest).slice(0, 6);

  return (
    <>
      <section style={heroCard}>
        <div style={heroTop}>
          <div style={{ minWidth: 0 }}>
            <p style={type.eyebrow}>Top strength target</p>
            <h2 style={heroTitle}>{leadGoal.label}</h2>
          </div>
          <div style={heroTrend}>
            <span style={type.meta}>Volume trend</span>
            <strong style={{ ...heroTrendValue, color: trend.color }}>{trend.label}</strong>
            <span style={heroMini}>Last 3 vs previous 3 workouts</span>
          </div>
        </div>
        <div>
          <p style={heroMeta}>
            {leadGoal.target > 0 ? (
              <>
                {leadGoal.current} / {leadGoal.target} lb ·{" "}
                {leadGoal.remaining > 0 ? `${leadGoal.remaining} lb left` : "Goal hit"}
              </>
            ) : (
              <>{leadGoal.current} lb · No goal set</>
            )}
          </p>
          {leadGoal.target > 0 && <ProgressBar percent={leadGoal.percent} />}
        </div>
      </section>

      <section style={card}>
        <h2 style={type.sectionTitle}>Strength targets</h2>
        <div style={goalList}>
          {goals.map((goal, index) => (
            <GoalRow key={goal.label} goal={goal} first={index === 0} />
          ))}
          {goals.length === 0 && (
            <EmptyState copy="Log workouts or add profile goals to build your strength targets." />
          )}
        </div>
      </section>

      <section style={grid}>
        <section style={card}>
          <h2 style={type.sectionTitle}>Recent volume</h2>
          <div style={trendBox}>
            <strong style={{ ...trendValue, color: trend.color }}>{trend.label}</strong>
            <p style={trendCopy}>{trend.copy}</p>
            <p style={trendSource}>{trend.source}</p>
          </div>
        </section>

        <section style={card}>
          <h2 style={type.sectionTitle}>Top lifts</h2>
          <div style={compactList}>
            {exerciseBest.map(([exercise, weight], index) => (
              <div key={exercise} style={{ ...compactRow, ...(index === 0 ? { borderTop: 0 } : {}) }}>
                <span style={compactName}>{exercise}</span>
                <strong style={compactValue}>
                  {weight}
                  <span style={unit}> lb</span>
                </strong>
              </div>
            ))}
            {exerciseBest.length === 0 && <EmptyState copy="Log workouts to build this list." />}
          </div>
        </section>
      </section>
    </>
  );
}

function GoalRow({ goal, first }) {
  const hasTarget = goal.target > 0;
  const hit = hasTarget && goal.percent >= 100;

  return (
    <article style={{ ...goalRow, ...(first ? { borderTop: 0, paddingTop: 0 } : {}) }}>
      <div style={goalTop}>
        <div style={{ minWidth: 0 }}>
          <h3 style={goalTitle}>{goal.label}</h3>
          <p style={goalMeta}>{hasTarget ? `${goal.current} / ${goal.target} lb` : `${goal.current} lb`}</p>
        </div>
        {hasTarget ? (
          <strong style={{ ...goalPercent, color: hit ? colors.accent : colors.text }}>{goal.percent}%</strong>
        ) : (
          <span style={goalMeta}>No goal set</span>
        )}
      </div>
      {hasTarget && (
        <>
          <ProgressBar percent={goal.percent} />
          <p style={goalCopy}>{goal.remaining > 0 ? `${goal.remaining} lb to go` : "Goal hit"}</p>
        </>
      )}
    </article>
  );
}

function ProgressBar({ percent }) {
  const hit = percent >= 100;
  return (
    <div
      style={barTrack}
      role="progressbar"
      aria-valuenow={Math.min(100, percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        style={{ ...barFill, width: `${Math.min(100, percent)}%`, background: hit ? colors.accent : colors.brand }}
      />
    </div>
  );
}

function EmptyState({ copy }) {
  return <div style={emptyState}>{copy}</div>;
}

function buildGoals(profile, bigThree) {
  const lift = (label) => bigThree.lifts.find((item) => item.label === label)?.value || 0;
  const goals = [
    { label: "Bench", current: lift("Bench"), target: Number(profile.goalBench || 0) },
    { label: "Squat", current: lift("Squat"), target: Number(profile.goalSquat || 0) },
    { label: "Deadlift", current: lift("Deadlift"), target: Number(profile.goalDeadlift || 0) },
    {
      label: "Bodyweight",
      current: Number(profile.weight || profile.bodyweight || 0),
      target: Number(profile.goalWeight || 0),
      start: Number(profile.startWeight || 0),
    },
  ];

  return goals.filter((goal) => goal.target > 0 || goal.current > 0).map(withProgress);
}

function withProgress(goal) {
  const { current, target, start } = goal;
  if (!(target > 0)) return { ...goal, percent: 0, remaining: 0 };

  // A bodyweight goal below the current (or starting) weight is a cut: progress means going down.
  const losing = goal.label === "Bodyweight" && (target < current || start > target);
  if (!losing) {
    return {
      ...goal,
      percent: Math.min(999, Math.round((current / target) * 100)),
      remaining: Math.max(0, target - current),
    };
  }

  const percent =
    current <= target
      ? 100
      : start > current
        ? Math.round(((start - current) / (start - target)) * 100)
        : Math.round((target / current) * 100);
  return { ...goal, percent, remaining: Math.max(0, current - target) };
}

function buildExerciseBestFromPRs(prs) {
  return (prs || []).reduce((best, pr) => {
    const weight = Number(pr.weight || 0);
    if (pr.exercise && weight > 0) best[pr.exercise] = weight;
    return best;
  }, {});
}

function buildTrend(sessions) {
  if (sessions.length < 2) {
    return {
      label: "Building baseline",
      color: colors.muted,
      copy: "Log a few workouts and this will compare recent total volume.",
      source: "Needs at least two logged workouts.",
    };
  }

  const recent = sessions.slice(-3).reduce((sum, session) => sum + session.volume, 0);
  const previous = sessions.slice(-6, -3).reduce((sum, session) => sum + session.volume, 0);
  // Comparing 3 sessions against 1 or 2 would report a fake jump.
  if (sessions.length < 6 || !previous) {
    return {
      label: "Baseline set",
      color: colors.text,
      copy: `${recent.toLocaleString()} lb lifted across your latest sessions.`,
      source: "Needs at least six workouts for a last-3 vs previous-3 comparison.",
    };
  }

  const change = Math.round(((recent - previous) / previous) * 100);
  const source = `Last 3 workouts: ${recent.toLocaleString()} lb. Previous 3: ${previous.toLocaleString()} lb.`;
  if (change > 5)
    return {
      label: `Up ${change}%`,
      color: colors.success,
      copy: "Recent total workout volume is trending up.",
      source,
    };
  if (change < -5)
    return {
      label: `Down ${Math.abs(change)}%`,
      color: colors.warning,
      copy: "Recent total workout volume is lower. This may reflect recovery, fewer sets, or lighter sessions.",
      source,
    };
  return { label: "Steady", color: colors.muted, copy: "Recent total workout volume is holding steady.", source };
}

const wrap = { display: "grid", gap: 16 };
const pageHeader = { display: "grid", gap: 6, padding: "8px 0 4px" };
const card = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  padding: 16,
};

const heroCard = { ...card, display: "grid", gap: 12 };
const heroTop = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 };
const heroTitle = { ...type.pageTitle, fontSize: 24, marginTop: 2 };
const heroMeta = { ...type.meta, ...type.number, margin: 0 };
const heroTrend = { flex: "0 1 auto", minWidth: 0, display: "grid", gap: 2, justifyItems: "end", textAlign: "right" };
const heroTrendValue = { ...type.number, fontSize: 22, fontWeight: 650, lineHeight: 1.2 };
const heroMini = { maxWidth: 150, color: colors.mutedStrong, fontSize: 12, lineHeight: 1.35 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 };
const goalList = { display: "grid", marginTop: 12 };
const goalRow = { padding: "12px 0", borderTop: `1px solid ${colors.borderSoft}` };
const goalTop = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const goalTitle = { margin: 0, color: colors.text, fontSize: 15, fontWeight: 550, lineHeight: 1.3 };
const goalMeta = { ...type.meta, ...type.number, margin: "2px 0 0" };
const goalPercent = { ...type.number, fontSize: 17, fontWeight: 650 };
const barTrack = {
  height: 6,
  borderRadius: radii.pill,
  background: colors.surfaceRaised,
  overflow: "hidden",
  marginTop: 8,
};

const barFill = { height: "100%", borderRadius: radii.pill };
const goalCopy = { ...type.meta, ...type.number, margin: "6px 0 0", fontSize: 12 };
const trendBox = { display: "grid", gap: 4, marginTop: 12 };
const trendValue = { ...type.number, fontSize: 24, fontWeight: 650, lineHeight: 1.2 };
const trendCopy = { ...type.body, margin: 0 };
const trendSource = { ...type.meta, ...type.number, margin: 0 };
const compactList = { display: "grid", marginTop: 8 };
const compactRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "10px 0",
  borderTop: `1px solid ${colors.borderSoft}`,
};

const compactName = { ...type.body, color: colors.text, minWidth: 0, overflowWrap: "anywhere" };
const compactValue = { ...type.number, color: colors.textSoft, fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" };
const unit = { color: colors.muted, fontWeight: 400 };
const emptyState = {
  ...type.meta,
  marginTop: 4,
  padding: "16px 12px",
  borderRadius: radii.lg,
  background: colors.surfaceSoft,
  border: `1px solid ${colors.borderSoft}`,
  textAlign: "center",
};
