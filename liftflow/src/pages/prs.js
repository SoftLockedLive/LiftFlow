import { useEffect, useState } from "react";
import Card from "../components/Card";
import { getWorkouts } from "../lib/workoutStorage";
import { getPRs } from "../lib/engine";

export default function PRs() {
  const [prs, setPrs] = useState({});

  useEffect(() => {
    const workouts = getWorkouts();
    setPrs(getPRs(workouts));
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1>Personal Records</h1>

      <Card>
        {Object.keys(prs).length === 0 ? (
          <p>No PRs recorded yet</p>
        ) : (
          Object.entries(prs).map(([exercise, weight]) => (
            <p key={exercise}>
              <b>{exercise}</b>: {weight} lbs
            </p>
          ))
        )}
      </Card>
    </div>
  );
}