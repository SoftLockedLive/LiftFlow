import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getPRs } from "../lib/engine";
import { getWorkouts } from "../lib/workoutStorage";

export default function Layout({ children }) {
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    bodyweight: "",
    goal: "strength",
    experience: "beginner",
    units: "lbs",
  });

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

  return (
    <div style={shell}>
      {/* TOP BAR */}
      <div style={topBar}>
        <div style={{ fontWeight: 700 }}>LiftFlow</div>

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
        <div style={{ ...prCard, borderColor: "#3b82f6" }}>
          Bench <div style={prValue}>{bench} lbs</div>
        </div>
        <div style={{ ...prCard, borderColor: "#22c55e" }}>
          Squat <div style={prValue}>{squat} lbs</div>
        </div>
        <div style={{ ...prCard, borderColor: "#ef4444" }}>
          Deadlift <div style={prValue}>{deadlift} lbs</div>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={tabBar}>
        {tabs.map((tab) => {
          const active = router.pathname === tab.path;

          return (
            <div
              key={tab.path}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={() => {
                document.activeElement?.blur?.();
                router.push(tab.path);
              }}
              style={{
                ...tabPill,
                ...(active ? activePill : {}),
              }}
            >
              {tab.name}
            </div>
          );
        })}
      </div>

      {/* CONTENT */}
      <div style={content}>{children}</div>

      {/* PROFILE MODAL */}
      {profileOpen && (
        <div style={overlayBackdrop} onClick={() => setProfileOpen(false)}>
          <div
            style={overlayPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={overlayHeader}>
              <h2 style={{ margin: 0 }}>Profile</h2>
              <button
                onClick={() => setProfileOpen(false)}
                style={closeButton}
              >
                ✕
              </button>
            </div>

            <div style={profileBody}>
              <input
                placeholder="Name"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                style={inputStyle}
              />

              <input
                placeholder="Bodyweight"
                type="number"
                value={profile.bodyweight}
                onChange={(e) =>
                  setProfile({ ...profile, bodyweight: e.target.value })
                }
                style={inputStyle}
              />

              <select
                value={profile.goal}
                onChange={(e) =>
                  setProfile({ ...profile, goal: e.target.value })
                }
                style={inputStyle}
              >
                <option value="strength">Strength</option>
                <option value="hypertrophy">Hypertrophy</option>
                <option value="fat_loss">Fat Loss</option>
              </select>

              <select
                value={profile.experience}
                onChange={(e) =>
                  setProfile({ ...profile, experience: e.target.value })
                }
                style={inputStyle}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              <button
                style={primaryButton}
                onClick={() => {
                  localStorage.setItem(
                    "liftflow_profile",
                    JSON.stringify(profile)
                  );
                  setProfileOpen(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const shell = {
  minHeight: "100vh",
  background: "#0b0f19",
  color: "white",
  fontFamily: "system-ui",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderBottom: "1px solid #1f2937",
};

const rightSide = {
  display: "flex",
  gap: 12,
  alignItems: "center",
};

const big3 = {
  fontSize: 12,
  opacity: 0.8,
};

const avatar = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "#1f2937",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const prStrip = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 10,
  padding: 12,
};

const prCard = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #1f2937",
  background: "#111827",
};

const prValue = {
  fontSize: 16,
  fontWeight: 600,
};

const tabBar = {
  display: "flex",
  overflowX: "auto",
  gap: 10,
  padding: "10px 12px",
  borderBottom: "1px solid #1f2937",
};

const tabPill = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "#111827",
  border: "1px solid #1f2937",
  fontSize: 13,
  opacity: 0.7,
  cursor: "pointer",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
};

const activePill = {
  opacity: 1,
  borderColor: "#00e5ff",
  color: "#00e5ff",
  background: "rgba(0,229,255,0.08)",
};

const content = {
  padding: 16,
};

/* modal */

const overlayBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const overlayPanel = {
  width: "90%",
  maxWidth: 420,
  background: "#111827",
  borderRadius: 12,
  border: "1px solid #1f2937",
};

const overlayHeader = {
  display: "flex",
  justifyContent: "space-between",
  padding: 16,
  borderBottom: "1px solid #1f2937",
};

const profileBody = {
  padding: 16,
  display: "grid",
  gap: 12,
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #333",
  background: "#0f172a",
  color: "white",
};

const closeButton = {
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: 18,
};

const primaryButton = {
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: "#00e5ff",
  color: "#000",
  fontWeight: 600,
};