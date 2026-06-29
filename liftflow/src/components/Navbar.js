import Link from "next/link";
import { useRouter } from "next/router";

const tabStyle = {
  color: "#00e5ff",
  textDecoration: "none",
  fontSize: 12,
};

const activeStyle = {
  color: "#ffffff",
  textShadow: "0 0 8px #00e5ff",
};

export default function NavBar() {
  const router = useRouter();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: "#111827",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        borderTop: "1px solid #1f2937",
      }}
    >
      <Link href="/" legacyBehavior>
        <a
          style={{
            ...tabStyle,
            ...(router.pathname === "/" ? activeStyle : {}),
          }}
        >
          Home
        </a>
      </Link>

      <Link href="/workout" legacyBehavior>
        <a
          style={{
            ...tabStyle,
            ...(router.pathname === "/workout" ? activeStyle : {}),
          }}
        >
          Workout
        </a>
      </Link>

      <Link href="/program" legacyBehavior>
        <a
          style={{
            ...tabStyle,
            ...(router.pathname === "/program" ? activeStyle : {}),
          }}
        >
          Program
        </a>
      </Link>

      <Link href="/prs" legacyBehavior>
        <a
          style={{
            ...tabStyle,
            ...(router.pathname === "/prs" ? activeStyle : {}),
          }}
        >
          PRs
        </a>
      </Link>

      <Link href="/plan" legacyBehavior>
        <a
          style={{
            ...tabStyle,
            ...(router.pathname === "/plan" ? activeStyle : {}),
          }}
        >
          Plan
        </a>
      </Link>

      <Link href="/history" legacyBehavior>
        <a
          style={{
            ...tabStyle,
            ...(router.pathname === "/history" ? activeStyle : {}),
          }}
        >
          History
        </a>
      </Link>

      <Link href="/profile" legacyBehavior>
        <a
          style={{
            ...tabStyle,
            ...(router.pathname === "/profile" ? activeStyle : {}),
          }}
        >
          Profile
        </a>
      </Link>
    </div>
  );
}