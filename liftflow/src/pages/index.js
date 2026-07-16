import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getManualPRs } from "../lib/manualPRs";
import { getPlan } from "../lib/plan";
import { buildPRMap, formatPR } from "../lib/prRecords";
import { getTodayName } from "../lib/today";
import { getWorkouts } from "../lib/workoutStorage";
import { calculateLiftVolume, calculateSessionSummary, getBaseExercise, getLiftSets, getWorkoutItems } from "../lib/workoutAnalytics";
import { colors, dayColors, tint } from "../lib/theme";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Home() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState([]);
  const [manualPrs, setManualPrs] = useState([]);
  const [plan, setPlan] = useState({});
  const [today, setToday] = useState("Monday");
  const [openRecent, setOpenRecent] = useState("");
  const [flowIndex, setFlowIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [flowMotion, setFlowMotion] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWorkouts(getWorkouts());
      setManualPrs(getManualPRs());
      setPlan(getPlan());
      const currentDay = getTodayName();
      setToday(currentDay);
      setFlowIndex(Math.max(0, DAYS.indexOf(currentDay)));
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
          accent: dayColors[day] || colors.brand,
          isToday: day === today,
        };
      }),
    [plan, today]
  );

  const flowItem = week[flowIndex] || week.find((day) => day.isToday) || week[0];
  const flowHasPlan = flowItem?.lifts?.length > 0 || flowItem?.recovery;
  const recentSessions = useMemo(() => buildRecentSessions(workouts).slice(0, 5), [workouts]);
  const prs = useMemo(() => buildPRMap(workouts, manualPrs), [workouts, manualPrs]);

  function moveFlow(direction) {
    setFlowMotion(direction > 0 ? "next" : "prev");
    setFlowIndex((current) => (current + direction + DAYS.length) % DAYS.length);
  }

  function finishSwipe(end) {
    if (touchStart === null) return;
    const distanceX = end.x - touchStart.x;
    const distanceY = Math.abs(end.y - touchStart.y);
    setTouchStart(null);
    if (Math.abs(distanceX) < 76 || Math.abs(distanceX) < distanceY * 1.45) return;
    moveFlow(distanceX < 0 ? 1 : -1);
  }

  return (
    <div style={homeWrap}>
      <section
        className={flowMotion ? `home-flow-${flowMotion}` : ""}
        style={{
          ...focusCard,
          borderColor: flowItem?.recovery ? tint(colors.success, 0.42) : tint(flowItem?.accent || colors.brand, 0.38),
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          setTouchStart(touch ? { x: touch.clientX, y: touch.clientY } : null);
        }}
        onTouchEnd={(event) => {
          const touch = event.changedTouches[0];
          finishSwipe(touch ? { x: touch.clientX, y: touch.clientY } : touchStart);
        }}
        onAnimationEnd={() => setFlowMotion("")}
      >
        <div style={flowTop}>
          <div>
            <p style={{ ...eyebrow, color: flowItem?.recovery ? colors.success : flowItem?.accent || colors.brand }}>
              {getFlowLabel(flowItem?.day, today)}
            </p>
            <h2 style={focusTitle}>{getDayTitle(flowItem)}</h2>
            <p style={focusCopy}>
              {flowItem?.recovery
                ? `${flowItem.recovery.activity} · ${flowItem.recovery.duration} · ${flowItem.recovery.intensity || "Easy"}`
                : flowItem?.lifts?.length > 0
                ? `${flowItem.day} · ${flowItem.lifts.length} planned lift${flowItem.lifts.length === 1 ? "" : "s"}`
                : `${flowItem?.day || "Today"} is open. Add work or keep it for recovery.`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push(flowHasPlan ? `/workout?day=${encodeURIComponent(flowItem.day)}` : "/plan")}
            style={{
              ...focusButton,
              borderColor: flowHasPlan ? tint(flowItem?.accent || colors.brand, 0.58) : colors.borderSoft,
              color: flowHasPlan ? flowItem?.accent || colors.brand : colors.muted,
              background: flowHasPlan ? tint(flowItem?.accent || colors.brand, 0.1) : colors.surfaceSoft,
            }}
          >
            {flowHasPlan ? "Open" : "Program"}
          </button>
        </div>

        <div style={flowBody}>
          {flowItem?.recovery ? (
            <div style={flowRecovery}>
              <strong>{flowItem.recovery.activity}</strong>
              {flowItem.recovery.notes && <span>{flowItem.recovery.notes}</span>}
            </div>
          ) : flowItem?.lifts?.length > 0 ? (
            flowItem.lifts.map((lift) => (
              <div key={lift.id || lift.exercise} style={flowLiftRow}>
                <div>
                  <strong style={flowLiftName}>{lift.exercise}</strong>
                  <p style={flowLiftMeta}>{lift.sets || "--"} sets · {lift.reps || "--"} reps</p>
                </div>
                <span style={flowLiftPr}>{getLiftPR(lift, prs)}</span>
              </div>
            ))
          ) : (
            <div style={flowRecovery}>
              <strong>Recovery or planning day</strong>
              <span>No lifts are scheduled yet.</span>
            </div>
          )}
        </div>

        <div style={flowFooter}>
          <button type="button" onClick={() => moveFlow(-1)} style={flowNavButton} aria-label="Previous day">
            Prev
          </button>
          <span style={flowHint}>{flowIndex + 1} / {DAYS.length} · swipe for another day</span>
          <button type="button" onClick={() => moveFlow(1)} style={flowNavButton} aria-label="Next day">
            Next
          </button>
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

function getDayTitle(day) {
  if (!day) return "Today";
  if (day.name) return day.name;
  if (day.recovery) return "Recovery";
  if (day.lifts.length === 0) return "Recovery";
  if (day.lifts.length === 1) return day.lifts[0].exercise;
  return `${day.lifts.length} Exercises`;
}

function getFlowLabel(day, today) {
  if (!day) return "Today's Flow";
  const dayIndex = DAYS.indexOf(day);
  const todayIndex = DAYS.indexOf(today);
  if (dayIndex === todayIndex) return "Today's Flow";
  if (dayIndex === (todayIndex + 1) % DAYS.length) return "Tomorrow's Flow";
  if (dayIndex === (todayIndex + DAYS.length - 1) % DAYS.length) return "Yesterday's Flow";
  return `${day}'s Flow`;
}

function getLiftPR(lift, prs) {
  const base = getBaseExercise(lift);
  return formatPR(prs[base] || prs[lift?.exercise]);
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

const homeWrap = {
  display: "grid",
  gap: 14,
};

const focusCard = {
  height: 306,
  border: `1px solid ${tint(colors.brand, 0.22)}`,
  borderRadius: 12,
  background: colors.surface,
  padding: 12,
  display: "grid",
  gridTemplateRows: "86px minmax(0, 1fr) 34px",
  gap: 10,
  overflow: "hidden",
  touchAction: "pan-y",
};

const flowTop = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "start",
  gap: 12,
  minWidth: 0,
  overflow: "hidden",
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
  lineHeight: 1.05,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const focusCopy = {
  margin: "4px 0 0",
  color: "#747474",
  fontSize: 12,
  lineHeight: 1.25,
  fontWeight: 700,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const focusButton = {
  minWidth: 84,
  flex: "0 0 auto",
};

const flowBody = {
  minHeight: 0,
  display: "grid",
  gap: 7,
  overflowY: "auto",
  paddingRight: 2,
  paddingTop: 2,
  alignContent: "start",
  borderTop: `1px solid ${colors.borderSoft}`,
};

const flowLiftRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  paddingTop: 7,
  borderTop: `1px solid ${colors.borderSoft}`,
  minWidth: 0,
};

const flowLiftName = {
  display: "block",
  color: colors.textSoft,
  fontSize: 14,
  lineHeight: 1.1,
};

const flowLiftMeta = {
  margin: "3px 0 0",
  color: colors.mutedStrong,
  fontSize: 12,
};

const flowLiftPr = {
  flex: "0 0 auto",
  color: colors.accent,
  border: `1px solid ${tint(colors.accent, 0.28)}`,
  background: tint(colors.accent, 0.06),
  borderRadius: 999,
  padding: "4px 7px",
  fontSize: 10,
  fontWeight: 900,
  lineHeight: 1.25,
  alignSelf: "flex-start",
  whiteSpace: "nowrap",
};

const flowRecovery = {
  minHeight: 96,
  display: "grid",
  alignContent: "center",
  gap: 6,
  color: colors.textSoft,
};

const flowFooter = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const flowHint = {
  color: colors.mutedStrong,
  fontSize: 11,
  fontWeight: 800,
  textAlign: "center",
};

const flowNavButton = {
  padding: "6px 9px",
  color: colors.muted,
  background: colors.surfaceSoft,
  borderColor: colors.borderSoft,
  fontSize: 11,
};

const section = {
  marginTop: 0,
};

const sectionHeader = {
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  marginBottom: 9,
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
  gap: 9,
};

const dayCard = {
  minHeight: 108,
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
  gap: 9,
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
