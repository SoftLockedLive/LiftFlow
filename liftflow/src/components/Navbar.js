import Link from "next/link";
import { useRouter } from "next/router";

export default function NavBar() {
  const router = useRouter();

  const tabStyle = {
    color: "#9ca3af",
    textDecoration: "none",
    fontSize: 12,
    padding: "8px 10px",
    borderRadius: 10,
    background: "#111827",
    border: "1px solid #1f2937",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const activeStyle = {
    color: "#00e5ff",
    borderColor: "#00e5ff",
    background: "rgba(0,229,255,0.08)",
  };

  const isActive = (path) => router.pathname === path;

  const handleClick = (e, path) => {
    e.currentTarget.blur();
    document.activeElement?.blur?.();
    router.push(path);
  };

  const Tab = ({ label, path }) => (
    <div
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
      onClick={(e) => handleClick(e, path)}
      style={{
        ...tabStyle,
        ...(isActive(path) ? activeStyle : {}),
      }}
    >
      {label}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: 10,
        overflowX: "auto",
        borderTop: "1px solid #1f2937",
        background: "#0b0f19",
      }}
    >
      <Tab label="Home" path="/" />
      <Tab label="Workout" path="/workout" />
      <Tab label="Plan" path="/plan" />
      <Tab label="PRs" path="/prs" />
      <Tab label="History" path="/history" />
      <Tab label="Profile" path="/profile" />
    </div>
  );
}