import { useEffect, useMemo, useState } from "react";
import { RUNNING_PRESETS, addRun, deleteRun, getRunLog } from "../lib/running";

const ACCENT = "#32cfff";

export default function Running() {
  const [log, setLog] = useState([]);
  const [form, setForm] = useState({
    name: "Easy Run",
    distance: "",
    duration: "",
    effort: "Easy",
    notes: "",
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setLog(getRunLog()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const totals = useMemo(() => getWeeklyTotals(log), [log]);

  function applyPreset(preset) {
    setForm({
      ...form,
      name: preset.name,
      duration: preset.target,
      effort: preset.type,
      notes: preset.notes,
    });
  }

  function saveRun() {
    if (!form.name.trim()) return;
    setLog(addRun(form));
    setForm({ name: "Easy Run", distance: "", duration: "", effort: "Easy", notes: "" });
  }

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Conditioning</p>
          <h1 style={title}>Running</h1>
        </div>
      </header>

      <section className="history-stats" style={statsGrid}>
        <Stat label="Runs" value={totals.runs} />
        <Stat label="Miles" value={totals.distance || "--"} />
        <Stat label="Minutes" value={totals.minutes || "--"} />
      </section>

      <section style={panel}>
        <p style={label}>Default Runs</p>
        <div style={presetGrid}>
          {RUNNING_PRESETS.map((preset) => (
            <button key={preset.id} type="button" onClick={() => applyPreset(preset)} style={presetButton}>
              <strong>{preset.name}</strong>
              <span>{preset.target}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={panel}>
        <p style={label}>Log Run</p>
        <input
          placeholder="Run name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <div className="field-row" style={fieldRow}>
          <input
            placeholder="Distance miles"
            inputMode="decimal"
            value={form.distance}
            onChange={(event) => setForm({ ...form, distance: event.target.value })}
          />
          <input
            placeholder="Duration min"
            inputMode="decimal"
            value={form.duration}
            onChange={(event) => setForm({ ...form, duration: event.target.value })}
          />
        </div>
        <select value={form.effort} onChange={(event) => setForm({ ...form, effort: event.target.value })}>
          <option value="Easy">Easy</option>
          <option value="Zone 2">Zone 2</option>
          <option value="Tempo">Tempo</option>
          <option value="Speed">Speed</option>
          <option value="Hard">Hard</option>
        </select>
        <textarea
          placeholder="Notes..."
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          style={textarea}
        />
        <button type="button" className="primary" onClick={saveRun} style={fullButton}>
          Save Run
        </button>
      </section>

      <section style={panel}>
        <p style={label}>Recent Runs</p>
        <div style={list}>
          {log.slice(0, 8).map((entry) => (
            <article key={entry.id} style={runRow}>
              <div>
                <h2 style={runTitle}>{entry.name}</h2>
                <p style={runMeta}>
                  {formatDate(entry.date)} · {entry.distance || "--"} mi · {entry.duration || "--"} min · {entry.effort}
                </p>
                {entry.notes && <p style={runNotes}>{entry.notes}</p>}
              </div>
              <button type="button" onClick={() => setLog(deleteRun(entry.id))} style={deleteBtn}>
                Delete
              </button>
            </article>
          ))}
          {log.length === 0 && <div style={empty}>No runs logged yet.</div>}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={statCard}>
      <span style={statLabel}>{label}</span>
      <strong style={statValue}>{value}</strong>
    </div>
  );
}

function getWeeklyTotals(log) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const week = log.filter((entry) => Number(entry.date || 0) >= weekAgo);
  const distance = week.reduce((sum, entry) => sum + Number(entry.distance || 0), 0);
  const minutes = week.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
  return {
    runs: week.length,
    distance: distance ? Math.round(distance * 10) / 10 : 0,
    minutes: minutes ? Math.round(minutes) : 0,
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

const wrap = {
  maxWidth: 820,
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
  fontSize: 32,
};

const statsGrid = {
  gap: 12,
  marginBottom: 14,
};

const statCard = {
  border: "1px solid rgba(50, 207, 255, 0.3)",
  borderRadius: 12,
  background: "#101010",
  padding: 14,
};

const statLabel = {
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
  display: "grid",
  gap: 10,
};

const label = {
  margin: 0,
  color: ACCENT,
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const presetGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 8,
};

const presetButton = {
  borderRadius: 10,
  color: ACCENT,
  borderColor: "rgba(50, 207, 255, 0.35)",
  background: "rgba(50, 207, 255, 0.08)",
  display: "grid",
  gap: 4,
  textAlign: "left",
};

const fieldRow = {
  gap: 10,
};

const textarea = {
  width: "100%",
  minHeight: 84,
  resize: "vertical",
  borderRadius: 10,
  border: "1px solid #2b2b2b",
  background: "#0b0b0b",
  color: "#f7f7f2",
  padding: 10,
  font: "inherit",
  fontWeight: 700,
};

const fullButton = {
  width: "100%",
};

const list = {
  display: "grid",
  gap: 8,
};

const runRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  border: "1px solid #202020",
  borderRadius: 10,
  background: "#0b0b0b",
  padding: 12,
};

const runTitle = {
  margin: 0,
  color: ACCENT,
  fontSize: 18,
};

const runMeta = {
  margin: "5px 0 0",
  color: "#777",
  fontSize: 13,
};

const runNotes = {
  margin: "8px 0 0",
  color: "#d7d7d2",
};

const deleteBtn = {
  color: "#ff6b2c",
  borderColor: "rgba(255, 107, 44, 0.4)",
  background: "rgba(255, 107, 44, 0.1)",
  alignSelf: "flex-start",
};

const empty = {
  color: "#555",
  fontWeight: 850,
};
