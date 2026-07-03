import { useEffect, useState } from "react";
import { getMuscleGroup, MUSCLE_GROUPS, tint } from "../lib/muscleGroups";
import { getPlan, savePlan } from "../lib/plan";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ACCENT = "#32cfff";

export default function Plan() {
  const [plan, setPlan] = useState({});
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [dayName, setDayName] = useState("");
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("chest");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedPlan = getPlan();
      setPlan(savedPlan);
      setDayName(savedPlan.__meta?.Monday?.name || "");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function selectDay(day) {
    setSelectedDay(day);
    setDayName(plan.__meta?.[day]?.name || "");
    clearForm();
  }

  function saveDayName(value) {
    setDayName(value);

    const updated = {
      ...plan,
      __meta: {
        ...(plan.__meta || {}),
        [selectedDay]: {
          ...(plan.__meta?.[selectedDay] || {}),
          name: value,
        },
      },
    };

    setPlan(updated);
    savePlan(updated);
  }

  function handleSaveExercise() {
    if (!exercise || !sets || !reps) return;

    const updated = { ...plan };
    const dayPlan = Array.isArray(updated[selectedDay]) ? updated[selectedDay] : [];

    if (editingId) {
      updated[selectedDay] = dayPlan.map((lift) =>
        lift.id === editingId
          ? {
              ...lift,
              exercise,
              muscleGroup,
              sets,
              reps,
            }
          : lift
      );
    } else {
      updated[selectedDay] = [
        ...dayPlan,
        {
        id: crypto.randomUUID(),
        exercise,
        muscleGroup,
        sets,
        reps,
        },
      ];
    }

    setPlan(updated);
    savePlan(updated);
    clearForm();
  }

  function clearForm() {
    setEditingId(null);
    setExercise("");
    setSets("");
    setReps("");
    setMuscleGroup("chest");
  }

  function startEdit(lift) {
    setEditingId(lift.id);
    setExercise(lift.exercise || "");
    setSets(String(lift.sets || ""));
    setReps(String(lift.reps || ""));
    setMuscleGroup(lift.muscleGroup || "other");
  }

  function handleDelete(id) {
    const updated = { ...plan };
    const dayPlan = Array.isArray(updated[selectedDay]) ? updated[selectedDay] : [];
    updated[selectedDay] = dayPlan.filter((lift) => lift.id !== id);

    setPlan(updated);
    savePlan(updated);
  }

  const todayPlan = Array.isArray(plan[selectedDay]) ? plan[selectedDay] : [];

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Program Builder</p>
          <h1 style={title}>Your Split</h1>
        </div>
        <span style={count}>{todayPlan.length} lifts</span>
      </header>

      <div style={dayRow}>
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => selectDay(day)}
            style={{
              ...dayBtn,
              ...(selectedDay === day ? activeDay : {}),
            }}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <section style={card}>
        <label style={label}>Day Focus</label>
        <input
          placeholder="Upper A, Push, Legs, Zone 2..."
          value={dayName}
          onChange={(event) => saveDayName(event.target.value)}
        />
      </section>

      <section style={card}>
        <h2 style={cardTitle}>{editingId ? "Edit Exercise" : "Add Exercise"}</h2>
        <input
          placeholder="Exercise"
          value={exercise}
          onChange={(event) => setExercise(event.target.value)}
        />

        <div className="field-row" style={fieldRow}>
          <input
            placeholder="Sets or range, e.g. 3-5"
            inputMode="numeric"
            value={sets}
            onChange={(event) => setSets(event.target.value)}
          />
          <input
            placeholder="Reps"
            type="number"
            value={reps}
            onChange={(event) => setReps(event.target.value)}
          />
        </div>

        <label style={label}>Muscle Group</label>
        <select value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}>
          {MUSCLE_GROUPS.map((group) => (
            <option key={group.id} value={group.id}>
              {group.label}
            </option>
          ))}
        </select>

        <button type="button" className="primary" onClick={handleSaveExercise} style={fullButton}>
          {editingId ? "Save Exercise" : "Add Exercise"}
        </button>
        {editingId && (
          <button type="button" onClick={clearForm} style={cancelBtn}>
            Cancel Edit
          </button>
        )}
      </section>

      <section style={list}>
        {todayPlan.length === 0 ? (
          <div style={empty}>No exercises for {selectedDay} yet.</div>
        ) : (
          todayPlan.map((lift) => {
            const group = getMuscleGroup(lift.muscleGroup);

            return (
            <article
              key={lift.id}
              style={{
                ...liftCard,
                borderColor: tint(group.color, 0.42),
                background: tint(group.color, 0.08),
              }}
            >
              <div>
                <h3 style={{ ...liftName, color: group.color }}>{lift.exercise}</h3>
                <p style={liftMeta}>
                  {group.label} · {lift.sets} sets x {lift.reps} reps
                </p>
              </div>

              <div style={actions}>
                <button type="button" onClick={() => startEdit(lift)} style={editBtn}>
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(lift.id)} style={removeBtn}>
                  Remove
                </button>
              </div>
            </article>
            );
          })
        )}
      </section>
    </div>
  );
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

const count = {
  border: "1px solid rgba(228, 255, 47, 0.35)",
  borderRadius: 999,
  padding: "8px 12px",
  color: ACCENT,
  background: "rgba(228, 255, 47, 0.08)",
  fontWeight: 850,
};

const dayRow = {
  display: "flex",
  overflowX: "auto",
  gap: 8,
  marginBottom: 14,
  paddingBottom: 6,
};

const dayBtn = {
  minWidth: 56,
  padding: "9px 12px",
  borderColor: "#242424",
  background: "#070707",
  color: "#666",
};

const activeDay = {
  borderColor: ACCENT,
  color: "#050505",
  background: "#f7f7f2",
};

const card = {
  border: "1px solid #242424",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
  marginBottom: 14,
  display: "grid",
  gap: 12,
};

const label = {
  color: "#777",
  fontWeight: 850,
  textTransform: "uppercase",
  fontSize: 13,
};

const cardTitle = {
  margin: 0,
  fontSize: 22,
};

const fieldRow = {
  gap: 10,
};

const fullButton = {
  width: "100%",
};

const cancelBtn = {
  color: "#aaa",
  borderColor: "#333",
  background: "#0b0b0b",
};

const list = {
  display: "grid",
  gap: 10,
};

const empty = {
  border: "1px solid #222",
  borderRadius: 16,
  background: "#0f0f0f",
  padding: 22,
  color: "#555",
  textAlign: "center",
  fontWeight: 850,
};

const liftCard = {
  border: "1px solid #242424",
  borderRadius: 14,
  background: "#0f0f0f",
  padding: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
};

const actions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const editBtn = {
  color: ACCENT,
  borderColor: "rgba(50, 207, 255, 0.45)",
  background: "rgba(50, 207, 255, 0.12)",
};

const liftName = {
  margin: 0,
  color: ACCENT,
  fontSize: 20,
};

const liftMeta = {
  margin: "6px 0 0",
  color: "#777",
  fontWeight: 750,
};

const removeBtn = {
  color: "#ff6b2c",
  borderColor: "rgba(255, 107, 44, 0.45)",
  background: "rgba(255, 107, 44, 0.12)",
};
