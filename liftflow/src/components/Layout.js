import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getPRs } from "../lib/engine";
import { getProfile, saveProfile } from "../lib/profile";
import { getProteinLog, getProteinSummary, getProteinTarget } from "../lib/protein";
import { getWorkouts } from "../lib/workoutStorage";

const ACCENTS = {
  lime: "#e4ff2f",
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
  const [proteinSummary, setProteinSummary] = useState({
    today: 0,
    target: 160,
    remaining: 160,
    percent: 0,
    streak: 0,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loadDashboard = () => {
      const workouts = getWorkouts();
      setPrs(getPRs(workouts));
      setProteinSummary(getProteinSummary(getProteinLog(), getProteinTarget()));
      setHydrated(true);
      setProfile(getProfile());
    };

    const timer = window.setTimeout(loadDashboard, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = profileOpen ? "hidden" : "auto";
  }, [profileOpen]);

  const bench = Math.max(Number(profile.benchPR || 0), Number(prs["Bench Press"] || 0));
  const squat = Math.max(Number(profile.squatPR || 0), Number(prs.Squat || 0));
  const deadlift = Math.max(Number(profile.deadliftPR || 0), Number(prs.Deadlift || 0));
  const total = bench + squat + deadlift;
  const hasTotal = hydrated && total > 0;
  const units = profile.units || "lbs";
  const bodyweightValue = profile.bodyweight || profile.weight;
  const bodyweight = bodyweightValue ? `${bodyweightValue}${units}` : "Bodyweight --";
  const dotsScore = calculateDotsScore({
    total,
    bodyweight: Number(bodyweightValue || 0),
    sex: profile.sex,
    units,
  });
  const initials = getInitials(profile.name);
  const goalLabel = (profile.goal || "strength")
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const tabs = [
    { name: "Home", path: "/" },
    { name: "Program", path: "/plan" },
    { name: "Workout", path: "/workout" },
    { name: "Protein", path: "/protein" },
    { name: "History", path: "/history" },
    { name: "PRs", path: "/prs" },
    { name: "Profile", path: "/profile" },
  ];

  const liftCards = [
    { label: "Bench", value: bench, accent: ACCENTS.lime },
    { label: "Squat", value: squat, accent: ACCENTS.orange },
    { label: "Dead", value: deadlift, accent: ACCENTS.cyan },
  ];

  return (
    <div style={shell}>
      <header className="app-hero" style={hero}>
        <div>
          <h1 style={brand}>LiftFlow</h1>
          <p style={subhead}>{goalLabel} training · {bodyweight}</p>
        </div>

        <div className="app-hero-right" style={heroRight}>
          <div style={clubTotal}>
            <span style={mutedLabel}>Big 3 total</span>
            <strong style={totalValue}>{hasTotal ? `${total}${units}` : "--"}</strong>
            <span style={mutedLabel}>Best lifts</span>
          </div>
          <button style={profileButton} onClick={() => setProfileOpen(true)}>
            {initials}
          </button>
        </div>
      </header>

      <section className="app-metrics" style={clubGrid} aria-label="Club total and PRs">
        {liftCards.map((lift) => (
          <div key={lift.label} style={{ ...metricCard, borderColor: tint(lift.accent, 0.35) }}>
            <span style={metricLabel}>{lift.label}</span>
            <strong style={{ ...metricValue, color: lift.value ? lift.accent : "#3e3e3e" }}>
              {lift.value ? `${lift.value}${units}` : "--"}
            </strong>
            <span style={metricHint}>{lift.value ? "tracked" : "not logged"}</span>
          </div>
        ))}

        <div style={{ ...wideCard, borderColor: tint(ACCENTS.orange, 0.32) }}>
          <span style={metricLabel}>Dots Score</span>
          <strong style={{ ...wideValue, color: dotsScore ? ACCENTS.orange : "#414141" }}>
            {dotsScore || "--"}
          </strong>
        </div>

        <div style={{ ...wideCard, borderColor: tint(ACCENTS.cyan, 0.32) }}>
          <span style={metricLabel}>Protein Streak</span>
          <strong style={{ ...wideValue, color: proteinSummary.streak ? ACCENTS.green : "#414141" }}>
            {proteinSummary.streak ? `${proteinSummary.streak} days` : "--"}
          </strong>
        </div>
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

function calculateDotsScore({ total, bodyweight, sex, units }) {
  if (!total || !bodyweight) return null;

  const totalKg = units === "kg" ? total : total * 0.45359237;
  const bodyweightKg = units === "kg" ? bodyweight : bodyweight * 0.45359237;
  const coefficients =
    String(sex || "").toLowerCase() === "female"
      ? [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288]
      : [-0.000001093, 0.0007391293, -0.1918759221, 24.0900756, -307.75076];
  const denominator = coefficients.reduce(
    (sum, coefficient, index) => sum + coefficient * bodyweightKg ** (4 - index),
    0
  );

  if (denominator <= 0) return null;
  return Math.round((500 / denominator) * totalKg * 10) / 10;
}

const shell = {
  minHeight: "100vh",
  background: "#000",
  color: "#f7f7f2",
};

const hero = {
};

const brand = {
  margin: 0,
  color: ACCENTS.lime,
  fontSize: "clamp(34px, 7vw, 48px)",
  lineHeight: 1,
  fontWeight: 900,
};

const subhead = {
  margin: "8px 0 0",
  color: "#626262",
  fontSize: 15,
  fontWeight: 750,
};

const heroRight = {
};

const profileButton = {
  width: 42,
  height: 42,
  padding: 0,
  borderRadius: "50%",
  borderColor: "#262626",
  color: "#777",
  background: "#0e0e0e",
};

const clubGrid = {
};

const clubTotal = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  justifyContent: "center",
  minHeight: 46,
  gap: 4,
};

const mutedLabel = {
  color: "#555",
  fontSize: 14,
  fontWeight: 800,
};

const totalValue = {
  color: ACCENTS.lime,
  fontSize: 24,
  lineHeight: 1,
};

const metricCard = {
  gridColumn: "span 2",
  minHeight: 94,
  background: "#101010",
  border: "1px solid",
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const metricLabel = {
  color: "#5f5f5f",
  fontSize: 14,
  fontWeight: 800,
  textTransform: "uppercase",
};

const metricValue = {
  fontSize: 18,
  lineHeight: 1,
};

const metricHint = {
  color: "#454545",
  fontSize: 14,
  fontWeight: 800,
};

const wideCard = {
  gridColumn: "span 3",
  minHeight: 82,
  padding: 12,
  background: "#101010",
  border: "1px solid",
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const wideValue = {
  color: "#414141",
  fontSize: 22,
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
