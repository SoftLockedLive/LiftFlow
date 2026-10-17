// Design tokens. Keep in sync with the --lf-* variables in styles/globals.css.
export const colors = {
  bg: "#0a0b0d",
  surface: "#131518",
  surfaceSoft: "#0f1113",
  surfaceRaised: "#1a1d21",
  surfaceDeep: "#08090b",
  border: "#262a30",
  borderSoft: "#1d2025",
  text: "#f2f4f7",
  textSoft: "#c9ced6",
  muted: "#8b929c",
  mutedStrong: "#5d636c",
  inverse: "#06121a",
  brand: "#3db8f5",
  accent: "#f5c518",
  success: "#3ecf8e",
  recovery: "#3ecf8e",
  warning: "#f5a524",
  danger: "#f26d6d",
  violet: "#a78bfa",
  blue: "#60a5fa",
};

export const radii = { sm: 8, md: 10, lg: 14, xl: 18, pill: 999 };

// Shared text styles so pages read as one system.
export const type = {
  pageTitle: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.1,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: colors.text,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 17,
    lineHeight: 1.25,
    fontWeight: 650,
    letterSpacing: "-0.01em",
    color: colors.text,
  },
  eyebrow: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.3,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: colors.muted,
  },
  body: { fontSize: 14, lineHeight: 1.5, color: colors.textSoft },
  meta: { fontSize: 13, lineHeight: 1.4, color: colors.muted },
  number: { letterSpacing: "-0.01em" },
  // Fixed-width digits, only for values that change in place (timers). Geist's tabular
  // figures space unevenly inside normal text.
  tabular: { fontVariantNumeric: "tabular-nums" },
};

// The PR/lift accents used to be a rainbow; one neutral keeps numbers calm.
export const liftColors = {
  bench: colors.text,
  squat: colors.text,
  deadlift: colors.text,
};

// Days share the brand color; recovery days stay green.
export const dayColors = {
  Monday: colors.brand,
  Tuesday: colors.brand,
  Wednesday: colors.brand,
  Thursday: colors.brand,
  Friday: colors.brand,
  Saturday: colors.brand,
  Sunday: colors.brand,
  recovery: colors.recovery,
  today: colors.brand,
};

export function tint(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
