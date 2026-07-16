import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { getPRs } from "../lib/engine";
import { getManualPRs } from "../lib/manualPRs";
import { getProfile, saveProfile } from "../lib/profile";
import { getWorkouts } from "../lib/workoutStorage";
import { getBaseExercise, getLiftSets, getWorkoutItems } from "../lib/workoutAnalytics";
import { colors, liftColors, tint } from "../lib/theme";

export default function Layout({ children }) {
  const router = useRouter();
  const isHome = router.pathname === "/";
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    bodyweight: "154.8",
    goal: "strength",
    experience: "beginner",
    units: "lbs",
  });
  const [prs, setPrs] = useState({});
  const [bestSets, setBestSets] = useState({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loadDashboard = () => {
      const workouts = getWorkouts();
      setPrs(getPRs(workouts));
      setBestSets(getBigThreeBestSets(workouts, getManualPRs()));
      setHydrated(true);
      setProfile(getProfile());
    };

    const timer = window.setTimeout(loadDashboard, 0);
    window.addEventListener("liftflow-profile-updated", loadDashboard);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("liftflow-profile-updated", loadDashboard);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = profileOpen ? "hidden" : "auto";
  }, [profileOpen]);

  const bench = Math.max(Number(profile.benchPR || 0), Number(prs["Bench Press"] || 0), Number(bestSets.bench?.weight || 0));
  const squat = Math.max(Number(profile.squatPR || 0), Number(prs.Squat || 0), Number(bestSets.squat?.weight || 0));
  const deadlift = Math.max(Number(profile.deadliftPR || 0), Number(prs.Deadlift || 0), Number(bestSets.deadlift?.weight || 0));
  const total = bench + squat + deadlift;
  const hasTotal = hydrated && total > 0;
  const units = profile.units || "lbs";
  const bodyweightValue = profile.bodyweight || profile.weight;
  const bodyweight = bodyweightValue ? `${bodyweightValue}${units}` : "Bodyweight --";
  const initials = getInitials(profile.name);
  const goalLabel = (profile.goal || "strength")
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const tabs = [
    { name: "Home", path: "/" },
    { name: "Workout", path: "/workout" },
    { name: "Program", path: "/plan" },
    { name: "Mobility", path: "/mobility" },
    { name: "Running", path: "/running" },
    { name: "Nutrition", path: "/nutrition" },
    { name: "Notes", path: "/notes" },
    { name: "History", path: "/history" },
    { name: "Progress", path: "/progress" },
    { name: "PRs", path: "/prs" },
    { name: "Profile", path: "/profile" },
  ];

  const liftCards = [
    { label: "Bench", value: bench, reps: bestSets.bench?.reps, accent: liftColors.bench },
    { label: "Squat", value: squat, reps: bestSets.squat?.reps, accent: liftColors.squat },
    { label: "Dead", value: deadlift, reps: bestSets.deadlift?.reps, accent: liftColors.deadlift },
  ];

  function navigateTab(path) {
    if (!path || router.pathname === path) return;
    router.push(path, undefined, { scroll: false });
  }

  return (
    <div style={shell}>
      <header className="app-hero" style={hero}>
        <div style={heroTitleBlock}>
          <div style={brandLockup}>
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={40}
              height={40}
              priority
              style={logoMark}
            />
            <h1 style={brand}>LiftFlow</h1>
          </div>
          <p style={subhead}>{goalLabel} training · {bodyweight}</p>
        </div>

        <div className="app-hero-right" style={heroRight}>
          <button style={profileButton} onClick={() => setProfileOpen(true)}>
            {profile.photo ? (
              <span style={{ ...avatarImage, backgroundImage: `url(${profile.photo})` }} />
            ) : (
              initials
            )}
          </button>
        </div>
      </header>

      <nav className="app-tab-shell" style={tabWrapper} aria-label="Main navigation">
        <div className="app-tabs" style={tabBar}>
          {tabs.map((tab) => {
            const active = tab.path && router.pathname === tab.path;

            return (
              <button
                key={tab.name}
                type="button"
                onClick={() => (tab.action ? tab.action() : navigateTab(tab.path))}
                style={{
                  ...tabPill,
                  ...(active ? activeTab : {}),
                }}
              >
                {tab.name}
              </button>
            );
          })}
        </div>
      </nav>

      {isHome && (
        <section className="app-metrics" style={clubGrid} aria-label="Club total and PRs">
          <div style={totalStrip}>
            <span style={totalStripLabel}>Big 3 Total</span>
            <strong style={totalStripValue}>{hasTotal ? `${total} ${units}` : "--"}</strong>
          </div>

          {liftCards.map((lift) => (
            <div key={lift.label} style={{ ...metricCard, borderColor: tint(lift.accent, 0.35) }}>
              <span style={metricLabel}>{lift.label}</span>
              <strong style={{ ...metricValue, color: lift.value ? lift.accent : "#3e3e3e" }}>
                {lift.value ? `${lift.value} ${units}` : "--"}
              </strong>
              <span style={metricHint}>{lift.value && lift.reps ? `x ${lift.reps} reps` : lift.value ? "tracked" : "not logged"}</span>
            </div>
          ))}

        </section>
      )}

      <main className="app-page" style={page}>{children}</main>

      {profileOpen && (
        <div style={overlay} onClick={() => setProfileOpen(false)}>
          <section style={panel} onClick={(event) => event.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={modalTitle}>Profile</h2>
              <button type="button" onClick={() => setProfileOpen(false)} style={closeBtn}>
                X
              </button>
            </div>

            <div style={modalBody}>
              <label style={modalField}>
                <span style={modalLabel}>Full name</span>
                <input
                  placeholder="Full name"
                  value={profile.name || ""}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                />
              </label>
              <label style={modalField}>
                <span style={modalLabel}>Bodyweight</span>
                <input
                  type="number"
                  placeholder="Bodyweight"
                  value={profile.bodyweight || profile.weight || ""}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      bodyweight: event.target.value,
                      weight: profile.weight || event.target.value,
                    })
                  }
                />
              </label>
              <label style={modalField}>
                <span style={modalLabel}>Goal</span>
                <select
                  value={profile.goal || "strength"}
                  onChange={(event) => setProfile({ ...profile, goal: event.target.value })}
                >
                  <option value="strength">Strength</option>
                  <option value="hypertrophy">Hypertrophy</option>
                  <option value="fat_loss">Fat Loss</option>
                </select>
              </label>
              <label style={modalField}>
                <span style={modalLabel}>Experience</span>
                <select
                  value={profile.experience || "beginner"}
                  onChange={(event) => setProfile({ ...profile, experience: event.target.value })}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label style={modalField}>
                <span style={modalLabel}>Units</span>
                <select
                  value={profile.units || "lbs"}
                  onChange={(event) => setProfile({ ...profile, units: event.target.value })}
                >
                  <option value="lbs">LBS</option>
                  <option value="kg">KG</option>
                </select>
              </label>

              <button
                type="button"
                className="primary"
                onClick={() => {
                  saveProfile({
                    ...profile,
                    weight: profile.weight || profile.bodyweight,
                  });
                  window.dispatchEvent(new Event("liftflow-profile-updated"));
                  setProfileOpen(false);
                }}
              >
                Save Profile
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return "ME";
}

