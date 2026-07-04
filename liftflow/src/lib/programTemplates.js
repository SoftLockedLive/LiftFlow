export const PROGRAM_TEMPLATES = [
  {
    id: "upper-lower-4",
    name: "Upper / Lower",
    summary: "Four days built around strength basics.",
    days: {
      Monday: {
        name: "Upper A",
        lifts: [
          lift("Bench Press", "chest", "3", "5-8", "Band pull-aparts, shoulder circles, 2 ramp-up sets"),
          lift("Barbell Row", "back", "3", "6-10", "Lat stretch, light rows"),
          lift("Overhead Press", "shoulders", "3", "6-8", "Wall slides, empty bar presses"),
          lift("Triceps Pushdown", "arms", "2", "10-15", "Elbow circles"),
        ],
      },
      Tuesday: {
        name: "Lower A",
        lifts: [
          lift("Squat", "legs", "3", "5-8", "Hip flexor stretch, bodyweight squats, ramp-up sets"),
          lift("Romanian Deadlift", "legs", "3", "8-10", "Hamstring sweeps"),
          lift("Leg Curl", "legs", "2", "10-15", "Light hamstring curls"),
          lift("Calf Raise", "legs", "3", "10-15", "Ankle rocks"),
        ],
      },
      Thursday: {
        name: "Upper B",
        lifts: [
          lift("Incline Bench Press", "chest", "3", "6-10", "Band pull-aparts, light incline sets"),
          lift("Pull-Up", "back", "3", "6-10", "Dead hang, scap pull-ups"),
          lift("Dumbbell Shoulder Press", "shoulders", "3", "8-12", "Shoulder circles"),
          lift("Curl", "arms", "2", "10-15", "Wrist and elbow circles"),
        ],
      },
      Friday: {
        name: "Lower B",
        lifts: [
          lift("Deadlift", "legs", "3", "3-5", "Hip hinge drill, hamstring sweeps, ramp-up sets"),
          lift("Front Squat", "legs", "3", "6-8", "Ankle rocks, goblet squats"),
          lift("Lunge", "legs", "2", "8-12", "Hip opener"),
          lift("Plank", "core", "3", "30-60", "Cat-cow, bracing breaths"),
        ],
      },
    },
  },
  {
    id: "ppl-6",
    name: "Push / Pull / Legs",
    summary: "Six-day volume split with simple repeats.",
    days: {
      Monday: {
        name: "Push A",
        lifts: [
          lift("Bench Press", "chest", "3", "6-10", "Band pull-aparts, shoulder circles"),
          lift("Overhead Press", "shoulders", "3", "6-10", "Wall slides, empty bar presses"),
          lift("Incline Dumbbell Press", "chest", "3", "8-12", "Light incline sets"),
          lift("Lateral Raise", "shoulders", "3", "12-20", "Shoulder circles"),
        ],
      },
      Tuesday: {
        name: "Pull A",
        lifts: [
          lift("Barbell Row", "back", "3", "6-10", "Lat stretch, light rows"),
          lift("Lat Pulldown", "back", "3", "8-12", "Scap pull-downs"),
          lift("Face Pull", "shoulders", "3", "12-20", "Band pull-aparts"),
          lift("Curl", "arms", "3", "10-15", "Elbow circles"),
        ],
      },
      Wednesday: {
        name: "Legs A",
        lifts: [
          lift("Squat", "legs", "3", "5-8", "Hip flexor stretch, ramp-up sets"),
          lift("Romanian Deadlift", "legs", "3", "8-10", "Hamstring sweeps"),
          lift("Leg Press", "legs", "3", "10-15", "Bodyweight squats"),
          lift("Calf Raise", "legs", "3", "10-15", "Ankle rocks"),
        ],
      },
      Thursday: {
        name: "Push B",
        lifts: [
          lift("Incline Bench Press", "chest", "3", "6-10", "Band pull-aparts"),
          lift("Dumbbell Shoulder Press", "shoulders", "3", "8-12", "Shoulder circles"),
          lift("Chest Fly", "chest", "2", "12-15", "Light flys"),
          lift("Triceps Pushdown", "arms", "3", "10-15", "Elbow circles"),
        ],
      },
      Friday: {
        name: "Pull B",
        lifts: [
          lift("Deadlift", "back", "3", "3-5", "Hip hinge drill, hamstring sweeps"),
          lift("Seated Cable Row", "back", "3", "8-12", "Light rows"),
          lift("Rear Delt Fly", "shoulders", "3", "12-20", "Band pull-aparts"),
          lift("Hammer Curl", "arms", "3", "10-15", "Wrist circles"),
        ],
      },
      Saturday: {
        name: "Legs B",
        lifts: [
          lift("Front Squat", "legs", "3", "6-8", "Ankle rocks, goblet squats"),
          lift("Hip Thrust", "legs", "3", "8-12", "Glute bridges"),
          lift("Leg Curl", "legs", "3", "10-15", "Light hamstring curls"),
          lift("Hanging Knee Raise", "core", "3", "10-15", "Cat-cow"),
        ],
      },
    },
  },
  {
    id: "full-body-3",
    name: "3-Day Full Body",
    summary: "Simple beginner-friendly weekly structure.",
    days: {
      Monday: {
        name: "Full Body A",
        lifts: [
          lift("Squat", "legs", "3", "5-8", "Hip flexor stretch, bodyweight squats"),
          lift("Bench Press", "chest", "3", "6-10", "Band pull-aparts"),
          lift("Barbell Row", "back", "3", "8-12", "Lat stretch, light rows"),
        ],
      },
      Wednesday: {
        name: "Full Body B",
        lifts: [
          lift("Deadlift", "back", "3", "3-5", "Hip hinge drill, hamstring sweeps"),
          lift("Overhead Press", "shoulders", "3", "6-10", "Wall slides"),
          lift("Lat Pulldown", "back", "3", "8-12", "Scap pull-downs"),
        ],
      },
      Friday: {
        name: "Full Body C",
        lifts: [
          lift("Front Squat", "legs", "3", "6-8", "Ankle rocks, goblet squats"),
          lift("Incline Bench Press", "chest", "3", "8-12", "Band pull-aparts"),
          lift("Romanian Deadlift", "legs", "3", "8-10", "Hamstring sweeps"),
        ],
      },
    },
  },
];

export function buildPlanFromTemplate(templateId) {
  const template = PROGRAM_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return {};

  const plan = { __meta: {} };

  Object.entries(template.days).forEach(([day, config]) => {
    plan.__meta[day] = { name: config.name };
    plan[day] = config.lifts.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    }));
  });

  return plan;
}

function lift(exercise, muscleGroup, sets, reps, stretches = "") {
  return { exercise, muscleGroup, sets, reps, stretches };
}
