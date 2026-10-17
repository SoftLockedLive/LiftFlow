import { buildPRMap } from "./prRecords";

const LIFTS = [
  { label: "Bench", exercise: "Bench Press", profileKey: "benchPR" },
  { label: "Squat", exercise: "Squat", profileKey: "squatPR" },
  { label: "Deadlift", exercise: "Deadlift", profileKey: "deadliftPR" },
];

// Best bench/squat/deadlift from logged sets, manual PRs and the profile's own PR fields.
export function getBigThree(profile = {}, workouts = [], manualPrs = []) {
  const prs = buildPRMap(workouts, manualPrs);
  const lifts = LIFTS.map(({ label, exercise, profileKey }) => {
    const record = prs[exercise];
    const recordWeight = Number(record?.weight || 0);
    const profileWeight = Number(profile[profileKey] || 0);
    // Reps belong to the record, so only show them when the record is the number shown.
    const fromRecord = recordWeight > 0 && recordWeight >= profileWeight;
    return {
      label,
      value: Math.max(recordWeight, profileWeight),
      reps: fromRecord ? record.reps : "",
    };
  });

  return { total: lifts.reduce((sum, lift) => sum + lift.value, 0), lifts };
}
