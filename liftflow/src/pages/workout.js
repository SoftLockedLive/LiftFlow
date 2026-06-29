import { useEffect, useState } from "react";
import Card from "../components/Card";

import { getTodayName } from "../lib/today";
import { buildTodaysWorkout } from "../lib/trainingEngine";
import { saveWorkout } from "../lib/workoutStorage";

export default function Workout() {
  const [program, setProgram] = useState([]);
  const [session, setSession] = useState({});

  useEffect(() => {
    const today = getTodayName();

    // 🔥 central orchestration layer
    const todaysWorkout = buildTodaysWorkout(today);

    setProgram(todaysWorkout);
  }, []);

  function updateSet(exerciseId, setIndex, field, value) {
    setSession((prev) => {
      const copy = { ...prev };

      if (!copy[exerciseId]) {
        copy[exerciseId] = [];
      }

      copy[exerciseId][setIndex] = {
        ...(copy[exerciseId][setIndex] || {}),
        [field]: Number(value),
      };

      return copy;
    });
  }

  function finishWorkout() {
    const completedWorkout = [];

    program.forEach((lift) => {
      completedWorkout.push({
        exercise: lift.exercise,
        sets: session[lift.id] || [],
        date: Date.now(),

        // optional future use (coach feedback storage)
        suggestedWeight: lift.suggestedWeight || null,
      });
    });

    saveWorkout(completedWorkout);

    alert("Workout saved!");
    setSession({});
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 700,
        margin: "0 auto",
      }}
    >
      <h1>Today's Workout</h1>

      {program.length === 0 ? (
        <Card>
          <p>No workout planned for today.</p>
        </Card>
      ) : (
        program.map((lift) => (
          <Card key={lift.id}>
            <h3>{lift.exercise}</h3>

            <p>
              Target: {lift.sets} × {lift.reps}
            </p>

            {/* Coach suggestion (non-blocking) */}
            {lift.suggestedWeight && (
              <p style={{ color: "#00e5ff" }}>
                Suggested Weight: {lift.suggestedWeight} lbs
              </p>
            )}

            {/* Coach note (optional) */}
            {lift.coachNote && (
              <p style={{ fontSize: 12, opacity: 0.8 }}>
                Coach: {lift.coachNote}
              </p>
            )}

            {Array.from({ length: lift.sets }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <input
                  type="number"
                  placeholder={`Set ${i + 1} Weight`}
                  value={session[lift.id]?.[i]?.weight || ""}
                  onChange={(e) =>
                    updateSet(
                      lift.id,
                      i,
                      "weight",
                      e.target.value
                    )
                  }
                />

                <input
                  type="number"
                  placeholder={`Set ${i + 1} Reps`}
                  value={session[lift.id]?.[i]?.reps || ""}
                  onChange={(e) =>
                    updateSet(
                      lift.id,
                      i,
                      "reps",
                      e.target.value
                    )
                  }
                />
              </div>
            ))}
          </Card>
        ))
      )}

      <button
        onClick={finishWorkout}
        style={{
          width: "100%",
          padding: 14,
          marginTop: 20,
          fontSize: 16,
        }}
      >
        Finish Workout
      </button>
    </div>
  );
}