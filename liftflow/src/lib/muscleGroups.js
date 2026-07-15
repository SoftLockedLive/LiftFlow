import { colors, tint } from "./theme";

export const MUSCLE_GROUPS = [
  { id: "chest", label: "Chest", color: colors.textSoft },
  { id: "back", label: "Back", color: colors.textSoft },
  { id: "legs", label: "Legs", color: colors.textSoft },
  { id: "shoulders", label: "Shoulders", color: colors.textSoft },
  { id: "arms", label: "Arms", color: colors.textSoft },
  { id: "core", label: "Core", color: colors.textSoft },
  { id: "conditioning", label: "Conditioning", color: colors.textSoft },
  { id: "other", label: "Other", color: colors.muted },
];

export function getMuscleGroup(groupId) {
  return MUSCLE_GROUPS.find((group) => group.id === groupId) || MUSCLE_GROUPS[MUSCLE_GROUPS.length - 1];
}
export { tint };
