import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getMuscleGroup, tint as groupTint } from "../lib/muscleGroups";
import { getPlan } from "../lib/plan";
import { getTodayName } from "../lib/today";
import { getWorkouts } from "../lib/workoutStorage";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ACCENTS = ["#e4ff2f", "#ff6b2c", "#32cfff", "#be72ff", "#ff9b34", "#32df76", "#f7f7f2"];

export default function Home() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState([]);
  const [plan, setPlan] = useState({});
  const [today, setToday] = useState("Monday");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWorkouts(getWorkouts());
      setPlan(getPlan());
      setToday(getTodayName());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const week = useMemo(
    () =>
      DAYS.map((day, index) => {
        const lifts = Array.isArray(plan[day]) ? plan[day] : [];
        const name = plan.__meta?.[day]?.name?.trim() || "";
        return {
          day,
          lifts,
          name,
          accent: ACCENTS[index],
          isToday: day === today,
        };
      }),
    [plan, today]
  );

  const todaysLifts = week.find((day) => day.isToday)?.lifts || [];
  const plannedDays = week.filter((day) => day.lifts.length > 0).length;
  const recentSets = useMemo(() => flattenRecentSets(workouts).slice(0, 5), [workouts]);

  return (
    <div>
      <section className="home-focus" style={focusCard}>
        <div>
          <p style={eyebrow}>Today&apos;s Flow</p>
          <h2 style={focusTitle}>{today}</h2>
          <p style={focusCopy}>
            {todaysLifts.length > 0
              ? `${todaysLifts.length} exercises planned. Start the session and log the work.`
              : "No workout planned today. Build your split or take the recovery win."}
          </p>
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => router.push(todaysLifts.length > 0 ? "/workout" : "/plan")}
          style={focusButton}
        >
          {todaysLifts.length > 0 ? "Start" : "Program"}
        </button>
      </section>

      <section style={section}>
        <div className="section-header" style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>This Week</h2>
            <p style={sectionMeta}>{plannedDays} training days set</p>
          </div>
          <button type="button" onClick={() => router.push("/plan")} style={ghostButton}>
            Edit Split
          </button>
        </div>

        <div className="home-week-grid" style={weekGrid}>
          {week.map((item) => (
            <article
              key={item.day}
              style={{
                ...dayCard,
                ...(item.day === "Sunday" ? sundayCard : {}),
                borderColor: item.isToday ? item.accent : tint(item.accent, 0.34),
                background: item.isToday ? tint(item.accent, 0.1) : "#101010",
              }}
            >
              <div style={dayTopline}>
                <p style={dayMeta}>{item.day.slice(0, 3)}</p>
                {item.isToday && <span style={{ ...todayBadge, color: item.accent }}>Today</span>}
              </div>

              <h3 style={{ ...dayTitle, color: item.lifts.length > 0 ? item.accent : "#555" }}>
                {getDayTitle(item)}
              </h3>

              {item.lifts.length > 0 ? (
                <div style={liftPreview}>
                  {item.lifts.slice(0, 3).map((lift) => (
                    <MuscleChip key={lift.id || lift.exercise} lift={lift} />
                  ))}
                  {item.lifts.length > 3 && (
                    <span style={liftChip}>+{item.lifts.length - 3} more</span>
                  )}
                </div>
              ) : (
                <p style={restCopy}>Rest day</p>
              )}

              <button
                type="button"
                onClick={() => router.push(item.lifts.length > 0 ? "/workout" : "/plan")}
                style={{
                  ...openButton,
                  color: item.accent,
                  background: tint(item.accent, 0.16),
                  borderColor: tint(item.accent, 0.48),
                }}
              >
                {item.lifts.length > 0 ? "Open" : "Add"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>Recent Sets</h2>
        {recentSets.length === 0 ? (
          <div style={emptyState}>No sets logged yet. Hit the gym!</div>
        ) : (
          <div style={recentList}>
            {recentSets.map((set) => (
              <article key={set.id} style={recentCard}>
                <div>
                  <h3 style={recentExercise}>{set.exercise}</h3>
                  <p style={recentDate}>{set.date}</p>
                </div>
                <strong style={recentLoad}>
                  {set.weight || "--"} lbs x {set.reps || "--"}
                </strong>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MuscleChip({ lift }) {
  const group = getMuscleGroup(lift.muscleGroup);

  return (
    <span
      style={{
        ...liftChip,
        color: group.color,
        borderColor: groupTint(group.color, 0.32),
        background: groupTint(group.color, 0.08),
      }}
    >
      {lift.exercise} · {lift.sets}x{lift.reps}
    </span>
  );
}

function getDayTitle(day) {
  if (day.name) return day.name;
  if (day.lifts.length === 0) return "Recovery";
  if (day.lifts.length === 1) return day.lifts[0].exercise;
  return `${day.lifts.length} Exercises`;
}

function flattenRecentSets(workouts) {
  return workouts
    .flatMap((session) => {
      const lifts = Array.isArray(session) ? session : session.workout || [];
      return lifts.flatMap((lift, liftIndex) =>
        (lift.sets || []).map((set, setIndex) => ({
          id: `${session.id || session.date || liftIndex}-${lift.exercise}-${setIndex}`,
          exercise: lift.exercise,
          weight: set.weight,
          reps: set.reps,
          date: formatDate(session.date || lift.date),
        }))
      );
    })
    .reverse();
}

function formatDate(date) {
  if (!date) return "Logged";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function tint(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const focusCard = {
  minHeight: 112,
  border: "1px solid rgba(228, 255, 47, 0.35)",
  borderRadius: 16,
  background: "#101010",
  padding: "18px 20px",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
};

const eyebrow = {
  margin: 0,
  color: "#e4ff2f",
  fontSize: 14,
  fontWeight: 850,
  textTransform: "uppercase",
};

const focusTitle = {
  margin: "6px 0 6px",
  color: "#f7f7f2",
  fontSize: 26,
  lineHeight: 1,
};

const focusCopy = {
  margin: 0,
  color: "#747474",
  fontSize: 15,
  lineHeight: 1.4,
  fontWeight: 700,
};

const focusButton = {
  minWidth: 112,
};

const section = {
  marginTop: 22,
};

const sectionHeader = {
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  marginBottom: 14,
};

const sectionTitle = {
  margin: 0,
  color: "#f7f7f2",
  fontSize: 22,
  lineHeight: 1,
};

const sectionMeta = {
  margin: "8px 0 0",
  color: "#555",
  fontWeight: 800,
};

const ghostButton = {
  color: "#e4ff2f",
  borderColor: "rgba(228, 255, 47, 0.4)",
  background: "rgba(228, 255, 47, 0.08)",
  whiteSpace: "nowrap",
};

const weekGrid = {
  gap: 10,
};

const dayCard = {
  minHeight: 142,
  border: "1px solid",
  borderRadius: 16,
  padding: 13,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
};

const sundayCard = {
  gridColumn: "1 / -1",
  minHeight: 118,
};

const dayTopline = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const dayMeta = {
  margin: 0,
  color: "#707070",
  fontSize: 16,
  fontWeight: 850,
};

const todayBadge = {
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const dayTitle = {
  margin: "12px 0 10px",
  fontSize: 20,
  lineHeight: 1.1,
};

const liftPreview = {
  display: "flex",
  flexWrap: "wrap",
  gap: 7,
  marginBottom: 12,
};

const liftChip = {
  border: "1px solid #262626",
  borderRadius: 999,
  padding: "5px 9px",
  color: "#aaa",
  background: "#0a0a0a",
  fontSize: 12,
  fontWeight: 750,
};

const restCopy = {
  margin: "0 0 16px",
  color: "#4d4d4d",
  fontWeight: 800,
};

const openButton = {
  marginTop: "auto",
  minWidth: 82,
  padding: "8px 16px",
  fontSize: 14,
};

const emptyState = {
  minHeight: 120,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#2f2f2f",
  fontSize: 20,
  fontWeight: 850,
  textAlign: "center",
};

const recentList = {
  display: "grid",
  gap: 10,
};

const recentCard = {
  border: "1px solid #222",
  borderRadius: 14,
  background: "#0f0f0f",
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
};

const recentExercise = {
  margin: 0,
  color: "#e4ff2f",
  fontSize: 19,
};

const recentDate = {
  margin: "6px 0 0",
  color: "#666",
};

const recentLoad = {
  color: "#f7f7f2",
  whiteSpace: "nowrap",
};
