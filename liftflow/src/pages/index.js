import { useEffect, useState } from "react";
import { getWorkouts } from "../lib/workoutStorage";
import {
  calculateFatigue,
  intensityLevel,
  getPRs,
} from "../lib/engine";
import Card from "../components/Card";

export default function Home() {
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    setWorkouts(getWorkouts());
  }, []);

  const lastWorkout = workouts[workouts.length - 1];
  const fatigue = calculateFatigue(workouts);
  const intensity = intensityLevel(fatigue);

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32 }}>LiftFlow</h1>

      <Card>
        <h3>Today's Recommendation</h3>
        <p>
          Suggested Intensity: <b>{intensity}</b>
        </p>
        <p>Fatigue Score: {fatigue}</p>
        <p>Focus: Upper / Lower / Push / Pull</p>
      </Card>

      <Card>
        <h3>Last Workout</h3>

        {lastWorkout ? (
          <>
            <p>
              <b>{lastWorkout.exercise}</b>
            </p>
            <p>
              {lastWorkout.weight} lbs × {lastWorkout.reps}
            </p>
            {lastWorkout.load && (
              <p>Training Load: {lastWorkout.load}</p>
            )}
          </>
        ) : (
          <p>No workouts logged yet</p>
        )}
      </Card>

      <Card>
        <h3>Quick Actions</h3>

        <button style={{ marginRight: 10 }}>
          Start Workout
        </button>

        <button>
          Log Set
        </button>
      </Card>
    </div>
  );
}