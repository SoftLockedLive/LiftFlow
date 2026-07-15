export const colors = {
  bg: "#000000",
  surface: "#101010",
  surfaceSoft: "#0b0b0b",
  surfaceRaised: "#121212",
  surfaceDeep: "#050505",
  border: "#242424",
  borderSoft: "#1d1d1d",
  text: "#f7f7f2",
  textSoft: "#d7d7d2",
  muted: "#777777",
  mutedStrong: "#555555",
  inverse: "#050505",
  brand: "#32cfff",
  accent: "#e4ff2f",
  success: "#32df76",
  warning: "#ff9b34",
  danger: "#ff6b2c",
  violet: "#a978ff",
  blue: "#3aa7ff",
};

export const liftColors = {
  bench: colors.accent,
  squat: colors.warning,
  deadlift: colors.blue,
};

export const dayColors = {
  Monday: colors.brand,
  Tuesday: colors.warning,
  Wednesday: colors.accent,
  Thursday: colors.violet,
  Friday: colors.danger,
  Saturday: colors.success,
  Sunday: colors.textSoft,
  recovery: colors.success,
  today: colors.brand,
};

export function tint(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
