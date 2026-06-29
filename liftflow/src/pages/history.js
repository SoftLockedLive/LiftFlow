import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { getWorkouts } from "../lib/workoutStorage";

export default function History() {
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    const data = getWorkouts();

    // 🔥 force array safety
    setWorkouts(Array.isArray(data) ? data : []);
  }, []);

  // ---------------- SAFE DATE HANDLER ----------------
  function getWorkoutDate(workout) {
    // must be array or fallback
    if (!Array.isArray(workout)) return Date.now();

    // manual loop (NO .find)
    for (let i = 0; i < workout.length; i++) {
      const item = workout[i];
      if (item && item.date) {
        return item.date;
      }
    }

    return Date.now();
  }

  function formatDate(ts) {
    try {
      return new Date(ts).toLocaleDateString();
    } catch {
      return "Unknown date";
    }
  }

  return (
    <PageShell>
      <h2 style={{ marginBottom: 12 }}>History</h2>

      {/* EMPTY STATE */}
      {workouts.length === 0 ? (
        <div style={card}>No workouts logged yet</div>
      ) : (
        workouts.map((workout, index) => {
          const date = getWorkoutDate(workout);

          return (
            <div key={index} style={card}>
              {/* DATE HEADER */}
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {formatDate(date)}
              </div>

              {/* WORKOUT CONTENT */}
              <div style={{ marginTop: 8 }}>
                {Array.isArray(workout) ? (
                  workout.map((set, i) => (
                    <div key={i} style={{ marginTop: 6 }}>
                      <b>{set?.exercise || "Unknown exercise"}</b>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {set?.weight || 0} lbs × {set?.reps || 0}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Invalid workout data
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </PageShell>
  );
}

/* ================= STYLES ================= */

const card = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 12,
  padding: 12,
  marginBottom: 10,
};