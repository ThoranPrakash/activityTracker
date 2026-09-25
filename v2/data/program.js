// Default weekly plan: 4-day Upper/Lower split (Mon = index 0).
// Each item: { ex: exerciseId, sets, lo, hi } — lo/hi is the rep range
// (seconds for timed exercises, minutes for cardio/rounds).

const I = (ex, sets, lo, hi = lo) => ({ ex, sets, lo, hi });
const CARDIO = I('incline_walk', 1, 20, 30);

export const DEFAULT_PROGRAM = [
  {
    name: 'Upper Body A', focus: 'Chest · Back · Shoulders · Arms',
    items: [
      I('incline_db_press', 3, 6, 10), I('lat_pulldown', 3, 8, 12), I('seated_cable_row', 3, 8, 12),
      I('shoulder_press', 2, 8, 12), I('lateral_raise', 3, 12, 20), I('triceps_pushdown', 2, 10, 15),
      I('db_curl', 2, 10, 15), CARDIO,
    ],
  },
  {
    name: 'Lower Body A', focus: 'Quads · Hamstrings · Glutes · Core',
    items: [
      I('leg_press', 3, 8, 12), I('rdl', 3, 8, 12), I('leg_extension', 2, 10, 15), I('leg_curl', 2, 10, 15),
      I('calf_raise', 3, 10, 15), I('cable_crunch', 3, 10, 15), I('plank', 2, 30, 60), CARDIO,
    ],
  },
  { name: 'Rest / Active Recovery', focus: 'Easy movement and mobility', rest: true, items: [] },
  {
    name: 'Upper Body B', focus: 'Chest · Back · Shoulders · Arms',
    items: [
      I('flat_bench', 3, 6, 10), I('assisted_pullup', 3, 8, 12), I('chest_supported_row', 3, 8, 12),
      I('incline_db_press', 2, 8, 12), I('lateral_raise', 3, 12, 20), I('rear_delt_fly', 2, 12, 20),
      I('triceps_extension', 2, 10, 15), I('db_curl', 2, 10, 15), CARDIO,
    ],
  },
  {
    name: 'Lower Body B', focus: 'Quads · Hamstrings · Glutes · Core',
    items: [
      I('squat', 3, 6, 10), I('rdl', 2, 8, 12), I('walking_lunges', 2, 8, 12), I('leg_curl', 2, 10, 15),
      I('calf_raise', 3, 10, 15), I('hanging_knee_raise', 3, 8, 15), I('cable_crunch', 2, 10, 15), CARDIO,
    ],
  },
  { name: 'Rest', focus: 'Optional easy walking', rest: true, items: [] },
  {
    name: 'Light Walk + Mobility', focus: '20–40 min', rest: true, light: true,
    items: [I('outdoor_walk', 1, 20, 40), I('stretching', 1, 10, 15)],
  },
];

// Exercise names used by the previous version of the app (for data migration).
export const OLD_PROGRAM_NAMES = [
  ['incline_db_press', 'lat_pulldown', 'seated_cable_row', 'shoulder_press', 'lateral_raise', 'triceps_pushdown', 'db_curl'],
  ['leg_press', 'rdl', 'leg_extension', 'leg_curl', 'calf_raise', 'cable_crunch', 'plank'],
  [],
  ['flat_bench', 'assisted_pullup', 'chest_supported_row', 'incline_db_press', 'lateral_raise', 'rear_delt_fly', 'triceps_extension', 'db_curl'],
  ['squat', 'rdl', 'walking_lunges', 'leg_curl', 'calf_raise', 'hanging_knee_raise', 'cable_crunch'],
  [],
  [],
];
