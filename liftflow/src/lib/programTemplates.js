export const PROGRAM_TEMPLATES = [
  {
    id: "upper-lower-4",
    name: "Upper / Lower",
    summary: "Four days built around strength basics.",
    days: {
      Monday: day("Upper A", [
        lift("Bench Press", "chest", "3", "5-8", "Band pull-aparts, shoulder circles, 2 ramp-up sets"),
        lift("Barbell Row", "back", "3", "6-10", "Lat stretch, light rows"),
        lift("Overhead Press", "shoulders", "3", "6-8", "Wall slides, empty bar presses"),
        lift("Triceps Pushdown", "arms", "2", "10-15", "Elbow circles"),
      ]),
      Tuesday: day("Lower A", [
        lift("Squat", "legs", "3", "5-8", "Hip flexor stretch, bodyweight squats, ramp-up sets"),
        lift("Romanian Deadlift", "legs", "3", "8-10", "Hamstring sweeps"),
        lift("Leg Curl", "legs", "2", "10-15", "Light hamstring curls"),
        lift("Calf Raise", "legs", "3", "10-15", "Ankle rocks"),
      ]),
      Thursday: day("Upper B", [
        lift("Incline Bench Press", "chest", "3", "6-10", "Band pull-aparts, light incline sets"),
        lift("Pull-Up", "back", "3", "6-10", "Dead hang, scap pull-ups"),
        lift("Dumbbell Shoulder Press", "shoulders", "3", "8-12", "Shoulder circles"),
        lift("Curl", "arms", "2", "10-15", "Wrist and elbow circles"),
      ]),
      Friday: day("Lower B", [
        lift("Deadlift", "legs", "3", "3-5", "Hip hinge drill, hamstring sweeps, ramp-up sets"),
        lift("Front Squat", "legs", "3", "6-8", "Ankle rocks, goblet squats"),
        lift("Lunge", "legs", "2", "8-12", "Hip opener"),
        lift("Plank", "core", "3", "30-60", "Cat-cow, bracing breaths"),
      ]),
    },
  },

  {
    id: "ppl-6",
    name: "Push / Pull / Legs",
    summary: "Six-day volume split with simple repeats.",
    days: {
      Monday: day("Push A", [
        lift("Bench Press", "chest", "3", "6-10", "Band pull-aparts, shoulder circles"),
        lift("Overhead Press", "shoulders", "3", "6-10", "Wall slides, empty bar presses"),
        lift("Incline Dumbbell Press", "chest", "3", "8-12", "Light incline sets"),
        lift("Lateral Raise", "shoulders", "3", "12-20", "Shoulder circles"),
      ]),
      Tuesday: day("Pull A", [
        lift("Barbell Row", "back", "3", "6-10", "Lat stretch, light rows"),
        lift("Lat Pulldown", "back", "3", "8-12", "Scap pull-downs"),
        lift("Face Pull", "shoulders", "3", "12-20", "Band pull-aparts"),
        lift("Curl", "arms", "3", "10-15", "Elbow circles"),
      ]),
      Wednesday: day("Legs A", [
        lift("Squat", "legs", "3", "5-8", "Hip flexor stretch, ramp-up sets"),
        lift("Romanian Deadlift", "legs", "3", "8-10", "Hamstring sweeps"),
        lift("Leg Press", "legs", "3", "10-15", "Bodyweight squats"),
        lift("Calf Raise", "legs", "3", "10-15", "Ankle rocks"),
      ]),
      Thursday: day("Push B", [
        lift("Incline Bench Press", "chest", "3", "6-10", "Band pull-aparts"),
        lift("Dumbbell Shoulder Press", "shoulders", "3", "8-12", "Shoulder circles"),
        lift("Chest Fly", "chest", "2", "12-15", "Light flys"),
        lift("Triceps Pushdown", "arms", "3", "10-15", "Elbow circles"),
      ]),
      Friday: day("Pull B", [
        lift("Deadlift", "back", "3", "3-5", "Hip hinge drill, hamstring sweeps"),
        lift("Seated Cable Row", "back", "3", "8-12", "Light rows"),
        lift("Rear Delt Fly", "shoulders", "3", "12-20", "Band pull-aparts"),
        lift("Hammer Curl", "arms", "3", "10-15", "Wrist circles"),
      ]),
      Saturday: day("Legs B", [
        lift("Front Squat", "legs", "3", "6-8", "Ankle rocks, goblet squats"),
        lift("Hip Thrust", "legs", "3", "8-12", "Glute bridges"),
        lift("Leg Curl", "legs", "3", "10-15", "Light hamstring curls"),
        lift("Hanging Knee Raise", "core", "3", "10-15", "Cat-cow"),
      ]),
    },
  },

  {
    id: "full-body-3",
    name: "3-Day Full Body",
    summary: "Simple beginner-friendly weekly structure.",
    days: {
      Monday: day("Full Body A", [
        lift("Squat", "legs", "3", "5-8", "Hip flexor stretch, bodyweight squats"),
        lift("Bench Press", "chest", "3", "6-10", "Band pull-aparts"),
        lift("Barbell Row", "back", "3", "8-12", "Lat stretch, light rows"),
      ]),
      Wednesday: day("Full Body B", [
        lift("Deadlift", "back", "3", "3-5", "Hip hinge drill, hamstring sweeps"),
        lift("Overhead Press", "shoulders", "3", "6-10", "Wall slides"),
        lift("Lat Pulldown", "back", "3", "8-12", "Scap pull-downs"),
      ]),
      Friday: day("Full Body C", [
        lift("Front Squat", "legs", "3", "6-8", "Ankle rocks, goblet squats"),
        lift("Incline Bench Press", "chest", "3", "8-12", "Band pull-aparts"),
        lift("Romanian Deadlift", "legs", "3", "8-10", "Hamstring sweeps"),
      ]),
    },
  },

  {
    id: "upper-lower-ppl",
    name: "UL / Rest / PPL",
    summary: "Upper, lower, rest, then push/pull/legs.",
    days: {
      Monday: day("Upper", [
        lift("Bench Press", "chest", "3", "5-8"),
        lift("Barbell Row", "back", "3", "6-10"),
        lift("Overhead Press", "shoulders", "3", "6-10"),
      ]),
      Tuesday: day("Lower", [
        lift("Squat", "legs", "3", "5-8"),
        lift("Romanian Deadlift", "legs", "3", "8-10"),
        lift("Calf Raise", "legs", "3", "10-15"),
      ]),
      Wednesday: recovery("Rest", "Full Rest Day", "All day", "Easy", "Sleep, eat, and recover."),
      Thursday: day("Push", [
        lift("Incline Bench Press", "chest", "3", "6-10"),
        lift("Dumbbell Shoulder Press", "shoulders", "3", "8-12"),
        lift("Triceps Pushdown", "arms", "3", "10-15"),
      ]),
      Friday: day("Pull", [
        lift("Deadlift", "back", "3", "3-5"),
        lift("Lat Pulldown", "back", "3", "8-12"),
        lift("Hammer Curl", "arms", "3", "10-15"),
      ]),
      Saturday: day("Legs", [
        lift("Front Squat", "legs", "3", "6-8"),
        lift("Leg Press", "legs", "3", "10-15"),
        lift("Leg Curl", "legs", "3", "10-15"),
      ]),
      Sunday: recovery("Rest", "Full Rest Day", "All day", "Easy", "Keep it low stress."),
    },
  },

  {
    id: "bro-split",
    name: "Bro Split",
    summary: "Classic body-part focused training week.",
    days: {
      Monday: day("Chest", [
        lift("Bench Press", "chest", "4", "6-10"),
        lift("Incline Dumbbell Press", "chest", "3", "8-12"),
        lift("Chest Fly", "chest", "3", "12-15"),
      ]),
      Tuesday: day("Back", [
        lift("Deadlift", "back", "3", "3-5"),
        lift("Barbell Row", "back", "4", "6-10"),
        lift("Lat Pulldown", "back", "3", "8-12"),
      ]),
      Wednesday: day("Shoulders", [
        lift("Overhead Press", "shoulders", "4", "5-8"),
        lift("Lateral Raise", "shoulders", "4", "12-20"),
        lift("Rear Delt Fly", "shoulders", "3", "12-20"),
      ]),
      Thursday: day("Arms", [
        lift("Curl", "arms", "4", "8-12"),
        lift("Triceps Pushdown", "arms", "4", "10-15"),
        lift("Hammer Curl", "arms", "3", "10-15"),
      ]),
      Friday: day("Legs", [
        lift("Squat", "legs", "4", "5-8"),
        lift("Romanian Deadlift", "legs", "3", "8-10"),
        lift("Leg Press", "legs", "3", "10-15"),
      ]),
    },
  },

  {
    id: "strength-focused",
    name: "Strength Focus",
    summary: "Bench, squat, and deadlift focused split.",
    days: {
      Monday: day("Bench Strength", [
        lift("Bench Press", "chest", "5", "3-5"),
        lift("Close-Grip Bench", "chest", "3", "5-8"),
        lift("Barbell Row", "back", "4", "6-8"),
      ]),
      Wednesday: day("Squat Strength", [
        lift("Squat", "legs", "5", "3-5"),
        lift("Front Squat", "legs", "3", "5-8"),
        lift("Leg Curl", "legs", "3", "8-12"),
      ]),
      Friday: day("Deadlift Strength", [
        lift("Deadlift", "back", "5", "2-5"),
        lift("Romanian Deadlift", "legs", "3", "6-10"),
        lift("Pull-Up", "back", "3", "6-10"),
      ]),
    },
  },

  {
    id: "powerbuilding",
    name: "Powerbuilding",
    summary: "Heavy compounds plus hypertrophy volume.",
    days: {
      Monday: day("Upper Power", [
        lift("Bench Press", "chest", "4", "3-5"),
        lift("Barbell Row", "back", "4", "5-8"),
        lift("Overhead Press", "shoulders", "3", "5-8"),
      ]),
      Tuesday: day("Lower Power", [
        lift("Squat", "legs", "4", "3-5"),
        lift("Deadlift", "back", "3", "3-5"),
        lift("Calf Raise", "legs", "3", "10-15"),
      ]),
      Thursday: day("Upper Build", [
        lift("Incline Bench Press", "chest", "3", "8-12"),
        lift("Lat Pulldown", "back", "3", "10-12"),
        lift("Lateral Raise", "shoulders", "4", "12-20"),
      ]),
      Friday: day("Lower Build", [
        lift("Front Squat", "legs", "3", "6-10"),
        lift("Romanian Deadlift", "legs", "3", "8-12"),
        lift("Leg Curl", "legs", "3", "10-15"),
      ]),
    },
  },

  {
    id: "peyto-split",
    name: "Peyto Split",
    summary: "ULPPL powerbuilding split for bench strength, hypertrophy, arms, shoulders, core, neck, and recovery.",
    days: {
      Monday: day("Upper (Bench Strength)", [
        lift("Barbell Bench Press", "chest", "4", "3-5", "Band pull-aparts, external rotations, shoulder circles, 2-4 ramp-up sets"),
        lift("Chest-Supported Row", "back", "3", "8-10", "Light rows, scap squeezes"),
        lift("Standing Overhead Press", "shoulders", "3", "6-8", "Wall slides, empty bar presses"),
        lift("Lat Pulldown", "back", "3", "8-10", "Dead hang, scap pull-downs"),
        lift("Cable Lateral Raise", "shoulders", "2", "15-20", "Shoulder circles"),
        lift("Bayesian Curl", "arms", "3", "10-12", "Wrist and elbow circles"),
        lift("Overhead Triceps Extension", "arms", "3", "10-12", "Elbow circles, light extensions"),
        lift("EZ-Bar Curl", "arms", "2-3", "8-10", "Wrist and elbow circles"),
        lift("Face Pull", "shoulders", "2", "15-20", "Band pull-aparts"),
      ]),

      Tuesday: day("Lower (Squat Strength)", [
        lift("Back Squat", "legs", "4", "3-5", "Leg swings, deep squat hold, glute bridges, ramp-up sets"),
        lift("Leg Press", "legs", "3", "8-10", "Bodyweight squats"),
        lift("Leg Curl + Leg Extension Superset", "legs", "3", "8-10", "Light curls and extensions"),
        lift("Standing Calf Raise", "legs", "4", "12-15", "Ankle rocks"),
        lift("Hanging Leg Raise", "core", "3", "10-15", "Cat-cow, bracing breaths"),
        lift("Cable Crunch", "core", "3", "12-15", "Bracing breaths"),
        lift("Neck Flexion", "neck", "2", "15", "Very light warm-up reps"),
        lift("Neck Extension", "neck", "2", "15", "Very light warm-up reps"),
      ]),

      Wednesday: recovery(
        "Recovery",
        "Walk + Daily Flexibility",
        "20-30 min walk, 15-20 min flexibility",
        "Easy",
        "Keep it light. Focus on hips, hamstrings, shoulders, calves, and breathing."
      ),

      Thursday: day("Push (Bench Volume + Hypertrophy)", [
        lift("Barbell Bench Press", "chest", "4", "8-10", "Band pull-aparts, push-ups, 2-3 ramp-up sets"),
        lift("Mark Press", "chest", "2", "near failure", "Use controlled reps after bench"),
        lift("Seated Shoulder Press", "shoulders", "3", "8-10", "Wall slides, light presses"),
        lift("Incline Dumbbell Press", "chest", "3", "8-12", "Light incline presses"),
        lift("Skull Crusher", "arms", "3", "8-12", "Elbow circles, light extensions"),
        lift("Cable Lateral Raise", "shoulders", "3", "12-20", "Shoulder circles"),
        lift("Low-to-High Cable Fly", "chest", "2", "12-15", "Light flys, pec stretch"),
        lift("Plank", "core", "3", "60+ sec", "Bracing breaths"),
      ]),

      Friday: day("Pull (Deadlift Strength)", [
        lift("Conventional Deadlift", "back", "4", "3-5", "Hip hinge drill, bird dogs, hamstring sweeps, ramp-up sets"),
        lift("Chest-Supported Row", "back", "3", "8-10", "Light rows, scap squeezes"),
        lift("Lat Pulldown", "back", "3", "8-10", "Dead hang, scap pull-downs"),
        lift("Reverse Pec Deck", "shoulders", "3", "12-15", "Band pull-aparts"),
        lift("Barbell Shrug", "back", "3", "10-12", "Light shrugs"),
        lift("Single-Arm Preacher Hammer Curl", "arms", "3", "10-12", "Wrist and elbow circles"),
        lift("Griffin Curl", "arms", "2", "burnout", "Light curl warm-up"),
        lift("Forearm Curl / Reverse Forearm Curl", "arms", "2", "to failure", "Alternate weekly between wrist curls and reverse wrist curls"),
        lift("Ab Wheel Rollout", "core", "3", "8-12", "Cat-cow, bracing breaths"),
        lift("Dead Hang", "back", "2", "45-60 sec", "Grip and shoulder decompression"),
      ]),

      Saturday: day("Legs (Hypertrophy)", [
        lift("Front Squat", "legs", "3", "8-10", "Leg swings, deep squat hold, front squat ramp-up sets"),
        lift("Bulgarian Split Squat", "legs", "3", "8-10/leg", "Hip opener, bodyweight split squats"),
        lift("Leg Press", "legs", "3", "12", "Bodyweight squats"),
        lift("Leg Curl + Leg Extension Superset", "legs", "3", "12-15", "Light curls and extensions"),
        lift("Seated Calf Raise", "legs", "4", "12-15", "Ankle rocks"),
        lift("Dead Bug", "core", "3", "10/side", "Bracing breaths"),
        lift("Plank", "core", "3", "60+ sec", "Bracing breaths"),
        lift("Neck Lateral Flexion", "neck", "2", "15/side", "Very light warm-up reps"),
      ]),

      Sunday: recovery(
        "Rest",
        "Full Rest Day",
        "All day",
        "Easy",
        "No lifting. Eat, sleep, walk if desired, and recover."
      ),
    },
  },
];

