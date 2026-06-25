const KEY = "liftflow_program";

const DEFAULT_PROGRAM = [
  { name: "Bench Press", sets: 3, reps: 5 },
  { name: "Squat", sets: 3, reps: 5 },
  { name: "Deadlift", sets: 1, reps: 5 },
];

export function getProgram() {
  if (typeof window === "undefined") return DEFAULT_PROGRAM;

  const data = localStorage.getItem(KEY);
  return data ? JSON.parse(data) : DEFAULT_PROGRAM;
}

export function saveProgram(program) {
  if (typeof window === "undefined") return;

  localStorage.setItem(KEY, JSON.stringify(program));
}

export function addLift(lift) {
  const program = getProgram();
  program.push(lift);
  saveProgram(program);
}

export function deleteLift(index) {
  const program = getProgram();
  program.splice(index, 1);
  saveProgram(program);
}