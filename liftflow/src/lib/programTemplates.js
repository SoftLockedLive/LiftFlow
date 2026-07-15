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
    summary: "Weekly powerbuilding routine with bench, squat, deadlift, hypertrophy, recovery, and mobility.",
    days: {
      Monday: day("Upper (Bench Strength)", [
        lift("Bench Press", "chest", "4", "3-5", "Main strength focus. Keep reps controlled and leave room for progression."),
        lift("Chest-Supported Row", "back", "3", "8-10", "Strict torso position. Pull elbows back, not up."),
        lift("Standing Overhead Press", "shoulders", "3", "6-8", "Brace hard. Avoid turning it into a push press."),
        lift("Lat Pulldown", "back", "3", "8-10", "Drive elbows down and keep shoulders controlled."),
        lift("Cable Lateral Raise", "shoulders", "2", "15-20", "Slow reps. Keep tension on side delts."),
        lift("Bayesian Curl", "arms", "3", "10-12", "Let the biceps stretch behind the body."),
        lift("Overhead Triceps Extension", "arms", "3", "10-12", "Full stretch, controlled lockout."),
        lift("EZ-Bar Curl", "arms", "2-3", "8-10", "Use clean reps. Do not swing."),
      ], [
        warmup("Row", "time", "3 min"),
        warmup("Band pull-aparts", "reps", { sets: "1", reps: "20" }),
        warmup("Band external rotations", "reps", { sets: "1", reps: "15" }),
        warmup("Shoulder circles", "reps", { sets: "1", reps: "15" }),
        warmup("Bench warm-up sets", "reps", { sets: "2-4", reps: "3-5" }),
      ]),

      Tuesday: day("Lower (Squat Strength)", [
        lift("Back Squat", "legs", "4", "3-5", "Main lower strength focus. Stay tight out of the hole."),
        lift("Leg Press", "legs", "3", "8-10", "Controlled depth. Do not bounce the sled."),
        lift("Leg Curl", "legs", "3", "12-15", "Hamstring control. Pause the squeeze."),
        lift("Leg Extension", "legs", "3", "8-10", "Hard quad squeeze at the top."),
        lift("Standing Calf Raise", "legs", "4", "12-15", "Full stretch and full raise."),
        lift("Forearm Curls / Reverse Forearm Curls", "arms", "2", "alternate weekly", "Alternate weekly between wrist curls and reverse wrist curls."),
      ], [
        warmup("Incline walk", "time", "3 min"),
        warmup("Leg swings", "reps", { sets: "1", reps: "10/side" }),
        warmup("90/90 hip rotations", "reps", { sets: "1", reps: "8/side" }),
        warmup("World's Greatest Stretch", "reps", { sets: "1", reps: "5/side" }),
        warmup("Deep squat hold", "time", "30-45 sec"),
        warmup("Glute bridges", "reps", { sets: "1", reps: "15" }),
        warmup("Squat warm-up sets", "reps", { sets: "2-4", reps: "3-5" }),
      ]),

      Wednesday: day("Recovery Core + Neck", [
        lift("Hanging Leg Raises", "core", "3", "10-15", "Controlled reps. Avoid swinging."),
        lift("Cable Crunches", "core", "3", "12-15", "Round through the abs, not the hips."),
        lift("Neck Flexion", "neck", "2", "15", "Very light and controlled."),
        lift("Neck Extension", "neck", "2", "15", "Very light and controlled."),
        lift("Neck Lateral Flexion", "neck", "2", "15/side", "Smooth range of motion only."),
      ], [
        warmup("Walk", "time", "20-30 min"),
        warmup("Daily flexibility routine", "time", "15-20 min"),
      ], recoveryOptions("Recovery emphasis. Keep the session easy and leave fresher than you started.")),

      Thursday: day("Push (Bench Volume + Hypertrophy)", [
        lift("Bench Press", "chest", "4", "8-10", "Volume bench. Keep bar path consistent."),
        lift("Mark Presses", "chest", "2", "near failure", "Load light weight on the bar and crank out quick half reps till failure (Mark an ex Marine showed me this one)"),
        lift("Seated Shoulder Press", "shoulders", "3", "8-10", "Keep back tight and reps smooth."),
        lift("Incline Dumbbell Press", "chest", "3", "8-12", "Moderate incline. Drive through chest."),
        lift("Skull Crushers", "arms", "3", "8-12", "Keep elbows stable."),
        lift("Lateral Raises", "shoulders", "3", "12-20", "Use constant tension and controlled reps.", {
          variations: ["Cable Lateral Raise", "Dumbbell Lateral Raise", "Machine Lateral Raise"],
        }),
        lift("Low-to-High Cable Flyes", "chest", "2", "12-15", "Squeeze upper chest. Avoid shoulder takeover."),
      ], [
        warmup("Row", "time", "3 min"),
        warmup("Band pull-aparts", "reps", { sets: "1", reps: "20" }),
        warmup("Band external rotations", "reps", { sets: "1", reps: "15" }),
        warmup("Push-ups", "reps", { sets: "1-2", reps: "8-15" }),
        warmup("Bench warm-up sets", "reps", { sets: "2-3", reps: "5" }),
      ]),

      Friday: day("Pull (Deadlift Strength)", [
        lift("Deadlift", "back", "4", "3-5", "Main pull strength focus. Reset every rep if needed."),
        lift("Chest-Supported Row", "back", "3", "8-10", "Strict rows. No body English."),
        lift("Lat Pulldown", "back", "3", "8-10", "Pull elbows down and keep ribs controlled."),
        lift("Reverse Pec Deck", "shoulders", "3", "12-15", "Rear delt focus. Keep traps quiet."),
        lift("Face Pulls", "shoulders", "2", "15-20", "Pull toward face with external rotation."),
        lift("Single-Arm Preacher Hammer Curl", "arms", "3", "10-12", "Keep upper arm pinned."),
        lift("Barbell Shrugs", "back", "3", "10-12", "Pause at the top."),
        lift("Griffin Curls", "arms", "2", "burnout", "Seated dumbbell curls till failure then stand up and hammer curl till failure (My friend Griffin showed me this)"),
      ], [
        warmup("Row", "time", "3 min"),
        warmup("Hip hinge drill", "reps", { sets: "1", reps: "10" }),
        warmup("Bird dogs", "reps", { sets: "1", reps: "8/side" }),
        warmup("Hamstring sweeps", "reps", { sets: "1", reps: "10/side" }),
        warmup("Deadlift warm-up sets", "reps", { sets: "2-4", reps: "3-5" }),
      ]),

      Saturday: day("Legs (Hypertrophy)", [
        lift("Front Squat", "legs", "3", "8-10", "Hypertrophy squat. Stay upright and controlled."),
        lift("Bulgarian Split Squat", "legs", "3", "8-10/leg", "Control balance and depth."),
        lift("Leg Press", "legs", "3", "12", "Higher rep quad work. Keep tension."),
        lift("Leg Curl", "legs", "3", "12-15", "Hamstring squeeze."),
        lift("Leg Extension", "legs", "3", "12-15", "Quad squeeze. Do not rush reps."),
        lift("Seated Calf Raise", "legs", "4", "12-15", "Pause stretched and contracted positions."),
      ], [
        warmup("Bike", "time", "3 min"),
        warmup("World's Greatest Stretch", "reps", { sets: "1", reps: "5/side" }),
        warmup("90/90 hip rotations", "reps", { sets: "1", reps: "8/side" }),
        warmup("Leg swings", "reps", { sets: "1", reps: "10/side" }),
        warmup("Cossack squats", "reps", { sets: "1", reps: "6/side" }),
        warmup("Front squat warm-up sets", "reps", { sets: "2-3", reps: "5" }),
      ]),

      Sunday: day("Recovery Mobility + Core", [
        lift("Dead Bugs", "core", "3", "10/side", "Home-friendly core work. Keep low back pressed down."),
        lift("Planks", "core", "2-3", "60 sec", "Brace hard and breathe."),
        lift("Bird Dogs", "core", "2", "10/side", "Move slowly. Hips stay square."),
      ], [
        warmup("Yoga or mobility", "time", "20-30 min"),
      ], recoveryOptions("Recovery emphasis. Keep intensity low and focus on movement quality.")),
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
      warmup: (config.warmup || []).map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      })),
      emphasis: config.emphasis || "",
      actionCards: config.actionCards || [],
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
      warmup: (template.config.warmup || []).map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      })),
      emphasis: template.config.emphasis || "",
      actionCards: template.config.actionCards || [],
    },
    lifts: (template.config.lifts || []).map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    })),
  };
}