function getBigThreeBestSets(workouts, manualPrs) {
  const best = {};

  (workouts || []).forEach((session) => {
    getWorkoutItems(session).forEach((lift) => {
      const key = getBigThreeKey(getBaseExercise(lift));
      if (!key) return;

      getLiftSets(lift).forEach((set) => {
        const weight = Number(set.weight || 0);
        if (weight > Number(best[key]?.weight || 0)) {
          best[key] = { weight, reps: Number(set.reps || 0) || "" };
        }
      });
    });
  });

  (manualPrs || []).forEach((pr) => {
    const key = getBigThreeKey(pr.exercise);
    const weight = Number(pr.weight || 0);
    if (key && weight > Number(best[key]?.weight || 0)) {
      best[key] = { weight, reps: pr.reps || "" };
    }
  });

  return best;
}

function getBigThreeKey(exercise) {
  const name = String(exercise || "").toLowerCase();
  if (name.includes("bench")) return "bench";
  if (name.includes("squat")) return "squat";
  if (name.includes("deadlift")) return "deadlift";
  return "";
}

const shell = {
  minHeight: "100vh",
  background: "transparent",
  color: colors.text,
};

const hero = {
  position: "relative",
};

const heroTitleBlock = {
  minWidth: 0,
};

const brandLockup = {
  display: "flex",
  alignItems: "center",
  gap: 9,
};

