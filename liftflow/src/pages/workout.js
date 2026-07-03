import { useEffect, useState } from "react";
import { getMuscleGroup, tint } from "../lib/muscleGroups";
import { getPlan } from "../lib/plan";
import { buildTodaysWorkout } from "../lib/trainingEngine";
import { getTodayName } from "../lib/today";
import { saveWorkout } from "../lib/workoutStorage";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Workout() {
  const [plan, setPlan] = useState({});
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [program, setProgram] = useState([]);
  const [session, setSession] = useState({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedPlan = getPlan();
      const today = getTodayName();

      setPlan(savedPlan);
      setSelectedDay(today);
      setProgram(buildTodaysWorkout(today));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function chooseDay(day) {
    setSelectedDay(day);
    setProgram(buildTodaysWorkout(day));
    setSession({});
  }

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
    const completedWorkout = program.map((lift) => ({
      exercise: lift.exercise,
      muscleGroup: lift.muscleGroup || "other",
      sets: session[lift.id] || [],
      date: Date.now(),
      suggestedWeight: lift.suggestedWeight || null,
    }));

    saveWorkout(completedWorkout, {
      day: selectedDay,
      focus: plan.__meta?.[selectedDay]?.name || selectedDay,
    });

    alert("Workout saved!");
    setSession({});
  }

  const focusName = plan.__meta?.[selectedDay]?.name || selectedDay;

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Workout</p>
          <h1 style={title}>{focusName}</h1>
        </div>
        <span style={count}>{program.length} lifts</span>
      </header>

      <div style={dayRow}>
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => chooseDay(day)}
            style={{
              ...dayBtn,
              ...(selectedDay === day ? activeDay : {}),
            }}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {program.length === 0 ? (
        <section style={empty}>No workout planned for {selectedDay}.</section>
      ) : (
        <section style={list}>
          {program.map((lift) => {
            const group = getMuscleGroup(lift.muscleGroup);

            return (
              <article
                key={lift.id}
                style={{
                  ...liftCard,
                  borderColor: tint(group.color, 0.42),
                  background: tint(group.color, 0.07),
                }}
              >
                <div style={liftHeader}>
                  <div>
                    <h2 style={{ ...liftTitle, color: group.color }}>{lift.exercise}</h2>
                    <p style={liftMeta}>
                      {group.label} · {lift.sets} sets x {lift.reps} reps
                    </p>
                  </div>
                  {lift.suggestedWeight && (
                    <span style={{ ...suggestion, color: group.color }}>
                      {lift.suggestedWeight} lbs
                    </span>
                  )}
                </div>

                {lift.coachNote && <p style={coachNote}>Coach: {lift.coachNote}</p>}

                <div style={setList}>
                  {Array.from({ length: lift.sets }).map((_, i) => (
                    <div key={i} className="field-row" style={setRow}>
                      <input
                        type="number"
                        placeholder={`Set ${i + 1} weight`}
                        value={session[lift.id]?.[i]?.weight || ""}
                        onChange={(event) => updateSet(lift.id, i, "weight", event.target.value)}
                      />
                      <input
                        type="number"
                        placeholder={`Set ${i + 1} reps`}
                        value={session[lift.id]?.[i]?.reps || ""}
                        onChange={(event) => updateSet(lift.id, i, "reps", event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <button type="button" className="primary" onClick={finishWorkout} style={finishBtn}>
        Finish Workout
      </button>
    </div>
  );
}

const wrap = {
  maxWidth: 760,
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 18,
};

const eyebrow = {
  margin: 0,
  color: "#32cfff",
  fontSize: 13,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 32,
  lineHeight: 1.1,
};

const count = {
  border: "1px solid rgba(50, 207, 255, 0.35)",
  borderRadius: 999,
  padding: "8px 12px",
  color: "#32cfff",
  background: "rgba(50, 207, 255, 0.08)",
  fontWeight: 850,
};

const dayRow = {
  display: "flex",
  overflowX: "auto",
  gap: 8,
  marginBottom: 14,
  paddingBottom: 6,
};

const dayBtn = {
  minWidth: 56,
  padding: "9px 12px",
  borderColor: "#242424",
  background: "#070707",
  color: "#666",
};

const activeDay = {
  borderColor: "#32cfff",
  color: "#050505",
  background: "#f7f7f2",
};

const empty = {
  border: "1px solid #222",
  borderRadius: 16,
  background: "#101010",
  padding: 22,
  color: "#555",
  textAlign: "center",
  fontWeight: 850,
};

const list = {
  display: "grid",
  gap: 14,
};

const liftCard = {
  border: "1px solid",
  borderRadius: 16,
  padding: 16,
};

const liftHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const liftTitle = {
  margin: 0,
  fontSize: 22,
};

const liftMeta = {
  margin: "6px 0 0",
  color: "#777",
  fontWeight: 750,
};

const suggestion = {
  border: "1px solid currentColor",
  borderRadius: 999,
  padding: "6px 10px",
  fontWeight: 850,
  whiteSpace: "nowrap",
};

const coachNote = {
  color: "#888",
  fontSize: 13,
};

const setList = {
  display: "grid",
  gap: 10,
  marginTop: 14,
};

const setRow = {
  gap: 10,
};

const finishBtn = {
  width: "100%",
  marginTop: 18,
  padding: 13,
};
