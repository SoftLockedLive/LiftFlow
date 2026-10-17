import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import MoveNotice from "./MoveNotice";
import { getProfile } from "../lib/profile";
import { colors, tint } from "../lib/theme";

const PRIMARY_TABS = [
  { name: "Home", path: "/", icon: "home" },
  { name: "Workout", path: "/workout", icon: "workout" },
  { name: "Program", path: "/plan", icon: "program" },
  { name: "Progress", path: "/progress", icon: "progress" },
];

const SECONDARY_TABS = [
  { name: "History", path: "/history" },
  { name: "PRs", path: "/prs" },
  { name: "Notes", path: "/notes" },
  { name: "Profile", path: "/profile" },
  { name: "Settings", path: "/settings" },
];

export default function Layout({ children }) {
  const router = useRouter();
  const [profile, setProfile] = useState({});
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const loadProfile = () => setProfile(getProfile());
    const timer = window.setTimeout(loadProfile, 0);
    window.addEventListener("liftflow-profile-updated", loadProfile);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("liftflow-profile-updated", loadProfile);
    };
  }, []);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && event.target.closest?.("[data-more-root]")) return;
      setMoreOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [moreOpen]);

  const moreActive = SECONDARY_TABS.some((tab) => tab.path === router.pathname);

  function navigateTab(path) {
    setMoreOpen(false);
    if (!path || router.pathname === path) return;
    router.push(path);
  }

  const moreMenu = moreOpen && (
    <div className="lf-more-menu" style={moreMenuStyle} role="menu">
      {SECONDARY_TABS.map((tab) => {
        const active = router.pathname === tab.path;
        return (
          <button
            key={tab.path}
            type="button"
            role="menuitem"
            onClick={() => navigateTab(tab.path)}
            style={{ ...moreItem, ...(active ? moreItemActive : {}) }}
          >
            {tab.name}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={shell}>
      <MoveNotice />
      <header className="lf-header">
        <button type="button" onClick={() => navigateTab("/")} style={brandButton} aria-label="LiftFlow home">
          <Image src="/icons/icon-192.png" alt="" width={30} height={30} priority style={logoMark} />
          <span style={wordmark}>LiftFlow</span>
        </button>

        <nav className="lf-topnav" aria-label="Main navigation">
          {PRIMARY_TABS.map((tab) => {
            const active = router.pathname === tab.path;
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigateTab(tab.path)}
                aria-current={active ? "page" : undefined}
                style={{ ...topTab, ...(active ? topTabActive : {}) }}
              >
                {tab.name}
              </button>
            );
          })}
          <div style={moreWrap} data-more-root>
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              style={{ ...topTab, ...(moreActive ? topTabActive : {}) }}
            >
              More
            </button>
            {moreMenu}
          </div>
        </nav>

        <button type="button" onClick={() => navigateTab("/profile")} style={profileButton} aria-label="Open profile">
          {profile.photo ? (
            <span style={{ ...avatarImage, backgroundImage: `url(${profile.photo})` }} />
          ) : (
            getInitials(profile.name)
          )}
        </button>
      </header>

      <main className="app-page">{children}</main>

      <nav className="lf-tabbar" aria-label="Main navigation">
        {PRIMARY_TABS.map((tab) => {
          const active = router.pathname === tab.path;
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigateTab(tab.path)}
              aria-current={active ? "page" : undefined}
              style={{ ...barTab, ...(active ? barTabActive : {}) }}
            >
              <NavIcon name={tab.icon} />
              <span>{tab.name}</span>
            </button>
          );
        })}
        <div style={barMoreWrap} data-more-root>
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            style={{ ...barTab, ...(moreActive || moreOpen ? barTabActive : {}) }}
          >
            <NavIcon name="more" />
            <span>More</span>
          </button>
          {moreMenu}
        </div>
      </nav>
    </div>
  );
}

function NavIcon({ name }) {
  const paths = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
      </>
    ),
    workout: (
      <>
        <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
      </>
    ),
    program: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
    progress: (
      <>
        <path d="M4 19h16" />
        <path d="m4 15 5-5 4 3 7-7" />
        <path d="M15 6h5v5" />
      </>
    ),
    more: (
      <>
        <circle cx="5.5" cy="12" r="1.2" />
        <circle cx="12" cy="12" r="1.2" />
        <circle cx="18.5" cy="12" r="1.2" />
      </>
    ),
  };

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
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

const shell = {
  minHeight: "100vh",
  color: colors.text,
};

const brandButton = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 0,
  border: 0,
  background: "transparent",
};

const logoMark = {
  width: 30,
  height: 30,
  borderRadius: 8,
  objectFit: "cover",
};

const wordmark = {
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: colors.text,
};

const topTab = {
  padding: "8px 14px",
  border: "1px solid transparent",
  background: "transparent",
  color: colors.muted,
  fontSize: 14,
  fontWeight: 550,
};

const topTabActive = {
  color: colors.text,
  background: colors.surfaceRaised,
  borderColor: colors.border,
};

const moreWrap = {
  position: "relative",
};

const moreMenuStyle = {
  position: "absolute",
  zIndex: 90,
  minWidth: 180,
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  background: colors.surface,
  padding: 6,
  display: "grid",
  gap: 2,
  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
};

const moreItem = {
  width: "100%",
  padding: "10px 12px",
  border: 0,
  borderRadius: 8,
  background: "transparent",
  color: colors.textSoft,
  textAlign: "left",
  fontSize: 15,
  fontWeight: 500,
};

const moreItemActive = {
  color: colors.brand,
  background: tint(colors.brand, 0.1),
};

const profileButton = {
  width: 36,
  height: 36,
  flex: "0 0 auto",
  padding: 0,
  borderRadius: "50%",
  border: `1px solid ${colors.border}`,
  background: colors.surfaceRaised,
  color: colors.textSoft,
  fontSize: 13,
  fontWeight: 600,
  overflow: "hidden",
};

const avatarImage = {
  width: "100%",
  height: "100%",
  display: "block",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const barTab = {
  height: "var(--lf-tabbar-height)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  padding: 0,
  border: 0,
  borderRadius: 0,
  background: "transparent",
  color: colors.mutedStrong,
  fontSize: 11,
  fontWeight: 550,
};

const barTabActive = {
  color: colors.brand,
};

const barMoreWrap = {
  position: "relative",
  display: "grid",
};
