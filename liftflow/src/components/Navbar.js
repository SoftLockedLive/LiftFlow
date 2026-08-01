import { useRouter } from "next/router";
import { colors, tint } from "../lib/theme";

export default function NavBar() {
  const router = useRouter();

  const tabs = [
    { label: "Home", path: "/" },
    { label: "Workout", path: "/workout" },
    { label: "Program", path: "/plan" },
    { label: "Mobility", path: "/mobility" },
    { label: "Running", path: "/running" },
    { label: "PRs", path: "/prs" },
    { label: "History", path: "/history" },
    { label: "Profile", path: "/profile" },
  ];

  const isActive = (path) => router.pathname === path;

  const handleNav = (e, path) => {
    e.preventDefault();
    e.currentTarget.blur();
    document.activeElement?.blur?.();
    router.push(path);
  };

  return (
    <div style={bar}>
      {tabs.map((t) => (
        <div
          key={t.path}
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
          onClick={(e) => handleNav(e, t.path)}
          style={{
            ...tab,
            ...(isActive(t.path) ? active : {}),
          }}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}

const bar = {
  display: "flex",
  overflowX: "auto",
  gap: 10,
  padding: 10,
  background: colors.bg,
  borderTop: `1px solid ${colors.borderSoft}`,
};

const tab = {
  padding: "8px 12px",
  borderRadius: 999,
  background: colors.surfaceDeep,
  border: `1px solid ${colors.borderSoft}`,
  color: colors.muted,
  fontSize: 12,
  whiteSpace: "nowrap",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  cursor: "pointer",
};

const active = {
  color: colors.brand,
  borderColor: colors.brand,
  background: tint(colors.brand, 0.08),
};
