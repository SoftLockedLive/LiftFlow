import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { isOldSite } from "../components/MoveNotice";
import { arrivedWithTransfer } from "../lib/backup";
import { getBigThree } from "../lib/bigThree";
import { getManualPRs } from "../lib/manualPRs";
import { getPlan, savePlan } from "../lib/plan";
import { getProfile, saveProfile } from "../lib/profile";
import { buildPlanFromTemplate, PROGRAM_TEMPLATES } from "../lib/programTemplates";
import { buildPRMap, formatPR } from "../lib/prRecords";
import { getTodayName } from "../lib/today";
import { getWorkouts } from "../lib/workoutStorage";
import {
  calculateLiftVolume,
  calculateSessionSummary,
  getBaseExercise,
  getLiftSets,
  getWorkoutItems,
} from "../lib/workoutAnalytics";
import { colors, dayColors, radii, tint, type } from "../lib/theme";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ONBOARDING_KEY = "liftflow_onboarding_complete";
const DRAFT_KEY = "liftflow_workout_drafts";

export default function Home() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState([]);
  const [manualPrs, setManualPrs] = useState([]);
  const [profile, setProfile] = useState({});
  const [plan, setPlan] = useState({});
  const [today, setToday] = useState("Monday");
  const [dateLabel, setDateLabel] = useState("");
  const [openRecent, setOpenRecent] = useState("");
  const [flowIndex, setFlowIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [flowMotion, setFlowMotion] = useState("");
  const [resumeDraft, setResumeDraft] = useState(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingDraft, setOnboardingDraft] = useState(createOnboardingDraft());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWorkouts(getWorkouts());
      setManualPrs(getManualPRs());
      setProfile(getProfile());
      const savedPlan = getPlan();
      setPlan(savedPlan);
      const currentDay = getTodayName();
      setToday(currentDay);
      setDateLabel(
        new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date()),
      );
      setFlowIndex(Math.max(0, DAYS.indexOf(currentDay)));
      setResumeDraft(getResumeDraftDay(savedPlan));
      // Skip first-run setup on the old site (people should move instead) and for someone
      // arriving with a move link, who is bringing their data; MoveNotice handles both.
      if (!arrivedWithTransfer && !isOldSite()) {
        setOnboardingOpen(shouldShowOnboarding(savedPlan, getWorkouts(), getProfile()));
      }
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
    [plan, today],
  );

  const flowItem = week[flowIndex] || week.find((day) => day.isToday) || week[0];
  const flowHasPlan = flowItem?.lifts?.length > 0 || flowItem?.recovery;
  const flowAccent = getFlowAccent(flowItem);
  const recentSessions = useMemo(() => buildRecentSessions(workouts).slice(0, 5), [workouts]);
  const prs = useMemo(() => buildPRMap(workouts, manualPrs), [workouts, manualPrs]);
  const bigThree = useMemo(() => getBigThree(workouts, manualPrs), [workouts, manualPrs]);
  const units = profile.units || "lbs";
  const firstName = String(profile.name || "")
    .trim()
    .split(/\s+/)[0];

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
      <header style={pageHeader}>
        <p style={type.eyebrow}>{dateLabel || " "}</p>
        <h1 style={type.pageTitle}>{firstName ? `Hey, ${firstName}` : "Ready to train?"}</h1>
      </header>

      {resumeDraft && (
        <section style={resumeCard}>
          <div style={{ minWidth: 0 }}>
            <p style={{ ...type.eyebrow, color: colors.brand }}>Workout in progress</p>
            <h2 style={resumeTitle}>Resume {resumeDraft.day}</h2>
            <p style={resumeCopy}>
              {resumeDraft.count} logged item{resumeDraft.count === 1 ? "" : "s"} saved on this device
            </p>
          </div>
          <button
            type="button"
            className="primary"
            onClick={() => router.push(`/workout?day=${encodeURIComponent(resumeDraft.day)}`)}
            style={resumeButton}
          >
            Resume
          </button>
        </section>
      )}

      <section
        className={flowMotion ? `home-flow-${flowMotion}` : ""}
        style={focusCard}
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
          <div style={{ minWidth: 0 }}>
            <p style={{ ...type.eyebrow, color: flowAccent }}>{getFlowLabel(flowItem?.day, today)}</p>
            <h2 style={focusTitle}>{getDayTitle(flowItem)}</h2>
            <p style={focusCopy}>
              {flowItem?.recovery
                ? `${flowItem.recovery.activity} · ${flowItem.recovery.duration} · ${flowItem.recovery.intensity || "Easy"}`
                : flowItem?.lifts?.length > 0
                  ? `${flowItem.day} · ${flowItem.lifts.length} exercise${flowItem.lifts.length === 1 ? "" : "s"}`
                  : `${flowItem?.day || "Today"} is open`}
            </p>
          </div>
          <div style={flowNav}>
            <button type="button" onClick={() => moveFlow(-1)} style={iconButton} aria-label="Previous day">
              <Chevron direction="left" />
            </button>
            <button type="button" onClick={() => moveFlow(1)} style={iconButton} aria-label="Next day">
              <Chevron direction="right" />
            </button>
          </div>
        </div>

        {flowItem?.recovery ? (
          <div style={flowRecovery}>
            <strong style={{ color: colors.text, fontWeight: 600 }}>{flowItem.recovery.activity}</strong>
            {flowItem.recovery.notes && <span>{flowItem.recovery.notes}</span>}
          </div>
        ) : flowItem?.lifts?.length > 0 ? (
          <ol style={flowList}>
            {flowItem.lifts.map((lift, index) => (
              <li key={lift.id || lift.exercise} style={{ ...flowLiftRow, ...(index === 0 ? { borderTop: 0 } : {}) }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={flowLiftName}>{lift.exercise}</strong>
                  <p style={flowLiftMeta}>
                    {lift.sets || "--"} × {lift.reps || "--"}
                  </p>
                </div>
                <span style={flowLiftPr}>{getLiftPR(lift, prs)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div style={flowRecovery}>
            <span>Nothing scheduled. Rest up, or add lifts to this day in your program.</span>
          </div>
        )}

        <button
          type="button"
          className={flowHasPlan ? "primary" : undefined}
          onClick={() => router.push(flowHasPlan ? `/workout?day=${encodeURIComponent(flowItem.day)}` : "/plan")}
          style={flowCta}
        >
          {flowHasPlan ? (flowItem?.isToday ? "Start workout" : `Open ${flowItem.day}`) : "Build program"}
        </button>
      </section>

      <section style={card} aria-label="Big 3">
        <div style={bigThreeHeader}>
          <h2 style={type.sectionTitle}>Big 3</h2>
          <span style={bigThreeTotal}>
            {bigThree.total > 0 ? `${bigThree.total.toLocaleString()} ${units}` : "--"}
            <span style={bigThreeTotalLabel}>total</span>
          </span>
        </div>
        <div style={bigThreeGrid}>
          {bigThree.lifts.map((lift) => (
            <div key={lift.label} style={bigThreeCell}>
              <span style={type.meta}>{lift.label}</span>
              <strong style={{ ...bigThreeValue, color: lift.value ? colors.text : colors.mutedStrong }}>
                {lift.value ? lift.value : "--"}
                {lift.value ? <span style={bigThreeUnit}> {units}</span> : null}
              </strong>
              <span style={bigThreeHint}>
                {lift.value && lift.reps ? `× ${lift.reps}` : lift.value ? "tracked" : "not logged"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <div style={sectionHeader}>
          <h2 style={type.sectionTitle}>Recent workouts</h2>
          {recentSessions.length > 0 && (
            <button type="button" className="ghost" onClick={() => router.push("/history")} style={linkButton}>
              View all
            </button>
          )}
        </div>
        {recentSessions.length === 0 ? (
          <div style={{ ...card, ...emptyState }}>
            <span>No workouts logged yet.</span>
            <button type="button" onClick={() => router.push("/workout")}>
              Start a workout
            </button>
          </div>
        ) : (
          <div style={recentList}>
            {recentSessions.map((session, sessionIndex) => {
              const expanded = openRecent === session.id;

              return (
                <article key={session.id} style={{ ...recentItem, ...(sessionIndex === 0 ? { borderTop: 0 } : {}) }}>
                  <button
                    type="button"
                    onClick={() => setOpenRecent(expanded ? "" : session.id)}
                    style={recentSummary}
                    aria-expanded={expanded}
                  >
                    <div style={{ minWidth: 0 }}>
                      <h3 style={recentName}>{session.name}</h3>
                      <p style={recentDate}>
                        {session.date} · {session.sets} sets
                      </p>
                    </div>
                    <span style={recentLoad}>{session.volume.toLocaleString()} lb</span>
                  </button>

                  {expanded && (
                    <div style={recentDetails}>
                      {session.lifts.map((lift, index) => (
                        <div key={`${session.id}-${lift.exercise}-${index}`} style={recentLift}>
                          <div style={{ minWidth: 0 }}>
                            <strong style={recentLiftName}>{getBaseExercise(lift)}</strong>
                            <p style={recentDate}>
                              {lift.variation ? `${lift.variation} · ` : ""}
                              {getLiftSets(lift)
                                .map((set) => `${set.weight || "--"} × ${set.reps || "--"}`)
                                .join(", ") || "No sets logged"}
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

      {onboardingOpen && (
        <div style={modalOverlay} onClick={() => setOnboardingOpen(false)}>
          <section
            style={modalPanel}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
          >
            <div style={modalHeader}>
              <div>
                <p style={type.eyebrow}>Welcome</p>
                <h2 id="onboarding-title" style={modalTitle}>
                  Set up LiftFlow
                </h2>
              </div>
              <button
                type="button"
                className="ghost"
                onClick={() => skipOnboarding(setOnboardingOpen)}
                style={closeBtn}
                aria-label="Skip setup"
              >
                ✕
              </button>
            </div>
            <div style={modalBody}>
              <label style={field}>
                <span style={fieldLabel}>Bodyweight</span>
                <input
                  placeholder="e.g. 180"
                  inputMode="decimal"
                  value={onboardingDraft.bodyweight}
                  onChange={(event) => setOnboardingDraft({ ...onboardingDraft, bodyweight: event.target.value })}
                />
              </label>
              <label style={field}>
                <span style={fieldLabel}>Goal</span>
                <select
                  value={onboardingDraft.goal}
                  onChange={(event) => setOnboardingDraft({ ...onboardingDraft, goal: event.target.value })}
                >
                  <option value="strength">Strength</option>
                  <option value="hypertrophy">Hypertrophy</option>
                  <option value="fat_loss">Fat Loss</option>
                </select>
              </label>
              <label style={field}>
                <span style={fieldLabel}>Starter program</span>
                <select
                  value={onboardingDraft.templateId}
                  onChange={(event) => setOnboardingDraft({ ...onboardingDraft, templateId: event.target.value })}
                >
                  <option value="">No starter split</option>
                  {PROGRAM_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  completeOnboarding(onboardingDraft, setPlan, setOnboardingOpen);
                  setProfile(getProfile());
                }}
                style={fullButton}
              >
                Finish setup
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Chevron({ direction }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

function createOnboardingDraft() {
  return {
    bodyweight: "",
    goal: "strength",
    templateId: "upper-lower-4",
  };
}

function shouldShowOnboarding(plan, workouts, profile) {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(ONBOARDING_KEY) === "true") return false;
  const hasPlan = DAYS.some((day) => Array.isArray(plan?.[day]) && plan[day].length > 0);
  const hasWorkouts = Array.isArray(workouts) && workouts.length > 0;
  const hasProfile = Boolean(profile?.bodyweight || profile?.weight || profile?.name);
  return !hasPlan && !hasWorkouts && !hasProfile;
}

function completeOnboarding(draft, setPlan, setOnboardingOpen) {
  const profile = getProfile();
  saveProfile({
    ...profile,
    bodyweight: draft.bodyweight || profile.bodyweight,
    weight: draft.bodyweight || profile.weight,
    goal: draft.goal,
  });
  if (draft.templateId) {
    const nextPlan = buildPlanFromTemplate(draft.templateId);
    savePlan(nextPlan);
    setPlan(nextPlan);
  }
  localStorage.setItem(ONBOARDING_KEY, "true");
  window.dispatchEvent(new Event("liftflow-profile-updated"));
  setOnboardingOpen(false);
}

function skipOnboarding(setOnboardingOpen) {
  localStorage.setItem(ONBOARDING_KEY, "true");
  setOnboardingOpen(false);
}

function getResumeDraftDay(plan) {
  if (typeof window === "undefined") return null;
  try {
    const drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    if (!drafts || typeof drafts !== "object" || Array.isArray(drafts)) return null;
    return (
      DAYS.map((day) => ({ day, count: countDraftItems(drafts[day], day, plan?.[day]) })).find(
        (draft) => draft.count > 0,
      ) || null
    );
  } catch {
    return null;
  }
}

// Sets are keyed by lift id; ignore ids no longer in the plan (the Workout page can't show them).
function countDraftItems(draft, day, dayLifts) {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) return 0;
  // Same id fallback as lib/trainingEngine for lifts saved without one.
  const liftIds = new Set(
    (Array.isArray(dayLifts) ? dayLifts : []).map(
      (lift, index) => lift?.id || `${day}-${index}-${String(lift?.exercise || "lift").replace(/[^a-z0-9]+/gi, "-")}`,
    ),
  );
  const extraLifts = Array.isArray(draft.__extraLifts) ? draft.__extraLifts : [];
  extraLifts.forEach((lift) => liftIds.add(lift?.id));
  return Object.entries(draft).reduce((count, [key, value]) => {
    if (key === "__extraLifts") return count + extraLifts.length;
    if (key.startsWith("__") || !liftIds.has(key)) return count;
    return count + (Array.isArray(value) ? value.filter(Boolean).length : 0);
  }, 0);
}

function getDayTitle(day) {
  if (!day) return "Today";
  if (day.name) return day.name;
  if (day.recovery) return "Recovery";
  if (day.lifts.length === 0) return "Rest day";
  if (day.lifts.length === 1) return day.lifts[0].exercise;
  return `${day.lifts.length} Exercises`;
}

function getFlowLabel(day, today) {
  if (!day) return "Today";
  const dayIndex = DAYS.indexOf(day);
  const todayIndex = DAYS.indexOf(today);
  if (dayIndex === todayIndex) return "Today";
  if (dayIndex === (todayIndex + 1) % DAYS.length) return "Tomorrow";
  if (dayIndex === (todayIndex + DAYS.length - 1) % DAYS.length) return "Yesterday";
  return day;
}

function getFlowAccent(day) {
  if (day?.recovery) return dayColors.recovery;
  return day?.accent || colors.brand;
}

function getLiftPR(lift, prs) {
  const base = getBaseExercise(lift);
  const record = prs[base] || prs[lift?.exercise];
  return record ? formatPR(record) : "";
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
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

const homeWrap = {
  display: "grid",
  gap: 16,
};

const pageHeader = {
  display: "grid",
  gap: 6,
  padding: "8px 0 4px",
};

const card = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  padding: 16,
};

const resumeCard = {
  ...card,
  borderColor: tint(colors.brand, 0.35),
  background: tint(colors.brand, 0.06),
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const resumeTitle = {
  ...type.sectionTitle,
  marginTop: 4,
};

const resumeCopy = {
  ...type.meta,
  margin: "2px 0 0",
};

const resumeButton = {
  flex: "0 0 auto",
};

const focusCard = {
  ...card,
  display: "grid",
  gap: 14,
  touchAction: "pan-y",
};

const flowTop = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const focusTitle = {
  ...type.pageTitle,
  fontSize: 24,
  margin: "6px 0 2px",
  overflowWrap: "anywhere",
};

const focusCopy = {
  ...type.meta,
  margin: 0,
};

const flowNav = {
  display: "flex",
  gap: 6,
  flex: "0 0 auto",
};

const iconButton = {
  width: 34,
  height: 34,
  padding: 0,
  display: "grid",
  placeItems: "center",
  color: colors.muted,
  background: "transparent",
};

const flowList = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  borderTop: `1px solid ${colors.borderSoft}`,
  borderBottom: `1px solid ${colors.borderSoft}`,
};

const flowLiftRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "11px 0",
  borderTop: `1px solid ${colors.borderSoft}`,
};

const flowLiftName = {
  display: "block",
  color: colors.text,
  fontSize: 15,
  fontWeight: 550,
  lineHeight: 1.3,
};

const flowLiftMeta = {
  ...type.meta,
  ...type.number,
  margin: "2px 0 0",
};

const flowLiftPr = {
  ...type.number,
  flex: "0 0 auto",
  color: colors.muted,
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const flowRecovery = {
  ...type.body,
  display: "grid",
  gap: 4,
  padding: "12px 0",
  borderTop: `1px solid ${colors.borderSoft}`,
  borderBottom: `1px solid ${colors.borderSoft}`,
  color: colors.muted,
};

const flowCta = {
  width: "100%",
  padding: "12px 16px",
  fontSize: 15,
};

const bigThreeHeader = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
};

const bigThreeTotal = {
  ...type.number,
  color: colors.text,
  fontSize: 17,
  fontWeight: 650,
};

const bigThreeTotalLabel = {
  marginLeft: 6,
  color: colors.muted,
  fontSize: 13,
  fontWeight: 400,
};

const bigThreeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
};

const bigThreeCell = {
  display: "grid",
  gap: 2,
  padding: "10px 12px",
  borderRadius: radii.lg,
  background: colors.surfaceSoft,
  border: `1px solid ${colors.borderSoft}`,
  minWidth: 0,
};

const bigThreeValue = {
  ...type.number,
  fontSize: 22,
  fontWeight: 650,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

const bigThreeUnit = {
  color: colors.muted,
  fontSize: 13,
  fontWeight: 500,
};

const bigThreeHint = {
  ...type.number,
  color: colors.mutedStrong,
  fontSize: 12,
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const linkButton = {
  padding: "6px 8px",
  fontSize: 13,
  color: colors.brand,
};

const emptyState = {
  display: "grid",
  justifyItems: "center",
  gap: 12,
  padding: "28px 16px",
  color: colors.muted,
  textAlign: "center",
};

const recentList = {
  ...card,
  padding: 0,
  overflow: "hidden",
};

const recentItem = {
  borderTop: `1px solid ${colors.borderSoft}`,
};

const recentSummary = {
  width: "100%",
  border: 0,
  borderRadius: 0,
  background: "transparent",
  padding: "13px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  textAlign: "left",
  fontWeight: 400,
};

const recentName = {
  margin: 0,
  color: colors.text,
  fontSize: 15,
  fontWeight: 550,
};

const recentDate = {
  ...type.meta,
  ...type.number,
  margin: "2px 0 0",
};

const recentLoad = {
  ...type.number,
  color: colors.textSoft,
  fontSize: 14,
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const recentDetails = {
  display: "grid",
  padding: "0 16px 8px",
  background: colors.surfaceSoft,
  borderTop: `1px solid ${colors.borderSoft}`,
};

const recentLift = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 0",
  borderBottom: `1px solid ${colors.borderSoft}`,
};

const recentLiftName = {
  color: colors.textSoft,
  fontSize: 14,
  fontWeight: 550,
};

const recentLiftVolume = {
  ...type.number,
  color: colors.muted,
  fontSize: 13,
  whiteSpace: "nowrap",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 230,
  background: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalPanel = {
  width: "min(440px, 100%)",
  maxHeight: "88vh",
  overflow: "auto",
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  padding: "18px 18px 0",
};

const modalTitle = {
  ...type.pageTitle,
  fontSize: 22,
  marginTop: 4,
};

const closeBtn = {
  width: 34,
  height: 34,
  padding: 0,
};

const modalBody = {
  display: "grid",
  gap: 14,
  padding: 18,
};

const field = {
  display: "grid",
  gap: 6,
};

const fieldLabel = {
  color: colors.textSoft,
  fontSize: 13,
  fontWeight: 500,
};

const fullButton = {
  width: "100%",
  padding: "12px 16px",
  marginTop: 4,
};