export const DAY_TEMPLATES = [
  {
    id: "chest-triceps",
    name: "Chest + Triceps",
    config: day("Chest + Triceps", [
      lift("Bench Press", "chest", "3", "6-10"),
      lift("Incline Dumbbell Press", "chest", "3", "8-12"),
      lift("Triceps Pushdown", "arms", "3", "10-15"),
    ]),
  },
  {
    id: "back-biceps",
    name: "Back + Biceps",
    config: day("Back + Biceps", [
      lift("Barbell Row", "back", "3", "6-10"),
      lift("Lat Pulldown", "back", "3", "8-12"),
      lift("Curl", "arms", "3", "10-15"),
    ]),
  },
  {
    id: "shoulders-arms",
    name: "Shoulders + Arms",
    config: day("Shoulders + Arms", [
      lift("Overhead Press", "shoulders", "3", "6-10"),
      lift("Lateral Raise", "shoulders", "3", "12-20"),
      lift("Hammer Curl", "arms", "3", "10-15"),
    ]),
  },
  {
    id: "push",
    name: "Push",
    config: day("Push", [
      lift("Bench Press", "chest", "3", "6-10"),
      lift("Overhead Press", "shoulders", "3", "6-10"),
      lift("Triceps Pushdown", "arms", "3", "10-15"),
    ]),
  },
  {
    id: "pull",
    name: "Pull",
    config: day("Pull", [
      lift("Deadlift", "back", "3", "3-5"),
      lift("Barbell Row", "back", "3", "6-10"),
      lift("Curl", "arms", "3", "10-15"),
    ]),
  },
  {
    id: "legs",
    name: "Legs",
    config: day("Legs", [
      lift("Squat", "legs", "3", "5-8"),
      lift("Romanian Deadlift", "legs", "3", "8-10"),
      lift("Leg Press", "legs", "3", "10-15"),
    ]),
  },
  {
    id: "upper",
    name: "Upper Body",
    config: day("Upper Body", [
      lift("Bench Press", "chest", "3", "6-10"),
      lift("Barbell Row", "back", "3", "8-12"),
      lift("Overhead Press", "shoulders", "3", "6-10"),
    ]),
  },
  {
    id: "lower",
    name: "Lower Body",
    config: day("Lower Body", [
      lift("Squat", "legs", "3", "5-8"),
      lift("Romanian Deadlift", "legs", "3", "8-10"),
      lift("Calf Raise", "legs", "3", "10-15"),
    ]),
  },
  {
    id: "full-body",
    name: "Full Body",
    config: day("Full Body", [
      lift("Squat", "legs", "3", "5-8"),
      lift("Bench Press", "chest", "3", "6-10"),
      lift("Barbell Row", "back", "3", "8-12"),
    ]),
  },
  {
    id: "bench-strength",
    name: "Strength Bench Day",
    config: day("Bench Strength", [
      lift("Bench Press", "chest", "5", "3-5"),
      lift("Close-Grip Bench", "chest", "3", "5-8"),
      lift("Barbell Row", "back", "4", "6-8"),
    ]),
  },
  {
    id: "squat-strength",
    name: "Strength Squat Day",
    config: day("Squat Strength", [
      lift("Squat", "legs", "5", "3-5"),
      lift("Front Squat", "legs", "3", "5-8"),
      lift("Leg Curl", "legs", "3", "8-12"),
    ]),
  },
  {
    id: "deadlift-strength",
    name: "Strength Deadlift Day",
    config: day("Deadlift Strength", [
      lift("Deadlift", "back", "5", "2-5"),
      lift("Romanian Deadlift", "legs", "3", "6-10"),
      lift("Pull-Up", "back", "3", "6-10"),
    ]),
  },
  {
    id: "arm-day",
    name: "Arm Day",
    config: day("Arm Day", [
      lift("Curl", "arms", "4", "8-12"),
      lift("Hammer Curl", "arms", "3", "10-15"),
      lift("Triceps Pushdown", "arms", "4", "10-15"),
    ]),
  },
];

