import { useEffect, useMemo, useState } from "react";
import {
  addProtein,
  getProteinLog,
  getProteinSummary,
  getProteinTarget,
  getTodayKey,
  saveProteinTarget,
  setProteinForDay,
} from "../lib/protein";

const QUICK_AMOUNTS = [25, 35, 45, 60];
const ACCENT = "#32df76";

export default function Protein() {
  const [log, setLog] = useState({});
  const [target, setTarget] = useState(160);
  const [customAmount, setCustomAmount] = useState("");
  const [todayKey, setTodayKey] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLog(getProteinLog());
      setTarget(getProteinTarget());
      setTodayKey(getTodayKey());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const summary = useMemo(() => getProteinSummary(log, target), [log, target]);
  const recentDays = useMemo(() => buildRecentDays(log, target), [log, target]);

  function updateTarget(value) {
    setTarget(value);
    saveProteinTarget(value);
  }

  function add(amount) {
    setLog(addProtein(amount, todayKey || getTodayKey()));
  }

  function setToday(amount) {
    setLog(setProteinForDay(amount, todayKey || getTodayKey()));
  }

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Nutrition</p>
          <h1 style={title}>Protein</h1>
        </div>
        <div style={streakBadge}>{summary.streak} day streak</div>
      </header>

      <section className="protein-hero" style={heroCard}>
        <div>
          <p style={heroLabel}>Today</p>
          <div style={heroNumber}>
            {summary.today}
            <span style={heroUnit}>g</span>
          </div>
          <p style={muted}>{summary.remaining}g left to hit {summary.target}g</p>
        </div>

        <div style={ring}>
          <span style={ringValue}>{summary.percent}%</span>
        </div>
      </section>

      <section style={card}>
        <div style={cardHeader}>
          <h2 style={cardTitle}>Quick Log</h2>
          <button type="button" onClick={() => setToday(0)} style={ghostButton}>
            Clear
          </button>
        </div>

        <div className="protein-quick-grid" style={quickGrid}>
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => add(amount)}
              style={quickButton}
            >
              +{amount}g
            </button>
          ))}
        </div>

        <div className="protein-custom-row" style={customRow}>
          <input
            type="number"
            placeholder="Custom grams"
            value={customAmount}
            onChange={(event) => setCustomAmount(event.target.value)}
          />
          <button
            type="button"
            className="primary"
            onClick={() => {
              add(customAmount);
              setCustomAmount("");
            }}
            style={addButton}
          >
            Add
          </button>
        </div>
      </section>

      <section style={card}>
        <h2 style={cardTitle}>Daily Target</h2>
        <input
          type="number"
          value={target}
          onChange={(event) => updateTarget(Number(event.target.value))}
        />
      </section>

      <section style={card}>
        <h2 style={cardTitle}>Last 7 Days</h2>
        <div style={dayList}>
          {recentDays.map((day) => (
            <div key={day.key} className="protein-day-row" style={dayRow}>
              <div>
                <strong style={dayName}>{day.label}</strong>
                <p style={mutedSmall}>{day.total}g / {target}g</p>
              </div>
              <div style={barTrack}>
                <div style={{ ...barFill, width: `${day.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function buildRecentDays(log, target) {
  const formatter = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" });
  const days = [];

  for (let i = 0; i < 7; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = getTodayKey(date);
    const total = Number(log[key] || 0);

    days.push({
      key,
      label: i === 0 ? "Today" : formatter.format(date),
      total,
      percent: target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0,
    });
  }

  return days;
}

const wrap = {
  maxWidth: 760,
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 18,
};

const eyebrow = {
  margin: 0,
  color: ACCENT,
  fontSize: 14,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 34,
  lineHeight: 1,
};

const streakBadge = {
  border: "1px solid rgba(50, 223, 118, 0.4)",
  borderRadius: 999,
  padding: "8px 12px",
  color: ACCENT,
  background: "rgba(50, 223, 118, 0.1)",
  fontWeight: 850,
};

const heroCard = {
  border: "1px solid rgba(50, 223, 118, 0.4)",
  borderRadius: 16,
  background: "#101010",
  padding: 22,
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  marginBottom: 14,
};

const heroLabel = {
  margin: 0,
  color: "#777",
  fontWeight: 850,
  textTransform: "uppercase",
};

const heroNumber = {
  marginTop: 6,
  color: ACCENT,
  fontSize: 54,
  lineHeight: 1,
  fontWeight: 900,
};

const heroUnit = {
  fontSize: 22,
  marginLeft: 4,
};

const muted = {
  margin: "10px 0 0",
  color: "#777",
  fontWeight: 750,
};

const ring = {
  width: 88,
  height: 88,
  borderRadius: "50%",
  border: "8px solid rgba(50, 223, 118, 0.3)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: ACCENT,
  flex: "0 0 auto",
};

const ringValue = {
  fontWeight: 900,
};

const card = {
  border: "1px solid #242424",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
  marginBottom: 14,
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const cardTitle = {
  margin: 0,
  fontSize: 22,
};

const ghostButton = {
  color: ACCENT,
  borderColor: "rgba(50, 223, 118, 0.4)",
  background: "rgba(50, 223, 118, 0.08)",
};

const quickGrid = {
  gap: 10,
};

const quickButton = {
  color: ACCENT,
  borderColor: "rgba(50, 223, 118, 0.38)",
  background: "rgba(50, 223, 118, 0.1)",
};

const customRow = {
  gridTemplateColumns: "1fr auto",
  gap: 10,
  marginTop: 12,
};

const addButton = {
  minWidth: 92,
};

const dayList = {
  display: "grid",
  gap: 12,
  marginTop: 12,
};

const dayRow = {
  alignItems: "center",
  gap: 14,
};

const dayName = {
  color: "#f7f7f2",
};

const mutedSmall = {
  margin: "4px 0 0",
  color: "#666",
  fontSize: 13,
};

const barTrack = {
  height: 10,
  borderRadius: 999,
  background: "#050505",
  border: "1px solid #242424",
  overflow: "hidden",
};

const barFill = {
  height: "100%",
  borderRadius: 999,
  background: ACCENT,
};
