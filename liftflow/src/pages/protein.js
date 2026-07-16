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
import {
  getDailyCheckIns,
  getProgressTargets,
  saveDailyCheckIn,
  saveProgressTargets,
} from "../lib/progressTracking";
import { buildPhaseTargets, getActivePhase, getPhases } from "../lib/progressPhase2";
import { colors, tint } from "../lib/theme";

const PROTEIN_QUICK_AMOUNTS = [2.5, 5, 10, 25];
const CALORIE_QUICK_AMOUNTS = [100, 250, 500];
const ACCENT = colors.success;
const CYAN = colors.brand;
const YELLOW = colors.accent;

export default function Nutrition() {
  const [proteinLog, setProteinLog] = useState({});
  const [checkIns, setCheckIns] = useState([]);
  const [targets, setTargets] = useState({ calorieTarget: 2800, proteinTarget: 160 });
  const [activePhase, setActivePhase] = useState(null);
  const [customProtein, setCustomProtein] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedTargets = getProgressTargets();
      setProteinLog(getProteinLog());
      setCheckIns(getDailyCheckIns());
      setTargets(savedTargets);
      setActivePhase(getActivePhase(getPhases()));
      setSelectedDate(getTodayKey());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const dateKey = selectedDate || getTodayKey();
  const entry = useMemo(() => getEntryForDate(checkIns, dateKey), [checkIns, dateKey]);
  const activeTargets = useMemo(() => buildPhaseTargets(targets, activePhase), [targets, activePhase]);
  const proteinSummary = useMemo(
    () => getProteinSummary(proteinLog, Number(activeTargets.proteinTarget || getProteinTarget())),
    [proteinLog, activeTargets.proteinTarget]
  );
  const caloriesToday = Number(entry.calories || 0);
  const proteinToday = Number(entry.protein ?? proteinLog[dateKey] ?? 0);
  const calorieTarget = Number(activeTargets.calorieTarget || 0);
  const proteinTarget = Number(activeTargets.proteinTarget || 0);
  const recentDays = useMemo(() => buildRecentDays(checkIns, proteinLog, activeTargets), [checkIns, proteinLog, activeTargets]);
  const calorieStreak = useMemo(() => buildCalorieStreak(checkIns, calorieTarget), [checkIns, calorieTarget]);

  function updateTargets(nextTargets) {
    const saved = saveProgressTargets(nextTargets);
    saveProteinTarget(saved.proteinTarget);
    setTargets(saved);
  }

  function saveCalories(amount) {
    const updated = saveDailyCheckIn({
      date: dateKey,
      calories: Math.max(0, Number(amount || 0)),
    });
    setCheckIns(updated);
  }

  function addCalories(amount) {
    saveCalories(caloriesToday + Number(amount || 0));
  }

  function saveProtein(amount) {
    const nextLog = setProteinForDay(amount, dateKey);
    setProteinLog(nextLog);
    setCheckIns(saveDailyCheckIn({ date: dateKey, protein: Number(nextLog[dateKey] || 0) }));
  }

  function addProteinAmount(amount) {
    const nextLog = addProtein(amount, dateKey);
    setProteinLog(nextLog);
    setCheckIns(saveDailyCheckIn({ date: dateKey, protein: Number(nextLog[dateKey] || 0) }));
  }

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Nutrition</p>
          <h1 style={title}>Calories + Protein</h1>
        </div>
        <div style={streakStack}>
          <div style={{ ...streakBadge, color: CYAN, borderColor: tint(CYAN, 0.38), background: tint(CYAN, 0.09) }}>
            <strong>{calorieStreak}</strong>
            <span>cal streak</span>
          </div>
          <div style={streakBadge}>
            <strong>{proteinSummary.streak}</strong>
            <span>protein streak</span>
          </div>
        </div>
      </header>

      <section style={dateCard}>
        <label style={field}>
          <span style={fieldLabel}>Tracking date</span>
          <input type="date" value={dateKey} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>
        {activePhase && <p style={muted}>Targets are coming from active phase: {activePhase.name}</p>}
      </section>

      <section className="protein-hero" style={heroCard}>
        <MacroHero
          label="Calories"
          value={caloriesToday}
          target={calorieTarget}
          unit=""
          color={CYAN}
        />
        <MacroHero
          label="Protein"
          value={proteinToday}
          target={proteinTarget}
          unit="g"
          color={ACCENT}
        />
      </section>

      <section style={grid}>
        <MacroLogger
          title="Calories"
          value={caloriesToday}
          target={calorieTarget}
          quickAmounts={CALORIE_QUICK_AMOUNTS}
          customValue={customCalories}
          setCustomValue={setCustomCalories}
          onAdd={addCalories}
          onSet={saveCalories}
          color={CYAN}
        />
        <MacroLogger
          title="Protein"
          value={proteinToday}
          target={proteinTarget}
          quickAmounts={PROTEIN_QUICK_AMOUNTS}
          customValue={customProtein}
          setCustomValue={setCustomProtein}
          onAdd={addProteinAmount}
          onSet={saveProtein}
          unit="g"
          color={ACCENT}
        />
      </section>

      <section style={card}>
        <h2 style={cardTitle}>Daily Targets</h2>
        <div style={targetGrid}>
          <label style={field}>
            <span style={fieldLabel}>Calories</span>
            <input
              type="number"
              value={activeTargets.calorieTarget || ""}
              onChange={(event) => updateTargets({ ...targets, calorieTarget: event.target.value })}
            />
          </label>
          <label style={field}>
            <span style={fieldLabel}>Protein (g)</span>
            <input
              type="number"
              value={activeTargets.proteinTarget || ""}
              onChange={(event) => updateTargets({ ...targets, proteinTarget: event.target.value })}
            />
          </label>
        </div>
      </section>

      <section style={card}>
        <h2 style={cardTitle}>Last 7 Days</h2>
        <div style={dayList}>
          {recentDays.map((day) => (
            <div key={day.key} className="protein-day-row" style={dayRow}>
              <div>
                <strong style={dayName}>{day.label}</strong>
                <p style={mutedSmall}>
                  {day.calories} cal / {calorieTarget} · {day.protein}g / {proteinTarget}g
                </p>
              </div>
              <div style={dualBars}>
                <div style={barTrack}>
                  <div style={{ ...barFill, width: `${day.caloriePercent}%`, background: CYAN }} />
                </div>
                <div style={barTrack}>
                  <div style={{ ...barFill, width: `${day.proteinPercent}%`, background: ACCENT }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MacroHero({ label, value, target, unit, color }) {
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const remaining = Math.max(0, target - value);

  return (
    <div style={heroMacro}>
      <div>
        <p style={heroLabel}>{label}</p>
        <div style={{ ...heroNumber, color }}>
          {value.toLocaleString()}
          <span style={heroUnit}>{unit}</span>
        </div>
        <p style={muted}>{remaining.toLocaleString()}{unit} left to hit {target.toLocaleString()}{unit}</p>
      </div>
      <div style={{ ...ring, borderColor: tint(color, 0.32), color }}>
        <span style={ringValue}>{percent}%</span>
      </div>
    </div>
  );
}

function MacroLogger({ title, value, target, quickAmounts, customValue, setCustomValue, onAdd, onSet, unit = "", color }) {
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;

  return (
    <section style={card}>
      <div style={cardHeader}>
        <div>
          <h2 style={cardTitle}>{title}</h2>
          <p style={mutedSmall}>{value.toLocaleString()}{unit} / {target.toLocaleString()}{unit} · {percent}%</p>
        </div>
        <button type="button" onClick={() => onSet(0)} style={{ ...ghostButton, color, borderColor: tint(color, 0.32) }}>
          Clear
        </button>
      </div>

      <div className="protein-quick-grid" style={quickGrid}>
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onAdd(amount)}
            style={{ ...quickButton, color: colors.textSoft, borderColor: colors.border, background: colors.surfaceSoft }}
          >
            +{amount}{unit}
          </button>
        ))}
      </div>

      <div className="protein-custom-row" style={customRow}>
        <input
          type="number"
          placeholder={`Add ${title.toLowerCase()}`}
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
        />
        <button
          type="button"
          className="primary"
          onClick={() => {
            onAdd(customValue);
            setCustomValue("");
          }}
          style={{ ...addButton, background: color, borderColor: color }}
        >
          Add
        </button>
      </div>

      <label style={{ ...field, marginTop: 12 }}>
        <span style={fieldLabel}>Direct total</span>
        <input type="number" value={value || ""} onChange={(event) => onSet(event.target.value)} />
      </label>
    </section>
  );
}

function buildRecentDays(checkIns, proteinLog, targets) {
  const formatter = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" });
  const days = [];

  for (let i = 0; i < 7; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = getTodayKey(date);
    const entry = getEntryForDate(checkIns, key);
    const calories = Number(entry.calories || 0);
    const protein = Number(entry.protein ?? proteinLog[key] ?? 0);

    days.push({
      key,
      label: i === 0 ? "Today" : formatter.format(date),
      calories,
      protein,
      caloriePercent: targets.calorieTarget > 0 ? Math.min(100, Math.round((calories / targets.calorieTarget) * 100)) : 0,
      proteinPercent: targets.proteinTarget > 0 ? Math.min(100, Math.round((protein / targets.proteinTarget) * 100)) : 0,
    });
  }

  return days;
}

function getEntryForDate(checkIns, dateKey) {
  return (checkIns || []).find((entry) => entry.date === dateKey) || {};
}

function buildCalorieStreak(checkIns, target) {
  const calorieTarget = Number(target || 0);
  if (calorieTarget <= 0) return 0;

  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const entry = getEntryForDate(checkIns, getTodayKey(date));
    if (Number(entry.calories || 0) < calorieTarget) break;
    streak += 1;
  }
  return streak;
}

