import { colors, tint } from "./theme";

export const MUSCLE_GROUPS = [
  { id: "chest", label: "Chest", color: colors.brand },
  { id: "back", label: "Back", color: colors.blue },
  { id: "legs", label: "Legs", color: colors.warning },
  { id: "shoulders", label: "Shoulders", color: colors.violet },
  { id: "arms", label: "Arms", color: colors.accent },
  { id: "core", label: "Core", color: colors.textSoft },
  { id: "conditioning", label: "Conditioning", color: colors.success },
  { id: "other", label: "Other", color: "#8a8a8a" },
];

export function getMuscleGroup(groupId) {
  return MUSCLE_GROUPS.find((group) => group.id === groupId) || MUSCLE_GROUPS[MUSCLE_GROUPS.length - 1];
}
export { tint };
