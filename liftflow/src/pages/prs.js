import { useEffect, useState } from "react";
import Card from "../components/Card";
import { getWorkouts } from "../lib/workoutStorage";
import { calculatePRs } from "../lib/engine";

export default function PRs() {
  const [prs, setPrs] = useState({});

  useEffect(() => {
    const workouts = getWorkouts();
    setPrs(calculatePRs(workouts));
  }, []);

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 700,
        margin: "0 auto",
      }}
    >
      <h1>Personal Records</h1>

      {Object.keys(prs).length === 0 ? (
        <Card>
          <p>No PRs recorded yet.</p>
        </Card>
      ) : (
        Object.entries(prs).map(
          ([exercise, pr]) => (
            <Card key={exercise}>
              <h2>{exercise}</h2>

              <p>
                🏆 Heaviest Weight:{" "}
                <b>{pr.maxWeight} lbs</b>
              </p>

              <p>
                📈 Estimated 1RM:{" "}
                <b>{pr.estimated1RM} lbs</b>
              </p>
            </Card>
          )
        )
      )}
    </div>
  );
}