const wrap = {
  maxWidth: 820,
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const eyebrow = {
  margin: 0,
  color: YELLOW,
  fontSize: 14,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 32,
  lineHeight: 1,
};

const streakStack = {
  display: "grid",
  gap: 6,
  flex: "0 0 auto",
};

const streakBadge = {
  border: `1px solid ${tint(colors.success, 0.42)}`,
  borderRadius: 10,
  padding: "6px 8px",
  color: colors.success,
  background: tint(colors.success, 0.11),
  fontWeight: 850,
  boxShadow: `0 0 18px ${tint(colors.success, 0.12)}`,
  display: "grid",
  gap: 1,
  minWidth: 82,
  textAlign: "center",
  fontSize: 11,
  lineHeight: 1.1,
  textTransform: "uppercase",
};

const dateCard = {
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  background: `linear-gradient(180deg, ${colors.surfaceRaised}, ${colors.surface})`,
  padding: 12,
  marginBottom: 14,
};

const heroCard = {
  display: "flex",
  flexWrap: "wrap",
  border: `1px solid ${tint(colors.brand, 0.36)}`,
  borderRadius: 16,
  background: `linear-gradient(135deg, ${tint(colors.brand, 0.12)}, ${tint(colors.accent, 0.06)}), ${colors.surface}`,
  padding: 16,
  justifyContent: "space-between",
  alignItems: "stretch",
  gap: 14,
  marginBottom: 14,
  boxShadow: `inset 0 1px 0 ${tint(colors.text, 0.06)}, 0 0 28px ${tint(colors.brand, 0.08)}`,
};

const heroMacro = {
  flex: "1 1 300px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  minWidth: 0,
  border: `1px solid ${colors.borderSoft}`,
  borderRadius: 12,
  background: `linear-gradient(180deg, ${colors.surfaceRaised}, ${colors.surfaceSoft})`,
  padding: 12,
};

const heroLabel = {
  margin: 0,
  color: colors.muted,
  fontWeight: 850,
  textTransform: "uppercase",
};

const heroNumber = {
  marginTop: 6,
  fontSize: 40,
  lineHeight: 1,
  fontWeight: 900,
};

const heroUnit = {
  fontSize: 20,
  marginLeft: 4,
};

const muted = {
  margin: "10px 0 0",
  color: colors.muted,
  fontWeight: 750,
};

const ring = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  border: "7px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
};

