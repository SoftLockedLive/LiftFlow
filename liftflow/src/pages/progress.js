import { useEffect, useMemo, useState } from "react";
import { getProfile } from "../lib/profile";
import { getWorkouts } from "../lib/workoutStorage";
import { buildProgressData } from "../lib/workoutAnalytics";

const ACCENT = "#32cfff";
const YELLOW = "#e4ff2f";

export default function Progress() {
  const [workouts, setWorkouts] = useState([]);
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWorkouts(getWorkouts());
      setProfile(getProfile());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const data = useMemo(() => buildProgressData(workouts), [workouts]);
  const goals = useMemo(() => buildGoals(profile, data.exerciseBest), [profile, data.exerciseBest]);
  const trend = useMemo(() => buildTrend(data.sessions), [data.sessions]);

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Training Progress</p>
          <h1 style={title}>Progress</h1>
        </div>
      </header>

      <section className="history-stats" style={statsGrid}>
        <Stat label="Workouts" value={data.sessions.length} />
        <Stat label="Total Sets" value={data.totalSets} />
        <Stat label="Total Volume" value={`${data.totalVolume.toLocaleString()} lb`} />
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
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={statCard}>
      <span style={smallLabel}>{label}</span>
      <strong style={statValue}>{value}</strong>
    </div>
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
  if (change > 5) return { label: `Up ${change}%`, color: "#32df76", copy: "Your recent training volume is trending up." };
  if (change < -5) return { label: `Down ${Math.abs(change)}%`, color: "#ff9b34", copy: "Recent volume is lower. That may be recovery or a lighter week." };
  return { label: "Steady", color: ACCENT, copy: "Your recent volume is holding steady." };
}

const wrap = {
  maxWidth: 920,
  margin: "0 auto",
};

const header = {
  marginBottom: 18,
};

const eyebrow = {
  margin: 0,
  color: ACCENT,
  fontSize: 13,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 34,
  lineHeight: 1,
};

const statsGrid = {
  gap: 12,
  marginBottom: 16,
};

const statCard = {
  border: "1px solid rgba(50, 207, 255, 0.3)",
  borderRadius: 12,
  background: "#101010",
  padding: 14,
};

const smallLabel = {
  display: "block",
  color: "#666",
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const statValue = {
  display: "block",
  marginTop: 7,
  color: ACCENT,
  fontSize: 22,
};

const panel = {
  border: "1px solid #242424",
  borderRadius: 12,
  background: "#101010",
  padding: 14,
  marginBottom: 14,
};

const panelHeader = {
  marginBottom: 12,
};

const sectionTitle = {
  margin: "5px 0 0",
  fontSize: 22,
};

const goalList = {
  display: "grid",
  gap: 10,
};

const goalCard = {
  border: "1px solid #202020",
  borderRadius: 10,
  background: "#0b0b0b",
  padding: 12,
};

const goalTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};

const goalTitle = {
  margin: 0,
  fontSize: 17,
};

const goalPercent = {
  fontSize: 22,
};

const muted = {
  margin: "5px 0 0",
  color: "#777",
  fontWeight: 750,
};

const barTrack = {
  height: 8,
  borderRadius: 999,
  background: "#050505",
  overflow: "hidden",
  marginTop: 10,
};

const barFill = {
  height: "100%",
  borderRadius: 999,
};

const goalCopy = {
  margin: "8px 0 0",
  color: "#8a8a8a",
  fontSize: 13,
  fontWeight: 750,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const trendBox = {
  marginTop: 12,
};

const trendValue = {
  fontSize: 30,
};

const compactList = {
  display: "grid",
  gap: 8,
  marginTop: 12,
};

const compactRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  borderBottom: "1px solid #1d1d1d",
  padding: "8px 0",
  color: "#d7d7d2",
};

const empty = {
  color: "#555",
  fontWeight: 850,
};
