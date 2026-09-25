// Exercise library.
// type decides what a set records:
//   strength   → kg × reps
//   bodyweight → reps (+ optional added kg)
//   timed      → seconds
//   cardio     → minutes + km
//   rounds     → one set = one round of N minutes
// inc = suggested weight jump (kg) when the top of the rep range is hit.

const E = (id, name, type, group, extra = {}) => ({ id, name, type, group, ...extra });

export const EXERCISES = [
  // ── Chest ──
  E('flat_bench', 'Flat Bench Press', 'strength', 'Chest', { inc: 2.5 }),
  E('incline_db_press', 'Incline Dumbbell Press', 'strength', 'Chest', { inc: 2 }),
  E('db_bench', 'Dumbbell Bench Press', 'strength', 'Chest', { inc: 2 }),
  E('machine_chest_press', 'Machine Chest Press', 'strength', 'Chest', { inc: 2.5 }),
  E('cable_fly', 'Cable Fly', 'strength', 'Chest', { inc: 2.5 }),
  E('pec_deck', 'Pec Deck', 'strength', 'Chest', { inc: 2.5 }),
  E('push_up', 'Push-ups', 'bodyweight', 'Chest'),
  E('diamond_push_up', 'Diamond Push-ups', 'bodyweight', 'Chest'),
  E('dips', 'Dips', 'bodyweight', 'Chest'),

  // ── Back ──
  E('lat_pulldown', 'Lat Pulldown', 'strength', 'Back', { inc: 2.5 }),
  E('assisted_pullup', 'Lat Pulldown / Assisted Pull-up', 'strength', 'Back', { inc: 2.5 }),
  E('seated_cable_row', 'Seated Cable Row', 'strength', 'Back', { inc: 2.5 }),
  E('chest_supported_row', 'Chest Supported Row', 'strength', 'Back', { inc: 2.5 }),
  E('db_row', 'One-arm Dumbbell Row', 'strength', 'Back', { inc: 2 }),
  E('barbell_row', 'Barbell Row', 'strength', 'Back', { inc: 2.5 }),
  E('deadlift', 'Deadlift', 'strength', 'Back', { inc: 5 }),
  E('pull_up', 'Pull-ups', 'bodyweight', 'Back'),
  E('chin_up', 'Chin-ups', 'bodyweight', 'Back'),
  E('inverted_row', 'Inverted Row', 'bodyweight', 'Back'),

  // ── Shoulders ──
  E('shoulder_press', 'Shoulder Press (machine or DB)', 'strength', 'Shoulders', { inc: 2 }),
  E('ohp', 'Overhead Press (barbell)', 'strength', 'Shoulders', { inc: 2.5 }),
  E('lateral_raise', 'Lateral Raise', 'strength', 'Shoulders', { inc: 1 }),
  E('rear_delt_fly', 'Rear Delt Fly (machine or cable)', 'strength', 'Shoulders', { inc: 2.5 }),
  E('face_pull', 'Face Pull', 'strength', 'Shoulders', { inc: 2.5 }),
  E('pike_push_up', 'Pike Push-ups', 'bodyweight', 'Shoulders'),

  // ── Arms ──
  E('db_curl', 'Dumbbell Curl', 'strength', 'Arms', { inc: 1 }),
  E('hammer_curl', 'Hammer Curl', 'strength', 'Arms', { inc: 1 }),
  E('barbell_curl', 'Barbell / EZ Curl', 'strength', 'Arms', { inc: 2.5 }),
  E('triceps_pushdown', 'Triceps Pushdown', 'strength', 'Arms', { inc: 2.5 }),
  E('triceps_extension', 'Triceps Extension', 'strength', 'Arms', { inc: 2.5 }),
  E('skull_crusher', 'Skull Crusher', 'strength', 'Arms', { inc: 2.5 }),

  // ── Legs ──
  E('squat', 'Squat / Hack Squat', 'strength', 'Legs', { inc: 5 }),
  E('leg_press', 'Leg Press', 'strength', 'Legs', { inc: 5 }),
  E('rdl', 'Romanian Deadlift', 'strength', 'Legs', { inc: 5 }),
  E('leg_extension', 'Leg Extension', 'strength', 'Legs', { inc: 2.5 }),
  E('leg_curl', 'Leg Curl', 'strength', 'Legs', { inc: 2.5 }),
  E('walking_lunges', 'Walking Lunges', 'strength', 'Legs', { inc: 2 }),
  E('bulgarian_split_squat', 'Bulgarian Split Squat', 'strength', 'Legs', { inc: 2 }),
  E('hip_thrust', 'Hip Thrust', 'strength', 'Legs', { inc: 5 }),
  E('calf_raise', 'Calf Raise', 'strength', 'Legs', { inc: 5 }),
  E('goblet_squat', 'Goblet Squat', 'strength', 'Legs', { inc: 2 }),
  E('bw_squat', 'Bodyweight Squats', 'bodyweight', 'Legs'),
  E('jump_squat', 'Jump Squats', 'bodyweight', 'Legs'),
  E('pistol_squat', 'Pistol Squat', 'bodyweight', 'Legs'),
  E('glute_bridge', 'Glute Bridge', 'bodyweight', 'Legs'),
  E('wall_sit', 'Wall Sit', 'timed', 'Legs'),

  // ── Core ──
  E('cable_crunch', 'Cable Crunch', 'strength', 'Core', { inc: 2.5 }),
  E('hanging_knee_raise', 'Hanging Knee Raise', 'bodyweight', 'Core'),
  E('hanging_leg_raise', 'Hanging Leg Raise', 'bodyweight', 'Core'),
  E('leg_raise', 'Lying Leg Raise', 'bodyweight', 'Core'),
  E('bicycle_crunch', 'Bicycle Crunch', 'bodyweight', 'Core'),
  E('russian_twist', 'Russian Twist', 'bodyweight', 'Core'),
  E('plank', 'Plank', 'timed', 'Core'),
  E('side_plank', 'Side Plank', 'timed', 'Core'),
  E('hollow_hold', 'Hollow Body Hold', 'timed', 'Core'),
  E('l_sit', 'L-sit Hang', 'timed', 'Core'),
  E('mountain_climbers', 'Mountain Climbers', 'timed', 'Core'),

  // ── Boxing / conditioning ──
  E('punching_bag', 'Punching Bag', 'rounds', 'Boxing', { rest: 60 }),
  E('bag_hiit', 'Bag HIIT (30s on / 30s off)', 'rounds', 'Boxing', { rest: 30 }),
  E('shadow_boxing', 'Shadow Boxing', 'rounds', 'Boxing', { rest: 60 }),
  E('skipping', 'Skipping Rope', 'rounds', 'Boxing', { rest: 60 }),
  E('burpees', 'Burpees', 'bodyweight', 'Boxing'),
  E('footwork', 'Footwork Drills', 'rounds', 'Boxing', { rest: 30 }),

  // ── Cardio ──
  E('incline_walk', 'Incline Treadmill Walk', 'cardio', 'Cardio'),
  E('treadmill_run', 'Treadmill Run', 'cardio', 'Cardio'),
  E('treadmill_intervals', 'Treadmill Intervals', 'cardio', 'Cardio'),
  E('outdoor_walk', 'Walk (outdoor)', 'cardio', 'Cardio'),
  E('outdoor_run', 'Run (outdoor)', 'cardio', 'Cardio'),
  E('cycling', 'Cycling', 'cardio', 'Cardio'),
  E('elliptical', 'Elliptical / Cross-trainer', 'cardio', 'Cardio'),
  E('swimming', 'Swimming', 'cardio', 'Cardio'),

  // ── Mobility ──
  E('stretching', 'Full-body Stretch', 'cardio', 'Mobility'),
  E('yoga', 'Yoga / Mobility', 'cardio', 'Mobility'),
  E('foam_roll', 'Foam Rolling', 'cardio', 'Mobility'),
];

export const EX_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Boxing', 'Cardio', 'Mobility'];

export const TYPE_DEFAULT_REST = { strength: 90, bodyweight: 60, timed: 45, rounds: 60, cardio: 0 };
