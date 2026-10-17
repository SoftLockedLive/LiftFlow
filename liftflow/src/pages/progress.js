import { useEffect, useMemo, useState } from "react";
import { getProfile } from "../lib/profile";
import { getManualPRs } from "../lib/manualPRs";
import { buildPRRecords } from "../lib/prRecords";
import { getWorkouts } from "../lib/workoutStorage";
import { buildProgressData } from "../lib/workoutAnalytics";

const ACCENT = "#21d9ff";
const YELLOW = "#efff38";
const GREEN = "#43f08d";
const ORANGE = "#ffb238";

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
  const goals = useMemo(() => buildGoals(profile, strengthBest), [profile, strengthBest]);
  const strengthTrend = useMemo(() => buildTrend(strengthData.sessions), [strengthData.sessions]);

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Trends Dashboard</p>
          <h1 style={title}>Progress</h1>
        </div>
      </header>

      <StrengthSection data={strengthDisplayData} goals={goals} trend={strengthTrend} />
    </div>
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
          <p style={heroLabel}>Top Strength Target</p>
          <h2 style={heroTitle}>{leadGoal.label}</h2>
          <p style={muted}>
            {leadGoal.current} / {leadGoal.target} lb ·{" "}
            {leadGoal.remaining > 0 ? `${leadGoal.remaining} lb left` : "Goal hit"}
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
          {goals.length === 0 && (
            <EmptyState copy="Log workouts or add profile goals to build your strength targets." />
          )}
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
            {Object.entries(data.exerciseBest)
              .slice(0, 6)
              .map(([exercise, weight]) => (
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

function GoalCard({ goal }) {
  return (
    <article style={goalCard}>
      <div style={goalTop}>
        <div>
          <h3 style={goalTitle}>{goal.label}</h3>
          <p style={muted}>
            {goal.current} / {goal.target} lb
          </p>
        </div>
        <strong style={{ ...goalPercent, color: goal.percent >= 100 ? YELLOW : ACCENT }}>{goal.percent}%</strong>
      </div>
      <div style={barTrack}>
        <div
          style={{
            ...barFill,
            width: `${Math.min(100, goal.percent)}%`,
            background: goal.percent >= 100 ? YELLOW : ACCENT,
          }}
        />
      </div>
      <p style={goalCopy}>{goal.remaining > 0 ? `${goal.remaining} lb to go` : "Goal hit"}</p>
    </article>
  );
}

function EmptyState({ copy }) {
  return <div style={emptyState}>{copy}</div>;
}

function buildGoals(profile, bests) {
  const goals = [
    {
      label: "Bench",
      current: findBest(bests, "bench") || Number(profile.benchPR || 0),
      target: Number(profile.goalBench || 315),
    },
    {
      label: "Squat",
      current: findBest(bests, "squat") || Number(profile.squatPR || 0),
      target: Number(profile.goalSquat || 0),
    },
    {
      label: "Deadlift",
      current: findBest(bests, "deadlift") || Number(profile.deadliftPR || 0),
      target: Number(profile.goalDeadlift || 0),
    },
    {
      label: "Bodyweight",
      current: Number(profile.weight || profile.bodyweight || 0),
      target: Number(profile.goalWeight || 0),
    },
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
      .map(([, weight]) => Number(weight || 0)),
  );
}

function buildTrend(sessions) {
  if (sessions.length < 2) {
    return {
      label: "Building baseline",
      color: "#777",
      copy: "Log a few workouts and this will compare recent total volume.",
      source: "Needs at least two logged workouts.",
    };
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
  if (change > 5)
    return { label: `Up ${change}%`, color: GREEN, copy: "Recent total workout volume is trending up.", source };
  if (change < -5)
    return {
      label: `Down ${Math.abs(change)}%`,
      color: ORANGE,
      copy: "Recent total workout volume is lower. This may reflect recovery, fewer sets, or lighter sessions.",
      source,
    };
  return { label: "Steady", color: ACCENT, copy: "Recent total workout volume is holding steady.", source };
}

const wrap = { maxWidth: 980, margin: "0 auto" };
const header = { marginBottom: 14 };
const eyebrow = { margin: 0, color: ACCENT, fontSize: 12, fontWeight: 850, textTransform: "uppercase" };
const title = { margin: "6px 0 0", fontSize: 34, lineHeight: 1 };
const heroPanel = {
  border: "1px solid rgba(33, 217, 255, 0.38)",
  borderRadius: 12,
  background: "linear-gradient(135deg, rgba(33, 217, 255, 0.18), rgba(239, 255, 56, 0.09)), #10151b",
  padding: 14,
  marginBottom: 14,
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  boxShadow: "inset 0 1px 0 rgba(255, 253, 242, 0.08), 0 0 30px rgba(33, 217, 255, 0.08)",
};

const heroLabel = { display: "block", color: "#b8b3a4", fontSize: 12, fontWeight: 850, textTransform: "uppercase" };
const heroTitle = { margin: "5px 0 0", color: ACCENT, fontSize: 28, lineHeight: 1 };
const heroTrend = { minWidth: 120, textAlign: "right" };
const heroTrendValue = { display: "block", marginTop: 5, fontSize: 24, lineHeight: 1 };
const heroMini = { display: "block", marginTop: 6, color: "#9a9689", fontSize: 12, fontWeight: 750 };
const panel = {
  border: "1px solid #2f3844",
  borderRadius: 12,
  background: "linear-gradient(180deg, #151a20, #0f1217)",
  padding: 14,
  marginBottom: 14,
  boxShadow: "inset 0 1px 0 rgba(255, 253, 242, 0.045)",
};

const panelHeader = { marginBottom: 12 };
const sectionTitle = { margin: "5px 0 0", fontSize: 22 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 };
const goalList = { display: "grid", gap: 10 };
const goalCard = {
  border: "1px solid #26313d",
  borderRadius: 10,
  background: "linear-gradient(180deg, #11161c, #0a0d11)",
  padding: 12,
};

const goalTop = { display: "flex", justifyContent: "space-between", gap: 12 };
const goalTitle = { margin: 0, fontSize: 17 };
const goalPercent = { fontSize: 22 };
const muted = { margin: "7px 0 0", color: "#9a9689", fontWeight: 750, lineHeight: 1.35 };
const mutedSmall = { margin: "4px 0 0", color: "#8b867a", fontSize: 13, fontWeight: 750 };
const barTrack = {
  height: 8,
  borderRadius: 999,
  background: "#06080b",
  overflow: "hidden",
  marginTop: 8,
  border: "1px solid #1d2630",
};

const barFill = { height: "100%", borderRadius: 999 };
const goalCopy = { margin: "8px 0 0", color: "#b8b3a4", fontSize: 13, fontWeight: 750 };
const trendBox = { marginTop: 12 };
const trendValue = { fontSize: 30 };
const compactList = { display: "grid", gap: 8, marginTop: 12 };
const compactRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  borderBottom: "1px solid #1d2630",
  padding: "8px 0",
  color: "#e5e1d3",
  alignItems: "center",
};

const empty = { color: "#716d63", fontWeight: 850 };
const emptyState = {
  color: "#9a9689",
  border: "1px dashed #3a4654",
  borderRadius: 10,
  padding: 12,
  fontWeight: 800,
  background: "#0c0f13",
};
