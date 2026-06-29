import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { getPlan, savePlan } from "../lib/plan";

export default function Plan() {
  const [plan, setPlan] = useState({});
  const [selectedDay, setSelectedDay] = useState("Monday");

  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");

  // ---------------- LOAD ----------------
  useEffect(() => {
    setPlan(getPlan());
  }, []);

  // ---------------- ADD EXERCISE ----------------
  function handleAdd() {
    if (!exercise || !sets || !reps) return;

    const updated = { ...plan };

    if (!updated[selectedDay]) {
      updated[selectedDay] = [];
    }

    updated[selectedDay] = [
      ...updated[selectedDay],
      {
        id: crypto.randomUUID(),
        exercise,
        sets: Number(sets),
        reps: Number(reps),
      },
    ];

    setPlan(updated);
    savePlan(updated);

    setExercise("");
    setSets("");
    setReps("");
  }

  // ---------------- DELETE EXERCISE ----------------
  function handleDelete(id) {
    const updated = { ...plan };

    updated[selectedDay] = updated[selectedDay].filter(
      (lift) => lift.id !== id
    );

    setPlan(updated);
    savePlan(updated);
  }

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const todayPlan = plan[selectedDay] || [];

  return (
    <PageShell>
      <h2 style={{ marginBottom: 12 }}>Plan</h2>

      {/* DAY SELECTOR */}
      <div style={dayRow}>
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              ...dayBtn,
              ...(selectedDay === day ? activeDay : {}),
            }}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* ADD FORM */}
      <div style={card}>
        <h3>Add Exercise</h3>

        <input
          placeholder="Exercise"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          style={input}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="Sets"
            type="number"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            style={input}
          />

          <input
            placeholder="Reps"
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            style={input}
          />
        </div>

        <button onClick={handleAdd} style={primaryBtn}>
          Add
        </button>
      </div>

      {/* LIST */}
      <div style={{ marginTop: 16 }}>
        {todayPlan.length === 0 ? (
          <div style={card}>
            No workouts for {selectedDay}
          </div>
        ) : (
          todayPlan.map((lift) => (
            <div key={lift.id} style={card}>
              <div style={row}>
                <div>
                  <b>{lift.exercise}</b>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {lift.sets} × {lift.reps}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(lift.id)}
                  style={deleteBtn}
                >
                  remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </PageShell>
  );
}

/* ================= STYLES ================= */

const dayRow = {
  display: "flex",
  overflowX: "auto",
  gap: 8,
  marginBottom: 16, // 🔥 increase spacing
  paddingBottom: 6, // 🔥 prevents visual collision
};

const dayBtn = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #1f2937",
  background: "#111827",
  color: "white",
  fontSize: 12,
  minWidth: 48
};

const activeDay = {
  borderColor: "#00e5ff",
  color: "#00e5ff",
};

const card = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 12,
  padding: 12,
  marginBottom: 10,
};

const input = {
  width: "100%",
  padding: 10,
  marginTop: 8,
  borderRadius: 8,
  border: "1px solid #333",
  background: "#0f172a",
  color: "white",
};

const primaryBtn = {
  marginTop: 10,
  width: "100%",
  padding: 10,
  borderRadius: 8,
  background: "#00e5ff",
  border: "none",
  fontWeight: 600,
};

const deleteBtn = {
  background: "#ef4444",
  border: "none",
  color: "white",
  padding: "6px 10px",
  borderRadius: 8,
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};