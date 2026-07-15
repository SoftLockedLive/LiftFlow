import { useEffect, useMemo, useState } from "react";
import {
  MOBILITY_PRESETS,
  addMobilityLog,
  getMobilityLog,
  getMobilityRoutine,
  saveMobilityRoutine,
} from "../lib/mobility";

const ACCENT = "#32df76";

export default function Mobility() {
  const [routine, setRoutine] = useState([]);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState({});
  const [movement, setMovement] = useState({ name: "", mode: "time", target: "" });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRoutine(getMobilityRoutine());
      setLog(getMobilityLog());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const completedCount = useMemo(() => routine.filter((item) => done[item.id]).length, [done, routine]);

  function applyPreset(preset) {
    const next = preset.movements.map((item) => ({ ...item, id: crypto.randomUUID() }));
    setRoutine(saveMobilityRoutine(next));
    setDone({});
  }

  function addMovement() {
    if (!movement.name.trim()) return;
    const next = [
      ...routine,
      {
        id: crypto.randomUUID(),
        name: movement.name.trim(),
        mode: movement.mode,
        target: movement.target.trim(),
      },
    ];
    setRoutine(saveMobilityRoutine(next));
    setMovement({ name: "", mode: "time", target: "" });
  }

  function removeMovement(id) {
    setRoutine(saveMobilityRoutine(routine.filter((item) => item.id !== id)));
  }

  function finishSession() {
    setLog(addMobilityLog({
      completed: completedCount,
      total: routine.length,
      routine: routine.map((item) => ({ ...item, done: Boolean(done[item.id]) })),
    }));
    setDone({});
  }

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Mobility</p>
          <h1 style={title}>Daily Routine</h1>
        </div>
        <span style={count}>{completedCount}/{routine.length}</span>
      </header>

      <section style={panel}>
        <p style={label}>Preset Routines</p>
        <div style={presetGrid}>
          {MOBILITY_PRESETS.map((preset) => (
            <button key={preset.id} type="button" onClick={() => applyPreset(preset)} style={presetButton}>
              <strong>{preset.name}</strong>
              <span>{preset.goal}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={panel}>
        <div style={panelHeader}>
          <div>
            <p style={label}>Today</p>
            <h2 style={sectionTitle}>Mobility Work</h2>
          </div>
          <button type="button" className="primary" onClick={finishSession} disabled={routine.length === 0}>
            Log Session
          </button>
        </div>

        {routine.length === 0 ? (
          <div style={empty}>Choose a preset or build your own routine.</div>
        ) : (
          <div style={list}>
            {routine.map((item) => {
              const checked = Boolean(done[item.id]);
              return (
                <div key={item.id} style={{ ...routineRow, ...(checked ? routineDone : {}) }}>
                  <button type="button" onClick={() => setDone({ ...done, [item.id]: !checked })} style={{ ...check, ...(checked ? checkDone : {}) }}>
                    {checked ? "✓" : ""}
                  </button>
                  <div style={routineMain}>
                    <strong>{item.name}</strong>
                    <span>{item.target || item.mode}</span>
                  </div>
                  <button type="button" onClick={() => removeMovement(item.id)} style={removeBtn}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={panel}>
        <p style={label}>Build Your Own</p>
        <div className="field-row" style={fieldRow}>
          <input
            placeholder="Movement"
            value={movement.name}
            onChange={(event) => setMovement({ ...movement, name: event.target.value })}
          />
          <select value={movement.mode} onChange={(event) => setMovement({ ...movement, mode: event.target.value })}>
            <option value="time">Time</option>
            <option value="reps">Reps</option>
          </select>
        </div>
        <div style={addRow}>
          <input
            placeholder="Target, e.g. 60 sec/side"
            value={movement.target}
            onChange={(event) => setMovement({ ...movement, target: event.target.value })}
          />
          <button type="button" onClick={addMovement} style={addBtn}>
            Add
          </button>
        </div>
      </section>

      <section style={panel}>
        <p style={label}>Recent Sessions</p>
        <div style={list}>
          {log.slice(0, 5).map((entry) => (
            <div key={entry.id} style={logRow}>
              <strong>{formatDate(entry.date)}</strong>
              <span>{entry.completed}/{entry.total} done</span>
            </div>
          ))}
          {log.length === 0 && <div style={empty}>No mobility sessions logged yet.</div>}
        </div>
      </section>
    </div>
  );
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

const wrap = {
  maxWidth: 820,
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
  fontSize: 13,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 32,
};

const count = {
  color: ACCENT,
  border: "1px solid rgba(50, 223, 118, 0.35)",
  borderRadius: 999,
  background: "rgba(50, 223, 118, 0.08)",
  padding: "8px 12px",
  fontWeight: 850,
};

const panel = {
  border: "1px solid #242424",
  borderRadius: 12,
  background: "#101010",
  padding: 14,
  marginBottom: 14,
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  marginBottom: 12,
};

const label = {
  margin: "0 0 10px",
  color: ACCENT,
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const sectionTitle = {
  margin: 0,
  fontSize: 22,
};

const presetGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 8,
};

const presetButton = {
  borderRadius: 10,
  padding: 12,
  color: ACCENT,
  borderColor: "rgba(50, 223, 118, 0.32)",
  background: "rgba(50, 223, 118, 0.08)",
  display: "grid",
  gap: 5,
  textAlign: "left",
};

const list = {
  display: "grid",
  gap: 8,
};

const routineRow = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  border: "1px solid #202020",
  borderRadius: 10,
  background: "#0b0b0b",
  padding: 10,
};

const routineDone = {
  opacity: 0.62,
};

const check = {
  width: 30,
  height: 30,
  padding: 0,
  borderRadius: 8,
  color: "#050505",
};

const checkDone = {
  background: ACCENT,
  borderColor: ACCENT,
};

const routineMain = {
  display: "grid",
  gap: 3,
  flex: "1 1 auto",
};

const removeBtn = {
  color: "#ff6b2c",
  borderColor: "rgba(255, 107, 44, 0.4)",
  background: "rgba(255, 107, 44, 0.1)",
  padding: "7px 10px",
};

const fieldRow = {
  gap: 10,
};

const addRow = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
  marginTop: 10,
};

const addBtn = {
  color: ACCENT,
  borderColor: "rgba(50, 223, 118, 0.4)",
  background: "rgba(50, 223, 118, 0.1)",
};

const logRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: "#d7d7d2",
  borderBottom: "1px solid #202020",
  padding: "8px 0",
};

const empty = {
  color: "#555",
  fontWeight: 850,
};