export const RECOVERY_TEMPLATES = [
  {
    id: "full-rest",
    name: "Full Rest Day",
    config: recovery("Rest", "Full Rest Day", "All day", "Easy", "No training. Prioritize sleep, hydration, and food."),
  },
  {
    id: "active-recovery",
    name: "Active Recovery",
    config: recovery("Active Recovery", "Light movement", "20-40 min", "Easy", "Move enough to feel better, not tired."),
  },
  {
    id: "zone-2",
    name: "Zone 2 Cardio",
    config: recovery("Zone 2", "Bike, incline walk, or easy cardio", "30-45 min", "Conversational", "Keep breathing controlled."),
  },
  {
    id: "running",
    name: "Running",
    config: recovery("Run", "Easy run", "20-35 min", "Easy-moderate", "Stay relaxed and smooth."),
  },
  {
    id: "walking",
    name: "Walking",
    config: recovery("Walk", "Outdoor or treadmill walk", "30-60 min", "Easy", "Keep it low impact."),
  },
  {
    id: "mobility",
    name: "Mobility",
    config: recovery("Mobility", "Full-body mobility", "15-25 min", "Easy", "Work through tight areas slowly."),
  },
  {
    id: "full-stretch",
    name: "Full-Body Stretching",
    config: recovery("Stretch", "Full-body stretching", "15-25 min", "Easy", "Long exhales and relaxed positions."),
  },
  {
    id: "upper-mobility",
    name: "Upper-Body Mobility",
    config: recovery("Upper Mobility", "Shoulders, pecs, lats, T-spine", "12-20 min", "Easy", "Keep shoulders pain-free."),
  },
  {
    id: "lower-mobility",
    name: "Lower-Body Mobility",
    config: recovery("Lower Mobility", "Hips, hamstrings, calves, ankles", "12-20 min", "Easy", "Move gently through range."),
  },
];

