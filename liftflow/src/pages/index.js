import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getMuscleGroup, tint as groupTint } from "../lib/muscleGroups";
import { getPlan } from "../lib/plan";
import { getTodayName } from "../lib/today";
import { getWorkouts } from "../lib/workoutStorage";
import { calculateLiftVolume, calculateSessionSummary, getBaseExercise, getLiftSets, getWorkoutItems } from "../lib/workoutAnalytics";
import { colors, dayColors, tint } from "../lib/theme";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Home() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState([]);
  const [plan, setPlan] = useState({});
  const [today, setToday] = useState("Monday");
  const [openRecent, setOpenRecent] = useState("");

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
      DAYS.map((day) => {
        const lifts = Array.isArray(plan[day]) ? plan[day] : [];
        const name = plan.__meta?.[day]?.name?.trim() || "";
        const recovery = plan.__meta?.[day]?.recovery || null;
        return {
          day,
          lifts,
          name,
          recovery,
          accent: day === today ? dayColors.today : dayColors.default,
          isToday: day === today,
        };
      }),
    [plan, today]
  );

  const todaysLifts = week.find((day) => day.isToday)?.lifts || [];
  const todayItem = week.find((day) => day.isToday);
  const plannedDays = week.filter((day) => day.lifts.length > 0 || day.recovery).length;
  const recentSessions = useMemo(() => buildRecentSessions(workouts).slice(0, 5), [workouts]);

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
        {recentSessions.length === 0 ? (
          <div style={emptyState}>No sets logged yet. Hit the gym!</div>
        ) : (
          <div style={recentList}>
            {recentSessions.map((session) => {
              const expanded = openRecent === session.id;

              return (
                <article key={session.id} style={recentCard}>
                  <button type="button" onClick={() => setOpenRecent(expanded ? "" : session.id)} style={recentSummary}>
                    <div>
                      <h3 style={recentExercise}>{session.name}</h3>
                      <p style={recentDate}>{session.date} · {session.sets} sets</p>
                    </div>
                    <strong style={recentLoad}>{session.volume.toLocaleString()} lb</strong>
                  </button>

                  {expanded && (
                    <div style={recentDetails}>
                      {session.lifts.map((lift, index) => (
                        <div key={`${session.id}-${lift.exercise}-${index}`} style={recentLift}>
                          <div>
                            <strong style={recentLiftName}>{getBaseExercise(lift)}</strong>
                            <p style={recentDate}>
                              {lift.variation ? `${lift.variation} · ` : ""}
                              {getLiftSets(lift).map((set) => `${set.reps || "--"} x ${set.weight || "--"} lb`).join(" · ") || "No sets logged"}
                            </p>
                          </div>
                          <span style={recentLiftVolume}>{calculateLiftVolume(lift).toLocaleString()} lb</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
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

function buildRecentSessions(workouts) {
  return workouts
    .map((session, index) => {
      const lifts = getWorkoutItems(session);
      const summary = calculateSessionSummary(lifts);
      const date = session?.date || lifts[0]?.date || null;

      return {
        id: session?.id || `${date || "session"}-${index}`,
        name: session?.focus || session?.day || lifts[0]?.exercise || "Workout",
        date: formatDate(date),
        lifts,
        sets: summary.sets,
        volume: summary.volume,
      };
    })
    .filter((session) => session.lifts.length > 0)
    .reverse();
}

function formatDate(date) {
  if (!date) return "Logged";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Logged";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

const focusCard = {
  minHeight: 76,
  border: `1px solid ${tint(colors.brand, 0.22)}`,
  borderRadius: 12,
  background: colors.surface,
  padding: "12px 14px",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const eyebrow = {
  margin: 0,
  color: colors.brand,
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const focusTitle = {
  margin: "4px 0",
  color: colors.text,
  fontSize: 20,
  lineHeight: 1,
};

const focusCopy = {
  margin: 0,
  color: "#747474",
  fontSize: 13,
  lineHeight: 1.4,
  fontWeight: 700,
};

const focusButton = {
  minWidth: 92,
};

const section = {
  marginTop: 16,
};

const sectionHeader = {
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  marginBottom: 10,
};

const sectionTitle = {
  margin: 0,
  color: "#f7f7f2",
  fontSize: 20,
  lineHeight: 1,
};

const sectionMeta = {
  margin: "5px 0 0",
  color: "#555",
  fontWeight: 800,
  fontSize: 13,
};

const ghostButton = {
  color: colors.brand,
  borderColor: tint(colors.brand, 0.4),
  background: tint(colors.brand, 0.08),
  whiteSpace: "nowrap",
};

const weekGrid = {
  gap: 8,
};

const dayCard = {
  minHeight: 112,
  border: "1px solid",
  borderRadius: 12,
  padding: 10,
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
  margin: "7px 0 7px",
  fontSize: 16,
  lineHeight: 1.1,
};

const liftPreview = {
  display: "flex",
  flexWrap: "wrap",
  gap: 5,
  marginBottom: 8,
};

const liftChip = {
  border: "1px solid #262626",
  borderRadius: 999,
  padding: "4px 7px",
  color: "#aaa",
  background: "#0a0a0a",
  fontSize: 11,
  fontWeight: 750,
};

const restCopy = {
  margin: "0 0 10px",
  color: "#4d4d4d",
  fontWeight: 800,
};

const openButton = {
  marginTop: "auto",
  minWidth: 72,
  padding: "7px 13px",
  fontSize: 12,
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
  gap: 8,
};

const recentCard = {
  border: "1px solid #222",
  borderRadius: 12,
  background: "#0f0f0f",
  overflow: "hidden",
};

const recentSummary = {
  width: "100%",
  border: 0,
  borderRadius: 0,
  background: "transparent",
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  textAlign: "left",
};

const recentExercise = {
  margin: 0,
  color: "#32cfff",
  fontSize: 17,
};

const recentDate = {
  margin: "4px 0 0",
  color: "#666",
  fontSize: 12,
};

const recentLoad = {
  color: "#f7f7f2",
  whiteSpace: "nowrap",
};

const recentDetails = {
  borderTop: "1px solid #202020",
  display: "grid",
};

const recentLift = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 12px",
  borderBottom: "1px solid #171717",
};

const recentLiftName = {
  color: "#d7d7d2",
};

const recentLiftVolume = {
  color: "#32cfff",
  fontWeight: 850,
  whiteSpace: "nowrap",
};
