import { useEffect, useState } from "react";
import { getWorkouts } from "../lib/storage";

export default function History() {
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    setWorkouts(getWorkouts());
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h1>History</h1>

      {workouts.map((w, i) => (
        <div key={i} style={{
          background: "#111827",
          padding: 12,
          borderRadius: 10,
          marginBottom: 10,
          borderLeft: "3px solid #00e5ff"
        }}>
          <b>{w.exercise}</b>
          <div>{w.weight} lbs × {w.reps}</div>
          <small>{new Date(w.date).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}