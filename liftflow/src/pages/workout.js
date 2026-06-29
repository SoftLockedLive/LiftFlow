import { useEffect, useState } from "react";
import Card from "../components/Card";
import { getPlan } from "../lib/plan";
import { getTodayName } from "../lib/today";
import { saveWorkout } from "../lib/workoutStorage";

export default function Workout() {
  const [todayWorkout, setTodayWorkout] = useState([]);
  const [session, setSession] = useState({});

  useEffect(() => {
    const today = getTodayName();
    const plan = getPlan();

    setTodayWorkout(plan[today] || []);
  }, []);

  function updateSet(exerciseId, setIndex, field, value) {
    setSession((prev) => {
      const next = { ...prev };

      if (!next[exerciseId]) next[exerciseId] = [];

      next[exerciseId][setIndex] = {
        ...(next[exerciseId][setIndex] || {}),
        [field]: Number(value),
      };

      return next;
    });
  }

  function finishWorkout() {
    const completedWorkout = todayWorkout.map((lift) => ({
      exercise: lift.exercise,
      sets: session[lift.id] || [],
      date: Date.now(),
    }));

    saveWorkout(completedWorkout);

    alert("Workout saved!");

    setSession({});
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1>Today's Workout</h1>

      {todayWorkout.length === 0 ? (
        <Card>
          <p>No workout planned for today.</p>
        </Card>
      ) : (
        todayWorkout.map((lift) => (
          <Card key={lift.id}>
            <h3>{lift.exercise}</h3>

            <p>
              Target: {lift.sets} × {lift.reps}
            </p>

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
                  value={
                    session[lift.id]?.[i]?.weight || ""
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