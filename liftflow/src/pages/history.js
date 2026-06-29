import { useEffect, useState } from "react";
import Card from "../components/Card";
import { getWorkouts } from "../lib/workoutStorage";

export default function History() {
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    setWorkouts(getWorkouts());
  }, []);

  function getWorkoutDate(workout) {
    // find first valid date in workout safely
    const found = workout?.find((w) => w.date);
    return found?.date || Date.now();
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1>Workout History</h1>

      {workouts.length === 0 ? (
        <Card>
          <p>No workouts recorded yet.</p>
        </Card>
      ) : (
        workouts
          .slice()
          .reverse()
          .map((workout, workoutIndex) => (
            <Card key={workoutIndex}>
              <h3>
                Workout{" "}
                {new Date(getWorkoutDate(workout)).toLocaleDateString()}
              </h3>

              {Array.isArray(workout) &&
                workout.map((exercise, exerciseIndex) => (
                  <div
                    key={exerciseIndex}
                    style={{
                      marginBottom: 20,
                      paddingBottom: 10,
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <h4>{exercise.exercise || "Unknown Exercise"}</h4>

                    {exercise.sets?.length > 0 ? (
                      exercise.sets.map((set, setIndex) => (
                        <p key={setIndex}>
                          Set {setIndex + 1}: {set.weight ?? "-"} lbs ×{" "}
                          {set.reps ?? "-"}
                        </p>
                      ))
                    ) : (
                      <p>No sets recorded</p>
                    )}
                  </div>
                ))}
            </Card>
          ))
      )}
    </div>
  );
}