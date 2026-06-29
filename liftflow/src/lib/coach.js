import { getExerciseTrends } from "./engine";
import { getSettings } from "./settings";

export function getCoachRecommendation(exercise, currentWeight) {
  const trends = getExerciseTrends();
  const settings = getSettings();

  const data = trends[exercise];

  let suggestion = {
    exercise,
    currentWeight,
    suggestedWeight: currentWeight,
    confidence: 0.5,
    reason: [],
    autoApply: false,
  };

  // 🧠 IF USER HAS HISTORY FOR THIS LIFT
  if (data && data.count > 0) {
    const avg = data.totalWeight / data.count;

    if (avg > currentWeight) {
      suggestion.suggestedWeight = currentWeight + 5;
      suggestion.reason.push("User historically performs above current load");
    } else {
      suggestion.reason.push("Stable performance range detected");
    }

    suggestion.confidence = Math.min(0.9, 0.5 + data.count * 0.05);
  }

  // ⚠️ AUTO MODE LOGIC
  const isAuto =
    settings.coachMode === "auto" && settings.autoProgression;

  suggestion.autoApply = isAuto;

  return suggestion;
}