const logoMark = {
  width: 38,
  height: 38,
  borderRadius: 12,
  objectFit: "cover",
  boxShadow: `0 0 24px ${tint(colors.brand, 0.34)}, 0 0 0 1px ${tint(colors.accent, 0.18)}`,
};

const brand = {
  margin: 0,
  color: colors.brand,
  fontSize: "clamp(28px, 5vw, 42px)",
  lineHeight: 1,
  fontWeight: 900,
  textShadow: `0 0 24px ${tint(colors.brand, 0.34)}`,
};

const subhead = {
  margin: "5px 0 0",
  color: colors.muted,
  fontSize: 13,
  fontWeight: 750,
  whiteSpace: "nowrap",
};

const heroRight = {};

const profileButton = {
  width: 42,
  height: 42,
  padding: 0,
  borderRadius: "50%",
  borderColor: tint(colors.brand, 0.32),
  color: colors.textSoft,
  background: `linear-gradient(180deg, ${colors.surfaceRaised}, ${colors.surfaceSoft})`,
  boxShadow: `0 0 18px ${tint(colors.brand, 0.14)}`,
  overflow: "hidden",
};

const avatarImage = {
  width: "100%",
  height: "100%",
  display: "block",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const clubGrid = {
  marginTop: 0,
  marginBottom: 8,
  paddingBottom: 12,
};

const totalStrip = {
  gridColumn: "1 / -1",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: 44,
  border: `1px solid ${tint(colors.brand, 0.34)}`,
  borderRadius: 14,
  background: `linear-gradient(135deg, ${tint(colors.brand, 0.16)}, ${tint(colors.accent, 0.09)}), ${colors.surfaceSoft}`,
  padding: "9px 12px",
  boxShadow: `inset 0 1px 0 ${tint(colors.text, 0.08)}, 0 0 24px ${tint(colors.brand, 0.08)}`,
};

const totalStripLabel = {
  color: colors.muted,
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const totalStripValue = {
  color: colors.accent,
  fontSize: 20,
  lineHeight: 1,
  textShadow: `0 0 18px ${tint(colors.accent, 0.28)}`,
};

const metricCard = {
  gridColumn: "span 2",
  minHeight: 82,
  background: `linear-gradient(180deg, ${colors.surfaceRaised}, ${colors.surface})`,
  border: "1px solid",
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  boxShadow: "inset 0 1px 0 rgba(255, 253, 242, 0.05)",
};

const metricLabel = {
  color: colors.muted,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
};

const metricValue = {
  fontSize: 21,
  lineHeight: 1,
};

const metricHint = {
  color: colors.mutedStrong,
  fontSize: 12,
  fontWeight: 800,
};

const tabWrapper = {
  position: "relative",
  zIndex: 1,
  background: "rgba(2, 3, 5, 0.84)",
  marginTop: 0,
  borderTop: `1px solid ${tint(colors.text, 0.06)}`,
  borderBottom: `1px solid ${tint(colors.brand, 0.12)}`,
  backdropFilter: "blur(14px)",
  boxShadow: "none",
};

const tabBar = {
};

const tabPill = {
  flex: "0 0 auto",
  padding: "9px 15px",
  borderColor: colors.borderSoft,
  background: `linear-gradient(180deg, ${colors.surfaceSoft}, ${colors.surfaceDeep})`,
  color: colors.muted,
  fontSize: 14,
  textTransform: "uppercase",
};

const activeTab = {
  background: `linear-gradient(135deg, ${colors.brand}, ${colors.accent})`,
  borderColor: colors.brand,
  color: colors.inverse,
  boxShadow: "none",
};

const page = {
};

const overlay = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(0, 0, 0, 0.78)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
};

const panel = {
  width: "min(420px, 100%)",
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
};

const modalHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 16,
  borderBottom: "1px solid #222",
};

const modalTitle = {
  margin: 0,
  color: colors.brand,
};

const closeBtn = {
  width: 36,
  height: 36,
  padding: 0,
};

const modalBody = {
  display: "grid",
  gap: 12,
  padding: 16,
};

const modalField = {
  display: "grid",
  gap: 6,
};

const modalLabel = {
  color: "#777",
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};
