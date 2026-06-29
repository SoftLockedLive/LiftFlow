import { useRouter } from "next/router";

export default function NavBar() {
  const router = useRouter();

  const tabs = [
    { label: "Home", path: "/" },
    { label: "Workout", path: "/workout" },
    { label: "Plan", path: "/plan" },
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
  background: "#0b0f19",
  borderTop: "1px solid #1f2937",
};

const tab = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "#111827",
  border: "1px solid #1f2937",
  color: "#9ca3af",
  fontSize: 12,
  whiteSpace: "nowrap",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  cursor: "pointer",
};

const active = {
  color: "#00e5ff",
  borderColor: "#00e5ff",
  background: "rgba(0,229,255,0.08)",
};