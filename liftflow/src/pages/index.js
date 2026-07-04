import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getMuscleGroup, tint as groupTint } from "../lib/muscleGroups";
import { getPlan } from "../lib/plan";
import { getTodayName } from "../lib/today";
import { getWorkouts } from "../lib/workoutStorage";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ACCENTS = ["#32cfff", "#ff6b2c", "#e4ff2f", "#be72ff", "#ff9b34", "#32df76", "#f7f7f2"];

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
        const recovery = plan.__meta?.[day]?.recovery || null;
        return {
          day,
          lifts,
          name,
          recovery,
          accent: ACCENTS[index],
          isToday: day === today,
        };
      }),
    [plan, today]
  );

  const todaysLifts = week.find((day) => day.isToday)?.lifts || [];
  const todayItem = week.find((day) => day.isToday);
  const plannedDays = week.filter((day) => day.lifts.length > 0 || day.recovery).length;
  const recentSets = useMemo(() => flattenRecentSets(workouts).slice(0, 5), [workouts]);

  return (
    <div>
      <section className="home-focus" style={focusCard}>
        <div>
          <p style={eyebrow}>Today&apos;s Flow</p>
          <h2 style={focusTitle}>{today}</h2>
          <p style={focusCopy}>
            {todayItem?.recovery
              ? `${todayItem.recovery.activity} · ${todayItem.recovery.duration}`
              : todaysLifts.length > 0
              ? `${getDayTitle(todayItem)} · ${todaysLifts.slice(0, 2).map((lift) => lift.exercise).join(", ")}`
              : "No workout planned. Recovery day."}
          </p>
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => router.push(todaysLifts.length > 0 || todayItem?.recovery ? "/workout" : "/plan")}
          style={focusButton}
        >
          {todaysLifts.length > 0 || todayItem?.recovery ? "View" : "Program"}
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
                borderColor: item.recovery ? "rgba(50, 223, 118, 0.38)" : item.isToday ? item.accent : tint(item.accent, 0.34),
                background: item.recovery ? "rgba(50, 223, 118, 0.08)" : item.isToday ? tint(item.accent, 0.1) : "#101010",
              }}
            >
              <div style={dayTopline}>
                <p style={dayMeta}>{item.day.slice(0, 3)}</p>
                {item.isToday && <span style={{ ...todayBadge, color: item.accent }}>Today</span>}
              </div>

              <h3 style={{ ...dayTitle, color: item.recovery ? "#32df76" : item.lifts.length > 0 ? item.accent : "#555" }}>
                {getDayTitle(item)}
              </h3>

              {item.recovery ? (
                <p style={restCopy}>{item.recovery.activity} · {item.recovery.duration}</p>
              ) : item.lifts.length > 0 ? (
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
                onClick={() => router.push(item.lifts.length > 0 || item.recovery ? "/workout" : "/plan")}
                style={{
                  ...openButton,
                  color: item.recovery ? "#32df76" : item.accent,
                  background: item.recovery ? "rgba(50, 223, 118, 0.16)" : tint(item.accent, 0.16),
                  borderColor: item.recovery ? "rgba(50, 223, 118, 0.48)" : tint(item.accent, 0.48),
                }}
              >
                {item.lifts.length > 0 || item.recovery ? "Open" : "Add"}
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
  if (day.recovery) return "Recovery";
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
  minHeight: 88,
  border: "1px solid rgba(50, 207, 255, 0.22)",
  borderRadius: 14,
  background: "#101010",
  padding: "14px 16px",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const eyebrow = {
  margin: 0,
  color: "#32cfff",
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const focusTitle = {
  margin: "5px 0 5px",
  color: "#f7f7f2",
  fontSize: 22,
  lineHeight: 1,
};

const focusCopy = {
  margin: 0,
  color: "#747474",
  fontSize: 14,
  lineHeight: 1.4,
  fontWeight: 700,
};

const focusButton = {
  minWidth: 92,
};

const section = {
  marginTop: 18,
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
  fontSize: 20,
  lineHeight: 1,
};

const sectionMeta = {
  margin: "8px 0 0",
  color: "#555",
  fontWeight: 800,
};

const ghostButton = {
  color: "#32cfff",
  borderColor: "rgba(50, 207, 255, 0.4)",
  background: "rgba(50, 207, 255, 0.08)",
  whiteSpace: "nowrap",
};

const weekGrid = {
  gap: 10,
};

const dayCard = {
  minHeight: 132,
  border: "1px solid",
  borderRadius: 14,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
};

const sundayCard = {};

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
  fontSize: 13,
  fontWeight: 850,
};

const todayBadge = {
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const dayTitle = {
  margin: "9px 0 8px",
  fontSize: 17,
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
  fontSize: 11,
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
  fontSize: 13,
};

const emptyState = {
  minHeight: 96,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#2f2f2f",
  fontSize: 16,
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
  color: "#32cfff",
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