const ringValue = {
  fontWeight: 900,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14,
};

const card = {
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  background: `linear-gradient(180deg, ${colors.surfaceRaised}, ${colors.surface})`,
  padding: 16,
  marginBottom: 14,
  boxShadow: `inset 0 1px 0 ${tint(colors.text, 0.045)}`,
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

const field = {
  display: "grid",
  gap: 6,
};

const fieldLabel = {
  color: colors.muted,
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const ghostButton = {
  background: colors.surfaceSoft,
};

const quickGrid = {
  gap: 10,
};

const quickButton = {
};

const customRow = {
  gridTemplateColumns: "1fr auto",
  gap: 10,
  marginTop: 12,
};

const addButton = {
  minWidth: 92,
  color: colors.inverse,
};

const targetGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginTop: 12,
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
  color: colors.text,
};

const mutedSmall = {
  margin: "4px 0 0",
  color: colors.mutedStrong,
  fontSize: 13,
  fontWeight: 750,
};

const dualBars = {
  display: "grid",
  gap: 6,
};

const barTrack = {
  height: 8,
  borderRadius: 999,
  background: colors.surfaceDeep,
  border: `1px solid ${colors.borderSoft}`,
  overflow: "hidden",
};

const barFill = {
  height: "100%",
  borderRadius: 999,
};
