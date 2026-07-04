import { useEffect, useMemo, useState } from "react";
import { getMuscleGroup, tint } from "../lib/muscleGroups";
import { getWorkouts } from "../lib/workoutStorage";
import { buildProgressData } from "../lib/workoutAnalytics";

const ACCENT = "#32cfff";

export default function Progress() {
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWorkouts(getWorkouts());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const data = useMemo(() => buildProgressData(workouts), [workouts]);
  const recentSessions = data.sessions.slice(-8);
  const maxSessionVolume = Math.max(...recentSessions.map((session) => session.volume), 1);
  const muscleRows = Object.entries(data.muscleVolume)
    .map(([groupId, volume]) => ({ group: getMuscleGroup(groupId), volume }))
    .sort((a, b) => b.volume - a.volume);
  const maxMuscleVolume = Math.max(...muscleRows.map((row) => row.volume), 1);
  const bestRows = Object.entries(data.exerciseBest)
    .map(([exercise, weight]) => ({ exercise, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);
  const workoutFrequency = getWorkoutFrequency(data.sessions);

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
        <Stat label="Sets" value={data.totalSets} />
        <Stat label="Volume" value={`${data.totalVolume.toLocaleString()} lb`} />
      </section>

      <section style={grid}>
        <ChartCard title="Recent Volume">
          {recentSessions.length === 0 ? (
            <Empty />
          ) : (
            <div style={barList}>
              {recentSessions.map((session, index) => (
                <Bar
                  key={`${session.date || "session"}-${index}`}
                  label={formatDate(session.date)}
                  value={`${session.volume.toLocaleString()} lb`}
                  color={ACCENT}
                  percent={(session.volume / maxSessionVolume) * 100}
                />
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Muscle Volume">
          {muscleRows.length === 0 ? (
            <Empty />
          ) : (
            <div style={barList}>
              {muscleRows.map((row) => (
                <Bar
                  key={row.group.id}
                  label={row.group.label}
                  value={`${row.volume.toLocaleString()} lb`}
                  color={row.group.color}
                  percent={(row.volume / maxMuscleVolume) * 100}
                />
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Best Lifts">
          {bestRows.length === 0 ? (
            <Empty />
          ) : (
            <div style={bestGrid}>
              {bestRows.map((row) => (
                <div key={row.exercise} style={bestCard}>
                  <span style={smallLabel}>{row.exercise}</span>
                  <strong style={bestValue}>{row.weight} lb</strong>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Workout Frequency">
          <div style={frequencyGrid}>
            {workoutFrequency.map((day) => (
              <div key={day.label} style={freqItem}>
                <span style={freqLabel}>{day.label}</span>
                <strong style={{ ...freqValue, color: day.count ? ACCENT : "#444" }}>{day.count}</strong>
              </div>
            ))}
          </div>
        </ChartCard>
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

function ChartCard({ title, children }) {
  return (
    <section style={chartCard}>
      <h2 style={chartTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Bar({ label, value, color, percent }) {
  return (
    <div style={barRow}>
      <div style={barTop}>
        <span style={barLabel}>{label}</span>
        <strong style={{ ...barValue, color }}>{value}</strong>
      </div>
      <div style={barTrack}>
        <div style={{ ...barFill, width: `${Math.max(4, Math.min(100, percent))}%`, background: color, boxShadow: `0 0 16px ${tint(color, 0.22)}` }} />
      </div>
    </div>
  );
}

function Empty() {
  return <div style={empty}>Log workouts to build this chart.</div>;
}

function getWorkoutFrequency(sessions) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = labels.map((label) => ({ label, count: 0 }));

  sessions.forEach((session) => {
    if (!session.date) return;
    counts[new Date(session.date).getDay()].count += 1;
  });

  return counts;
}

function formatDate(date) {
  if (!date) return "Session";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
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

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const statCard = {
  border: "1px solid rgba(50, 207, 255, 0.3)",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
};

const chartCard = {
  border: "1px solid #242424",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
};

const chartTitle = {
  margin: "0 0 14px",
  fontSize: 22,
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
  marginTop: 8,
  color: ACCENT,
  fontSize: 24,
};

const barList = {
  display: "grid",
  gap: 12,
};

const barRow = {
  display: "grid",
  gap: 7,
};

const barTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
};

const barLabel = {
  color: "#bdbdb8",
  fontWeight: 800,
};

const barValue = {
  whiteSpace: "nowrap",
};

const barTrack = {
  height: 9,
  borderRadius: 999,
  background: "#060606",
  overflow: "hidden",
};

const barFill = {
  height: "100%",
  borderRadius: 999,
};

const bestGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const bestCard = {
  border: "1px solid #202020",
  borderRadius: 12,
  background: "#0b0b0b",
  padding: 12,
};

const bestValue = {
  display: "block",
  marginTop: 7,
  color: "#e4ff2f",
  fontSize: 19,
};

const frequencyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 7,
};

const freqItem = {
  border: "1px solid #202020",
  borderRadius: 12,
  background: "#0b0b0b",
  padding: "10px 6px",
  textAlign: "center",
};

const freqLabel = {
  display: "block",
  color: "#666",
  fontSize: 12,
  fontWeight: 850,
};

const freqValue = {
  display: "block",
  marginTop: 6,
  fontSize: 20,
};

const empty = {
  border: "1px solid #202020",
  borderRadius: 12,
  background: "#0b0b0b",
  padding: 16,
  color: "#555",
  textAlign: "center",
  fontWeight: 850,
};
