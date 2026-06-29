import { useEffect, useState } from "react";

import Card from "../components/Card";

import { getPlan } from "../lib/plan";
import { getTodayName } from "../lib/today";
import { saveWorkout } from "../lib/workoutStorage";

import { getCoachState } from "../lib/coachState";

export default function Workout() {
  const [program, setProgram] = useState([]);
  const [session, setSession] = useState({});
  const [coach, setCoach] = useState({});

  useEffect(() => {
    const today = getTodayName();
    const plan = getPlan();

    const todayWorkout = plan[today]?.lifts || [];

    setProgram(todayWorkout);
    setCoach(getCoachState());
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

            {/* Coach suggestion hint */}
            {coach[lift.exercise]?.suggestedWeight && (
              <p style={{ opacity: 0.6 }}>
                Coach suggests:{" "}
                <b>{coach[lift.exercise].suggestedWeight} lbs</b>
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
                {/* WEIGHT INPUT */}
                <input
                  type="number"
                  placeholder={`Set ${i + 1} Weight`}
                  value={
                    session[lift.id]?.[i]?.weight ||
                    coach[lift.exercise]?.suggestedWeight ||
                    ""
                  }
                  onChange={(e) =>
                    updateSet(
                      lift.id,
                      i,
                      "weight",
                      e.target.value
                    )
                  }
                />

                {/* REPS INPUT */}
                <input
                  type="number"
                  placeholder={`Set ${i + 1} Reps`}
                  value={
                    session[lift.id]?.[i]?.reps || ""
                  }
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