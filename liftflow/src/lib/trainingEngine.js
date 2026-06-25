export function calculateFatigue(workouts) {
  if (!workouts.length) return 30;

  const now = Date.now();

  // weight recent workouts more heavily
  let score = 0;

  for (let w of workouts.slice(-5)) {
    const ageHours = (now - new Date(w.date).getTime()) / (1000 * 60 * 60);

    const decay = Math.max(0.2, 1 - ageHours / 72); // 3-day decay

    score += (w.load || 0) * decay;
  }

  // normalize into 0–100 scale
  if (score < 1000) return 30;
  if (score < 3000) return 50;
  return 75;
}

export function intensityLevel(fatigue) {
  if (fatigue < 40) return "light";
  if (fatigue < 70) return "normal";
  return "heavy";
}