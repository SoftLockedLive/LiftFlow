import { useEffect, useState } from "react";
import Card from "../components/Card";
import {
  getPlan,
  addExercise,
  removeExercise,
} from "../lib/plan";

export default function Plan() {
  const [plan, setPlan] = useState({});
  const [inputs, setInputs] = useState({});

  useEffect(() => {
    setPlan(getPlan());
  }, []);

  function refresh() {
    setPlan(getPlan());
  }

  function handleAdd(day) {
    const value = inputs[day];

    if (!value) return;

    addExercise(day, value);

    setInputs((prev) => ({
      ...prev,
      [day]: "",
    }));

    refresh();
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <h1>Training Plan</h1>

      {Object.keys(plan).map((day) => (
        <Card key={day}>
          <h2>{day}</h2>

          {/* Add exercise */}
          <div style={{ display: "flex", gap: 10 }}>
            <input
              placeholder="Add exercise"
              value={inputs[day] || ""}
              onChange={(e) =>
                setInputs({
                  ...inputs,
                  [day]: e.target.value,
                })
              }
            />

            <button
              onClick={() => handleAdd(day)}
            >
              Add
            </button>
          </div>

          {/* Exercise list */}
          <div style={{ marginTop: 10 }}>
            {plan[day]?.length === 0 && (
              <p>No exercises</p>
            )}

            {plan[day]?.map((ex) => (
              <div
                key={ex.id}
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  marginTop: 8,
                  padding: 8,
                  background:
                    "rgba(255,255,255,0.03)",
                  borderRadius: 6,
                }}
              >
                <span>
                  {ex.exercise} — {ex.sets}×
                  {ex.reps}
                </span>

                <button
                  onClick={() => {
                    removeExercise(day, ex.id);
                    refresh();
                  }}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}