export const MUSCLE_GROUPS = [
  { id: "chest", label: "Chest", color: "#e4ff2f" },
  { id: "back", label: "Back", color: "#32cfff" },
  { id: "legs", label: "Legs", color: "#ff6b2c" },
  { id: "shoulders", label: "Shoulders", color: "#be72ff" },
  { id: "arms", label: "Arms", color: "#ff9b34" },
  { id: "core", label: "Core", color: "#f7f7f2" },
  { id: "conditioning", label: "Conditioning", color: "#32df76" },
  { id: "other", label: "Other", color: "#8a8a8a" },
];

export function getMuscleGroup(groupId) {
  return MUSCLE_GROUPS.find((group) => group.id === groupId) || MUSCLE_GROUPS[MUSCLE_GROUPS.length - 1];
}

export function tint(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
