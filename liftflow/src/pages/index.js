import { useEffect, useState } from "react";

import { getWorkouts } from "../lib/workoutStorage";
import {
  calculateFatigue,
  intensityLevel,
  getPRs,
} from "../lib/engine";

import { setCoachSuggestion } from "../lib/coachState";

import Card from "../components/Card";

import { getPlan } from "../lib/plan";
import { getTodayName } from "../lib/today";
import { getProgramProgression } from "../lib/progression";

import {
  getCoachRecommendation,
} from "../lib/coach";

export default function Home() {
  const [workouts, setWorkouts] = useState([]);
  const [coachData, setCoachData] = useState([]);
  const [progression, setProgression] = useState([]);

  useEffect(() => {
    const today = getTodayName();
    const plan = getPlan();

    const todayLifts = plan[today] || [];

    setWorkouts(getWorkouts());

    // progression
    const prog = getProgramProgression(todayLifts);
    setProgression(prog);

    // coach recommendations
    const recommendations = todayLifts.map((lift) =>
      getCoachRecommendation(lift.exercise, lift.weight || 0)
    );

    setCoachData(recommendations);
  }, []);

  const lastWorkout = workouts[workouts.length - 1];

  const fatigue = calculateFatigue(workouts);
  const intensity = intensityLevel(fatigue);

  function applySuggestion(rec) {
    setCoachSuggestion(rec.exercise, rec);

    alert(`Applied suggestion for ${rec.exercise}`);
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32 }}>LiftFlow</h1>

      {/* ===================== */}
      {/* TODAY SUMMARY */}
      {/* ===================== */}
      <Card>
        <h3>Today's Recommendation</h3>

        <p>
          Suggested Intensity: <b>{intensity}</b>
        </p>

        <p>Fatigue Score: {fatigue}</p>
      </Card>

      {/* ===================== */}
      {/* LAST WORKOUT */}
      {/* ===================== */}
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
          </>
        ) : (
          <p>No workouts logged yet</p>
        )}
      </Card>

      {/* ===================== */}
      {/* PROGRESSION */}
      {/* ===================== */}
      <Card>
        <h3>Progression</h3>

        {progression.length === 0 ? (
          <p>No progression data</p>
        ) : (
          progression.map((lift) => (
            <p key={lift.id}>
              {lift.exercise}: → {lift.nextWeight} lbs next
            </p>
          ))
        )}
      </Card>

      {/* ===================== */}
      {/* COACH LAYER (IMPORTANT PART) */}
      {/* ===================== */}
      <Card>
        <h3>Coach Recommendations</h3>

        {coachData.length === 0 ? (
          <p>No recommendations today</p>
        ) : (
          coachData.map((rec, i) => (
            <div
              key={i}
              style={{
                padding: 10,
                marginBottom: 12,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
              }}
            >
              <p style={{ margin: 0 }}>
                <b>{rec.exercise}</b>
              </p>

              <p style={{ margin: "6px 0" }}>
                Suggested: <b>{rec.suggestedWeight} lbs</b>
              </p>

              <p style={{ margin: "6px 0", opacity: 0.7 }}>
                Confidence: {Math.round(rec.confidence * 100)}%
              </p>

              <p style={{ margin: "6px 0", opacity: 0.6 }}>
                {rec.reason.join(", ")}
              </p>

              {/* APPLY BUTTON (THIS IS WHAT YOU WERE ASKING ABOUT) */}
              <button
                onClick={() => applySuggestion(rec)}
                style={{
                  marginTop: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                Apply Suggestion
              </button>
            </div>
          ))
        )}
      </Card>

      {/* ===================== */}
      {/* QUICK ACTIONS */}
      {/* ===================== */}
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