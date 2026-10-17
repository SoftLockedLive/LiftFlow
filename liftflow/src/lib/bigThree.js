import { buildPRMap } from "./prRecords";

const LIFTS = [
  { label: "Bench", exercise: "Bench Press" },
  { label: "Squat", exercise: "Squat" },
  { label: "Deadlift", exercise: "Deadlift" },
];

// Bench/squat/deadlift records from logged sets and manual PRs.
export function getBigThree(workouts = [], manualPrs = []) {
  const prs = buildPRMap(workouts, manualPrs);
  const lifts = LIFTS.map(({ label, exercise }) => ({
    label,
    value: Number(prs[exercise]?.weight || 0),
    reps: prs[exercise]?.reps || "",
  }));

  return { total: lifts.reduce((sum, lift) => sum + lift.value, 0), lifts };
}
