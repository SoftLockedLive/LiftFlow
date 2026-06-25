import Link from "next/link";

const tabStyle = {
  color: "#00e5ff",
  textDecoration: "none",
  fontSize: 12,
};

export default function NavBar() {
  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
      background: "#111827",
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      borderTop: "1px solid #1f2937"
    }}>
      <Link href="/" style={tabStyle}>Home</Link>
      <Link href="/program" style={tabStyle}>Program</Link>
      <Link href="/prs" style={tabStyle}>PRs</Link>
      <Link href="/calendar" style={tabStyle}>Plan</Link>
      <Link href="/profile" style={tabStyle}>Profile</Link>
    </div>
  );
}