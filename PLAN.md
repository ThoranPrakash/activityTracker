# FitTracker v2 — Rebuild Plan

Personal body-recomposition tracker (lose fat + gain muscle). Installable web app on GitHub Pages, all data stored on the phone.

## Decisions so far

| Topic | Decision |
|---|---|
| Goal | Recomposition, tracked properly (weight trend + waist + strength) |
| Training | 4-day Upper/Lower split is the main plan; library of extra exercises (boxing, skipping, treadmill, bodyweight) that can be added to any session |
| Watch | Amazfit — values entered manually in a morning check-in |
| Food | Log everything per meal (Breakfast / Lunch / Evening snack / Dinner) from a built-in food database with calories + protein; non-vegetarian |
| Targets | App calculates calories + macros from height, weight, age, sex, activity |
| Habits | Yes, small recomp-focused set, auto-ticked from logged data where possible |
| To-dos | Removed |
| Storage | Phone only (localStorage) + manual JSON backup |
| Look | Dark, Apple-Fitness style |
| Priority | 1. Workout → 2. Food → 3. Habits → then Progress / Weekly review |

## App structure (4 tabs + settings)

### 1. Today
- Three rings: **Workout** (session done), **Nutrition** (calories within ±10% of target and protein hit), **Steps**.
- Habit chips row (tap to tick).
- Morning check-in card: weight, sleep hours, sleep score, resting HR, steps, energy (1–5), soreness (1–5). All optional.
- Readiness score (0–100) from sleep, sleep score, resting HR against your usual, energy, soreness and the last 3 days' training load.
- Today's workout card and meals-so-far card.

### 2. Workout (Strong / Hevy style)
- 4-day split kept as the default plan (Mon Upper A, Tue Lower A, Thu Upper B, Fri Lower B; Wed/Sat rest, Sun walk).
- Session screen: each exercise has sets with **kg × reps + tick**, previous session's numbers shown inline, add/remove sets.
- Rest timer auto-starts on set tick (default 90 s, adjustable per exercise), with vibration.
- **Exercise library** with types:
  - Strength (kg × reps): gym lifts from the split.
  - Bodyweight (reps, optional added kg): pull-ups, push-ups, dips, pistol squats…
  - Timed (seconds): plank, L-sit, hollow hold…
  - Cardio (min, km, avg HR): treadmill, run, walk, skipping.
  - Rounds (rounds × min): punching bag, shadow boxing, bag HIIT.
- "+ Add exercise" pulls anything from the library into today's session; custom exercises can be created.
- Automatic personal records: heaviest weight, best estimated 1-rep max (Epley formula), most reps, longest duration, fastest pace.
- Progressive-overload hint: all sets hit the top of the rep range last time → suggest +2.5 kg (upper) / +5 kg (lower).
- Session summary: duration, total volume, PRs.

### 3. Food
- Four meal sections; each shows items, kcal, protein.
- Food database: **per-100 g values** (kcal, protein, carbs, fat) plus a **default serving** (e.g. 1 chapati = 40 g, 1 egg = 50 g, 1 idli = 40 g, 1 cup rice = 150 g). Log by pieces or grams.
- Pre-filled with ~120 common Indian + non-veg items. Categories: breakfast (idli, dosa, upma, poha, pongal, paratha, bread, oats), grains (rice, chapati, biryani), dals/curries, eggs, chicken (breast, curry, tandoori, fried), fish, mutton, prawns, dairy (milk, curd, paneer, whey), fruits, snacks (samosa, vada, bajji, biscuits, nuts), drinks (tea, coffee, juice, soft drinks), sweets.
- Custom foods can be added and edited.
- Search box, recent foods, favourites.
- **Saved meals** ("My usual breakfast") and **copy yesterday's meal**.
- Each food gets an automatic tag (protein-rich / whole food / junk-fried-sweet) used in the weekly review.
- Daily total vs target: kcal, protein (shown most prominently), carbs, fat.

### 4. Progress
- Weight: daily points + **7-day moving average** line; weekly rate of change.
- Waist: weekly check-in (Sunday prompt). Recomp signal = waist going down while weight holds steady.
- Strength charts for key lifts (estimated 1-rep max over time).
- Habit heatmap (last 8 weeks).
- **Weekly review** (Sunday) covering:
  - weight and waist change
  - workouts done vs planned, total volume, PRs
  - average kcal and protein, days protein was hit
  - top 5 most-eaten foods, junk-food count, meal-timing gaps (e.g. skipped breakfast count)
  - habit completion %
  - average sleep and steps
  - one or two plain suggestions for next week

### Settings (gear icon)
- Profile: sex, age, height, weight, activity level, goal.
- Targets (auto, can be overridden).
- Rest-timer default, units.
- Habits manager.
- Export / import JSON backup; weekly "back up now" reminder.

## Targets calculation
- BMR: Mifflin-St Jeor. TDEE = BMR × activity factor (1.2 / 1.375 / 1.55 / 1.725).
- Recomp calories: TDEE − 10–15% (lighter deficit than a normal cut, to preserve muscle).
- Protein: 2.0 g/kg bodyweight. Fat: 0.8 g/kg. Carbs: the rest.
- Adaptive (after 3+ weeks of data, MacroFactor style): compare the 7-day weight trend with average intake to estimate real TDEE and suggest an adjustment.

## Default habits
- Protein target hit (auto from food log)
- 8,000+ steps (auto from check-in)
- 7 h+ sleep (auto from check-in)
- 3 L water (tap counter)
- No junk food (auto: none of the day's food items tagged junk)
- Supplements / creatine (manual)

Habits can be added, removed and reordered. Each shows its streak.

## Technical plan
- Static app, no build step, served by GitHub Pages:
  ```
  index.html
  manifest.webmanifest
  sw.js
  icons/
  css/app.css
  js/  store.js  app.js  today.js  workout.js  food.js  habits.js  progress.js  settings.js
  data/ foods.js  exercises.js  program.js
  ```
- Real `manifest.webmanifest` + `sw.js` file. The current service worker is registered from a blob URL, which browsers reject, so offline and "install" don't actually work today.
- One versioned store (`ft2_*` keys) with a schema version for future migrations.
- **Migration:** on first run, read the old `ft_*` keys (dailyLog weights/sleep/energy, exerciseLogs, habits, habitLogs, profile) into the new format. Old keys are left untouched as a fallback.
- Date keys always in **local time** (fixes the UTC bug in the current recovery score).
- Dark theme: black background, #1C1C1E / #2C2C2E cards, Apple-Fitness-style ring colours, system font stack, 44 px tap targets.

## Hosting
- Keep GitHub Pages (free, HTTPS, works for an installable app).
- Browser storage is tied to the site address, so the URL must stay `thoranprakash.github.io/activityTracker/` or the data won't carry over.
- Use **Add to Home Screen** so it runs full-screen and the browser is less likely to clear its storage.
- Build v2 under `/v2/` first. Same site address means it can read the existing data, while the current app stays live. Swap to the root once it's tested.

## Build order
1. Base: new structure, store, migration, dark theme, tab shell, manifest and service worker.
2. Workout: library, session logging, rest timer, PRs, overload hints.
3. Food: database, meal logging, saved meals, targets.
4. Today: check-in, rings, readiness.
5. Habits: auto and manual habits, streaks.
6. Progress and weekly review.
7. Backup, polish, swap `/v2/` to the root.

## Open items to collect on laptop
- Profile: sex, age, height, current weight, typical activity level.
- Confirm the Wed/Sat/Sun schedule of the current split.
- Supplements taken (for the habit).
