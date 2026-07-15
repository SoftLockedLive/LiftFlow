import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { getPRs } from "../lib/engine";
import { getManualPRs } from "../lib/manualPRs";
import { getProfile, saveProfile } from "../lib/profile";
import { getWorkouts } from "../lib/workoutStorage";
import { getBaseExercise, getLiftSets, getWorkoutItems } from "../lib/workoutAnalytics";

const ACCENTS = {
  lime: "#e4ff2f",
  yellow: "#e4ff2f",
  orange: "#ff6b2c",
  cyan: "#32cfff",
  violet: "#be72ff",
  green: "#32df76",
};

export default function Layout({ children }) {
  const router = useRouter();
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
    { name: "Nutrition", path: "/protein" },
    { name: "Notes", path: "/notes" },
    { name: "History", path: "/history" },
    { name: "Progress", path: "/progress" },
    { name: "PRs", path: "/prs" },
    { name: "Profile", path: "/profile" },
  ];

  const liftCards = [
    { label: "Bench", value: bench, reps: bestSets.bench?.reps, accent: ACCENTS.lime },
    { label: "Squat", value: squat, reps: bestSets.squat?.reps, accent: ACCENTS.orange },
    { label: "Dead", value: deadlift, reps: bestSets.deadlift?.reps, accent: ACCENTS.cyan },
  ];

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

      <nav style={tabWrapper} aria-label="Main navigation">
        <div className="app-tabs" style={tabBar}>
          {tabs.map((tab) => {
            const active = tab.path && router.pathname === tab.path;

            return (
              <button
                key={tab.name}
                type="button"
                onClick={() => (tab.action ? tab.action() : router.push(tab.path))}
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

function tint(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  background: "#000",
  color: "#f7f7f2",
};

const hero = {};

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
  borderRadius: 10,
  objectFit: "cover",
  boxShadow: "0 0 22px rgba(50, 207, 255, 0.18)",
};

const brand = {
  margin: 0,
  color: ACCENTS.cyan,
  fontSize: "clamp(28px, 5vw, 42px)",
  lineHeight: 1,
  fontWeight: 900,
};

const subhead = {
  margin: "5px 0 0",
  color: "#626262",
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
  borderColor: "#262626",
  color: "#777",
  background: "#0e0e0e",
  overflow: "hidden",
};

const avatarImage = {
  width: "100%",
  height: "100%",
  display: "block",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const clubGrid = {};

const totalStrip = {
  gridColumn: "1 / -1",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: 44,
  border: "1px solid rgba(50, 207, 255, 0.18)",
  borderRadius: 14,
  background: "linear-gradient(135deg, rgba(50, 207, 255, 0.12), rgba(228, 255, 47, 0.04))",
  padding: "9px 12px",
};

const totalStripLabel = {
  color: "#727272",
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const totalStripValue = {
  color: ACCENTS.yellow,
  fontSize: 20,
  lineHeight: 1,
};

const metricCard = {
  gridColumn: "span 2",
  minHeight: 82,
  background: "#111",
  border: "1px solid",
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const metricLabel = {
  color: "#5f5f5f",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
};

const metricValue = {
  fontSize: 21,
  lineHeight: 1,
};

const metricHint = {
  color: "#454545",
  fontSize: 12,
  fontWeight: 800,
};

const tabWrapper = {
  position: "sticky",
  top: 0,
  zIndex: 40,
  background: "#000",
  borderBottom: "1px solid #151515",
};

const tabBar = {
};

const tabPill = {
  flex: "0 0 auto",
  padding: "9px 15px",
  borderColor: "#1d1d1d",
  background: "#050505",
  color: "#5e5e5e",
  fontSize: 14,
  textTransform: "uppercase",
};

const activeTab = {
  background: "#f7f7f2",
  borderColor: "#f7f7f2",
  color: "#050505",
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
  background: "#101010",
  border: "1px solid #2b2b2b",
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
  color: ACCENTS.lime,
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