function day(name, lifts, warmup = defaultWarmupFor(name), options = {}) {
  return {
    name,
    type: "training",
    warmup,
    ...options,
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

function warmup(name, mode, value, note = "") {
  if (mode === "time") return { name, mode, time: value, note };
  return { name, mode: "reps", sets: value?.sets || "", reps: value?.reps || "", note };
}

function recoveryOptions(emphasis) {
  return {
    emphasis,
    actionCards: [
      { label: "Running", href: "/running", description: "Log the easy walk or recovery cardio." },
      { label: "Yoga", href: "/mobility", description: "Open mobility for yoga or flexibility work." },
    ],
  };
}

function defaultWarmupFor(dayName) {
  const name = String(dayName || "").toLowerCase();
  if (name.includes("lower") || name.includes("legs") || name.includes("squat")) {
    return [
      warmup("Easy bike or incline walk", "time", "3-5 min"),
      warmup("Leg swings", "reps", { sets: "1", reps: "10/side" }),
      warmup("Deep squat hold", "time", "30-45 sec"),
      warmup("Ramp-up sets", "reps", { sets: "2-4", reps: "3-5" }),
    ];
  }
  if (name.includes("pull") || name.includes("deadlift") || name.includes("back")) {
    return [
      warmup("Easy row", "time", "3 min"),
      warmup("Hip hinge drill", "reps", { sets: "1", reps: "10" }),
      warmup("Band pull-aparts", "reps", { sets: "1", reps: "20" }),
      warmup("Ramp-up sets", "reps", { sets: "2-4", reps: "3-5" }),
    ];
  }
  return [
    warmup("Easy row", "time", "3 min"),
    warmup("Band pull-aparts", "reps", { sets: "1", reps: "20" }),
    warmup("Band external rotations", "reps", { sets: "1", reps: "15" }),
    warmup("Ramp-up sets", "reps", { sets: "2-4", reps: "3-5" }),
  ];
}

function lift(exercise, muscleGroup, sets, reps, note = "", options = {}) {
  return {
    exercise,
    muscleGroup,
    sets,
    reps,
    note,
    stretches: note,
    baseExercise: options.baseExercise || exercise,
    defaultVariation: options.defaultVariation || "",
    variations: options.variations || [],
  };
}