export const DEFAULT_EXERCISES = [
  lift("Bench Press", "chest", "3", "5-8"),
  lift("Incline Bench Press", "chest", "3", "8-12"),
  lift("Barbell Row", "back", "3", "6-10"),
  lift("Lat Pulldown", "back", "3", "8-12"),
  lift("Squat", "legs", "3", "5-8"),
  lift("Deadlift", "back", "3", "3-5"),
  lift("Romanian Deadlift", "legs", "3", "8-10"),
  lift("Overhead Press", "shoulders", "3", "6-10"),
  lift("Lateral Raise", "shoulders", "3", "12-20"),
  lift("Curl", "arms", "3", "10-15"),
  lift("Triceps Pushdown", "arms", "3", "10-15"),
  lift("Plank", "core", "3", "30-60"),
];

export function buildPlanFromTemplate(templateId) {
  const template = PROGRAM_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return {};

  const plan = { __meta: {} };

  Object.entries(template.days).forEach(([dayName, config]) => {
    plan.__meta[dayName] = {
      name: config.name,
      type: config.type || "training",
      recovery: config.recovery || null,
    };

    plan[dayName] = (config.lifts || []).map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    }));
  });

  return plan;
}

export function buildDayFromTemplate(templateId, recoveryTemplate = false) {
  const source = recoveryTemplate ? RECOVERY_TEMPLATES : DAY_TEMPLATES;
  const template = source.find((item) => item.id === templateId);
  if (!template) return null;

  return {
    meta: {
      name: template.config.name,
      type: template.config.type || "training",
      recovery: template.config.recovery || null,
    },
    lifts: (template.config.lifts || []).map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    })),
  };
}

function day(name, lifts) {
  return {
    name,
    type: "training",
    lifts,
  };
}

function recovery(name, activity, duration, intensity, notes) {
  return {
    name,
    type: "recovery",
    recovery: {
      activity,
      duration,
      intensity,
      notes,
    },
    lifts: [],
  };
}

function lift(exercise, muscleGroup, sets, reps, stretches = "") {
  return {
    exercise,
    muscleGroup,
    sets,
    reps,
    stretches,
  };
}
