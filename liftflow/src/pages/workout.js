import { useState } from "react";
import { addSet, getSession, clearSession, startSession } from "../lib/session";
import { saveWorkout } from "../lib/storage";

export default function Workout() {
  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState([]);
  const [sessionState, setSessionState] = useState([]);

  function handleStart() {
    startSession();
    setSessionState(getSession());
  }

  function handleAddSet() {
    const set = {
      exercise,
      weight,
      reps,
      date: new Date().toISOString(),
    };

    addSet(set);
    setSessionState(getSession());

    setReps("");
  }

  function handleFinish() {
    const session = getSession();

    session.forEach(saveWorkout);

    clearSession();
    setSessionState([]);
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1>Workout Session</h1>

      <button onClick={handleStart}>Start Session</button>

      <div style={{ marginTop: 20 }}>
        <input
          placeholder="Exercise"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
        />

        <input
          placeholder="Weight"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <input
          placeholder="Reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />

        <br /><br />

        <button onClick={handleAddSet}>Add Set</button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Session</h3>

        {sessionState.map((s, i) => (
          <div key={i}>
            {s.exercise} — {s.weight} × {s.reps}
          </div>
        ))}
      </div>

      <br />

      <button onClick={handleFinish}>
        Finish Workout
      </button>
    </div>
  );
}