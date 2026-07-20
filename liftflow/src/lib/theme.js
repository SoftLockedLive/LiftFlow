export const colors = {
  bg: "#020305",
  surface: "#12151a",
  surfaceSoft: "#0c0f13",
  surfaceRaised: "#171c22",
  surfaceDeep: "#06080b",
  border: "#2f3844",
  borderSoft: "#1d2630",
  text: "#fffdf2",
  textSoft: "#e5e1d3",
  muted: "#9a9689",
  mutedStrong: "#716d63",
  inverse: "#020305",
  brand: "#21d9ff",
  accent: "#efff38",
  success: "#43f08d",
  recovery: "#f472b6",
  warning: "#ffb238",
  danger: "#ff7047",
  violet: "#b985ff",
  blue: "#55aaff",
};

export const liftColors = {
  bench: colors.accent,
  squat: colors.warning,
  deadlift: colors.blue,
};

export const dayColors = {
  Monday: "#21d9ff",
  Tuesday: "#ff7047",
  Wednesday: "#efff38",
  Thursday: "#b985ff",
  Friday: "#ffb238",
  Saturday: "#43f08d",
  Sunday: "#fffdf2",
  recovery: colors.recovery,
  today: "#21d9ff",
};

export function tint(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
