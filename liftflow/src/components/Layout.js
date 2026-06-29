import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getPRs } from "../lib/engine";
import { getWorkouts } from "../lib/workoutStorage";

export default function Layout({ children }) {
  const router = useRouter();

  // ---------------- PROFILE ----------------
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    bodyweight: "",
    goal: "strength",
    experience: "beginner",
    units: "lbs",
  });

  // ---------------- PR DATA ----------------
  const [prs, setPrs] = useState({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const workouts = getWorkouts();
    setPrs(getPRs(workouts));
    setHydrated(true);

    const saved = localStorage.getItem("liftflow_profile");
    if (saved) setProfile(JSON.parse(saved));
  }, []);

  useEffect(() => {
    document.body.style.overflow = profileOpen ? "hidden" : "auto";
  }, [profileOpen]);

  // ---------------- LIFTS ----------------
  const bench = prs["Bench Press"] || 0;
  const squat = prs["Squat"] || 0;
  const deadlift = prs["Deadlift"] || 0;
  const total = bench + squat + deadlift;

  const tabs = [
    { name: "Home", path: "/" },
    { name: "Workout", path: "/workout" },
    { name: "Plan", path: "/plan" },
    { name: "History", path: "/history" },
    { name: "PRs", path: "/prs" },
  ];

  const isActive = (path) => router.pathname === path;

  // ---------------- UI ----------------
  return (
    <div style={shell}>
      {/* TOP BAR */}
      <div style={topBar}>
        <div style={brand}>LiftFlow</div>

        <div style={rightSide}>
          <div style={big3}>
            Big 3: {hydrated ? total : "--"} lbs
          </div>

          <div
            style={avatar}
            onClick={() => setProfileOpen(true)}
          >
            👤
          </div>
        </div>
      </div>

      {/* PR STRIP */}
      <div style={prStrip}>
        <div style={{ ...prCard, borderColor: "#00e5ff" }}>
          <div style={{ color: "#00e5ff" }}>Bench</div>
          <div style={{ ...prValue, color: "#00e5ff" }}>{bench}</div>
        </div>

        <div style={{ ...prCard, borderColor: "#22c55e" }}>
          <div style={{ color: "#22c55e" }}>Squat</div>
          <div style={{ ...prValue, color: "#22c55e" }}>{squat}</div>
        </div>

        <div style={{ ...prCard, borderColor: "#ef4444" }}>
          <div style={{ color: "#ef4444" }}>Deadlift</div>
          <div style={{ ...prValue, color: "#ef4444" }}>{deadlift}</div>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={tabWrapper}>
        <div style={tabBar}>
          {tabs.map((tab) => (
            <div
              key={tab.path}
              onClick={(e) => {
                e.currentTarget.blur(); // kills stuck white border
                router.push(tab.path);
              }}
              style={{
                ...tabPill,
                ...(isActive(tab.path) ? activeTab : {}),
              }}
            >
              {tab.name}
            </div>
          ))}
        </div>
      </div>

      {/* PAGE */}
      <div style={page}>{children}</div>

      {/* PROFILE MODAL */}
      {profileOpen && (
        <div style={overlay} onClick={() => setProfileOpen(false)}>
          <div
            style={panel}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={modalHeader}>
              <h2 style={{ margin: 0 }}>Profile</h2>
              <button
                onClick={() => setProfileOpen(false)}
                style={closeBtn}
              >
                ✕
              </button>
            </div>

            <div style={modalBody}>
              <input
                placeholder="Name"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                style={input}
              />

              <input
                type="number"
                placeholder="Bodyweight"
                value={profile.bodyweight}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    bodyweight: e.target.value,
                  })
                }
                style={input}
              />

              <select
                value={profile.goal}
                onChange={(e) =>
                  setProfile({ ...profile, goal: e.target.value })
                }
                style={input}
              >
                <option value="strength">Strength</option>
                <option value="hypertrophy">Hypertrophy</option>
                <option value="fat_loss">Fat Loss</option>
              </select>

              <select
                value={profile.experience}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    experience: e.target.value,
                  })
                }
                style={input}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              <select
                value={profile.units}
                onChange={(e) =>
                  setProfile({ ...profile, units: e.target.value })
                }
                style={input}
              >
                <option value="lbs">LBS</option>
                <option value="kg">KG</option>
              </select>

              <button
                onClick={() => {
                  localStorage.setItem(
                    "liftflow_profile",
                    JSON.stringify(profile)
                  );
                  setProfileOpen(false);
                }}
                style={saveBtn}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =======================
   DESIGN SYSTEM V3
======================= */

const shell = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, #0f172a 0%, #0b0f19 55%, #06090f 100%)",
  color: "white",
  fontFamily: "system-ui",
};

/* TOP BAR */
const topBar = {
  display: "flex",
  justifyContent: "space-between",
  padding: 14,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const brand = {
  fontWeight: 900,
  letterSpacing: 0.5,
};

const rightSide = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const big3 = {
  fontSize: 12,
  opacity: 0.7,
};

const avatar = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

/* PRS */
const prStrip = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10,
  padding: 12,
};

const prCard = {
  padding: 12,
  borderRadius: 16,
  background: "rgba(17,24,39,0.6)",
  border: "1px solid rgba(255,255,255,0.06)",
  backdropFilter: "blur(10px)",
  textAlign: "center",
};

const prValue = {
  fontSize: 20,
  fontWeight: 900,
  marginTop: 6,
};

/* TABS */
const tabWrapper = {
  position: "sticky",
  top: 0,
  zIndex: 50,
  background: "rgba(11,15,25,0.85)",
  backdropFilter: "blur(12px)",
};

const tabBar = {
  display: "flex",
  gap: 10,
  padding: "10px 12px",
  overflowX: "auto",
};

const tabPill = {
  padding: "10px 14px",
  borderRadius: 999,
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "all 0.2s ease",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  color: "#9ca3af",
};

const activeTab = {
  color: "#00e5ff",
  background:
    "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(34,197,94,0.08))",
  border: "1px solid rgba(0,229,255,0.4)",
  boxShadow: "0 0 18px rgba(0,229,255,0.15)",
  transform: "translateY(-1px)",
};

/* PAGE */
const page = {
  padding: 14,
  paddingBottom: 100,
  maxWidth: 520,
  margin: "0 auto",
};

/* MODAL */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.75)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const panel = {
  width: "92%",
  maxWidth: 420,
  background: "rgba(17,24,39,0.92)",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(14px)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  padding: 14,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const closeBtn = {
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: 18,
  cursor: "pointer",
};

const modalBody = {
  display: "grid",
  gap: 10,
  padding: 14,
};

const input = {
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(15,23,42,0.6)",
  color: "white",
};

const saveBtn = {
  padding: 12,
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#00e5ff,#22c55e)",
  color: "#000",
  fontWeight: 800,
  cursor: "pointer",
};