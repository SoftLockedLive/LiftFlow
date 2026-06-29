const KEY = "liftflow_plan";

const DEFAULT_PLAN = {
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
};

export function getPlan() {
  if (typeof window === "undefined") return DEFAULT_PLAN;

  const data = localStorage.getItem(KEY);

  return data ? JSON.parse(data) : DEFAULT_PLAN;
}

export function savePlan(plan) {
  if (typeof window === "undefined") return;

  localStorage.setItem(KEY, JSON.stringify(plan));
}

export function addExercise(day, exercise) {
  const plan = getPlan();

  plan[day].push({
    id: crypto.randomUUID(),
    exercise,
    sets: 3,
    reps: 8,
  });

  savePlan(plan);
}

export function removeExercise(day, id) {
  const plan = getPlan();

  plan[day] = plan[day].filter(
    (e) => e.id !== id
  );

  savePlan(plan);
}