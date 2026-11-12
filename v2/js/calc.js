// Derived numbers: targets, trends, food totals, readiness, habits, PRs.

import { S, rev } from './store.js';
import { EXERCISES, TYPE_DEFAULT_REST } from '../data/exercises.js';
import { FOODS, MEALS } from '../data/foods.js';
import { addDays, avg, daysBetween, round, sum, todayKey, weekdayIdx, clamp } from './util.js';

// ── memo: results are reused until the next save() ─────────
let memoRev = -1;
let memoMap = new Map();
function memo(key, fn) {
  if (memoRev !== rev) { memoRev = rev; memoMap = new Map(); }
  if (!memoMap.has(key)) memoMap.set(key, fn());
  return memoMap.get(key);
}

// ── lookups ────────────────────────────────────────────────
export const allExercises = () => [...EXERCISES, ...S.customExercises];
export function exById(id) {
  return allExercises().find(e => e.id === id) || { id, name: id, type: 'strength', group: 'Other' };
}
export const restFor = ex => ex.rest ?? (ex.type === 'strength' ? S.settings.restSec : TYPE_DEFAULT_REST[ex.type] ?? 60);

export const allFoods = () => [...S.customFoods, ...FOODS];
export const foodById = id => allFoods().find(f => f.id === id);

// ── body weight ────────────────────────────────────────────
export function weightSeries() {
  return memo('wseries', () => Object.entries(S.checkins)
    .filter(([, c]) => c.weight)
    .map(([date, c]) => ({ date, v: c.weight }))
    .sort((a, b) => (a.date < b.date ? -1 : 1)));
}
/** 7-day moving average ending on each weigh-in date. */
export function weightTrend() {
  return memo('wtrend', () => {
    const s = weightSeries();
    return s.map((p, i) => {
      const win = s.slice(Math.max(0, i - 6), i + 1).filter(q => daysBetween(q.date, p.date) < 7);
      return { date: p.date, v: avg(win.map(q => q.v)) };
    });
  });
}
export function trendAt(date) {
  const t = weightTrend().filter(p => p.date <= date);
  return t.length ? t[t.length - 1].v : null;
}
export function currentWeight() {
  return trendAt(todayKey()) ?? S.profile?.weightKg ?? null;
}
export function waistSeries() {
  return Object.entries(S.checkins)
    .filter(([, c]) => c.waist)
    .map(([date, c]) => ({ date, v: c.waist }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ── targets ────────────────────────────────────────────────
export const ACTIVITY = [
  { v: 1.2, label: 'Desk job, little walking' },
  { v: 1.375, label: 'Lightly active (training 3–4×/wk)' },
  { v: 1.55, label: 'Active (training 4–5× + walking)' },
  { v: 1.725, label: 'Very active (physical job / daily hard training)' },
];

export function profileComplete() {
  const p = S.profile;
  return !!(p && p.age && p.heightCm && p.weightKg && p.sex);
}

export function targets() {
  return memo('targets|' + todayKey(), computeTargets);
}
function computeTargets() {
  const p = S.profile;
  if (!profileComplete()) return { kcal: 2000, protein: 140, fat: 60, carbs: 220, estimated: true };
  const w = currentWeight() || p.weightKg;
  const bmr = 10 * w + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'female' ? -161 : 5);
  const tdee = bmr * (p.activity || 1.375);
  let kcal = round(tdee * (1 - (p.deficitPct ?? 12) / 100), 10);
  if (p.kcalOverride) kcal = p.kcalOverride;
  const protein = p.proteinOverride || round(w * (p.proteinPerKg ?? 2), 5);
  const fat = round(w * 0.8, 5);
  const carbs = Math.max(0, round((kcal - protein * 4 - fat * 9) / 4, 5));
  return { kcal, protein, fat, carbs, bmr: Math.round(bmr), tdee: Math.round(tdee), weight: w };
}

/**
 * MacroFactor-style check: compare average intake with the weight trend to
 * estimate real maintenance calories. Needs ≥ 21 days of weights + food.
 */
export function adaptiveTDEE() {
  const end = todayKey();
  const start = addDays(end, -27);
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const t = dayTotals(d);
    if (t.count) days.push(t.kcal);
  }
  const trend = weightTrend().filter(p => p.date >= start);
  if (days.length < 21 || trend.length < 10) return null;
  const first = trend[0], last = trend[trend.length - 1];
  const span = Math.max(1, daysBetween(first.date, last.date));
  const kgPerDay = (last.v - first.v) / span;
  const intake = avg(days);
  return { tdee: Math.round(intake - kgPerDay * 7700), intake: Math.round(intake), kgPerWeek: kgPerDay * 7, days: days.length };
}

// ── food ───────────────────────────────────────────────────
export function makeEntry(food, grams) {
  const k = grams / 100;
  return {
    fid: food.id, name: food.name, g: Math.round(grams), tag: food.tag,
    kcal: food.kcal * k, p: food.p * k, c: food.c * k, f: food.f * k,
  };
}
export function mealTotals(items = []) {
  return {
    kcal: sum(items.map(i => i.kcal)), p: sum(items.map(i => i.p)),
    c: sum(items.map(i => i.c)), f: sum(items.map(i => i.f)), count: items.length,
  };
}
export function dayItems(date) {
  const d = S.food[date] || {};
  return MEALS.flatMap(m => d[m.id] || []);
}
export const dayTotals = date => memo('day|' + date, () => mealTotals(dayItems(date)));

// ── check-in / readiness ───────────────────────────────────
export const checkin = date => S.checkins[date] || {};

export function trainingLoad(date) {
  // total "work" in the 3 days before `date` vs the 28-day daily average
  const load = d => sum(S.sessions.filter(s => s.date === d).map(sessionLoad));
  const recent = sum([1, 2, 3].map(i => load(addDays(date, -i)))) / 3;
  const base = sum(Array.from({ length: 28 }, (_, i) => load(addDays(date, -i - 1)))) / 28;
  return { recent, base };
}
function sessionLoad(s) {
  return sum(s.exercises.map(e => e.sets.filter(x => x.done).length));
}

export function readiness(date) {
  const c = checkin(date);
  const parts = [];
  if (c.sleepH != null) parts.push({ w: 30, v: clamp(c.sleepH / 8, 0, 1) });
  if (c.sleepScore != null) parts.push({ w: 15, v: clamp(c.sleepScore / 100, 0, 1) });
  if (c.rhr != null) {
    const past = [];
    for (let i = 1; i <= 14; i++) { const r = checkin(addDays(date, -i)).rhr; if (r) past.push(r); }
    const base = past.length >= 3 ? avg(past) : c.rhr;
    parts.push({ w: 20, v: clamp(1 - (c.rhr - base) / 10, 0, 1) });
  }
  if (c.energy != null) parts.push({ w: 15, v: (c.energy - 1) / 4 });
  if (c.soreness != null) parts.push({ w: 10, v: 1 - (c.soreness - 1) / 4 });
  if (!parts.length) return null;
  const { recent, base } = trainingLoad(date);
  parts.push({ w: 10, v: base ? clamp(1.5 - recent / base / 2, 0, 1) : 0.8 });
  const score = Math.round(100 * sum(parts.map(p => p.w * p.v)) / sum(parts.map(p => p.w)));
  let label, color;
  if (score >= 75) { label = 'Good — train as planned'; color = 'green'; }
  else if (score >= 55) { label = 'Okay — train, but don’t chase PRs'; color = 'yellow'; }
  else { label = 'Low — go lighter or take it easy'; color = 'orange'; }
  return { score, label, color };
}

// ── habits ─────────────────────────────────────────────────
/** Returns { done, label } for a habit on a date. */
export function habitStatus(h, date) {
  return memo(`habit|${h.id}|${date}`, () => computeHabit(h, date));
}
function computeHabit(h, date) {
  const c = checkin(date);
  const t = targets();
  switch (h.auto) {
    case 'protein': {
      const p = dayTotals(date).p;
      return { done: p >= t.protein * 0.95, label: `${Math.round(p)}/${t.protein}g`, auto: true };
    }
    case 'steps': {
      const st = c.steps || 0;
      return { done: st >= S.settings.stepGoal, label: st ? `${(st / 1000).toFixed(1)}k` : `${S.settings.stepGoal / 1000}k`, auto: true };
    }
    case 'sleep':
      return { done: (c.sleepH || 0) >= S.settings.sleepGoal, label: c.sleepH ? `${c.sleepH}h` : `${S.settings.sleepGoal}h+`, auto: true };
    case 'water': {
      const w = c.water || 0;
      return { done: w >= S.settings.waterGoal, label: `${w}/${S.settings.waterGoal} L`, water: true };
    }
    case 'nojunk': {
      const items = dayItems(date);
      const junk = items.filter(i => i.tag === 'j').length;
      return { done: items.length > 0 && junk === 0, label: junk ? `${junk} junk` : 'No junk', auto: true };
    }
    default:
      return { done: !!S.habitLogs[date]?.[h.id], label: h.name };
  }
}
export function habitStreak(h, date = todayKey()) {
  let d = habitStatus(h, date).done ? date : addDays(date, -1);
  let n = 0;
  while (habitStatus(h, d).done && n < 1000) { n++; d = addDays(d, -1); }
  return n;
}
export function allHabitsStreak(date = todayKey()) {
  // days in a row where at least 80% of habits were done
  const ok = d => {
    const hs = S.habits;
    return hs.length && hs.filter(h => habitStatus(h, d).done).length / hs.length >= 0.8;
  };
  let d = ok(date) ? date : addDays(date, -1), n = 0;
  while (ok(d) && n < 1000) { n++; d = addDays(d, -1); }
  return n;
}

// ── workouts ───────────────────────────────────────────────
export const e1rm = (kg, reps) => (kg > 0 && reps > 0 ? (reps === 1 ? kg : kg * (1 + reps / 30)) : 0);

export function setVolume(ex, s) {
  if (!s.done) return 0;
  if (ex.type === 'strength') return (s.kg || 0) * (s.reps || 0);
  return 0;
}
export const sessionVolume = s => sum(s.exercises.map(e => sum(e.sets.map(x => setVolume(exById(e.ex), x)))));

/** Most recent finished session entry for an exercise (optionally before a timestamp). */
export function lastPerformance(exId, before = Infinity) {
  for (let i = S.sessions.length - 1; i >= 0; i--) {
    const s = S.sessions[i];
    if (s.start >= before) continue;
    const e = s.exercises.find(x => x.ex === exId && x.sets.some(y => y.done));
    if (e) return { session: s, entry: e };
  }
  return null;
}

/** Best values across finished sessions (optionally only before a timestamp). */
export function bests(exId, before = Infinity) {
  const b = { e1rm: 0, kg: 0, reps: 0, sec: 0, km: 0, min: 0 };
  for (const s of S.sessions) {
    if (s.start >= before) continue;
    for (const e of s.exercises) {
      if (e.ex !== exId) continue;
      for (const x of e.sets) {
        if (!x.done) continue;
        b.e1rm = Math.max(b.e1rm, e1rm(x.kg, x.reps));
        b.kg = Math.max(b.kg, x.kg || 0);
        b.reps = Math.max(b.reps, x.reps || 0);
        b.sec = Math.max(b.sec, x.sec || 0);
        b.km = Math.max(b.km, x.km || 0);
        b.min = Math.max(b.min, x.min || 0);
      }
    }
  }
  return b;
}

/** Which records a set beats compared to history. */
export function setPRs(ex, set, prev) {
  if (!set.done) return [];
  const out = [];
  if (ex.type === 'strength') {
    if (!prev.kg && !prev.e1rm) return []; // first time doing it isn't a PR
    if (set.kg > prev.kg) out.push('Heaviest weight');
    else if (e1rm(set.kg, set.reps) > prev.e1rm + 0.01) out.push('Best estimated 1RM');
  } else if (ex.type === 'bodyweight') {
    if (prev.reps && set.reps > prev.reps) out.push('Most reps');
  } else if (ex.type === 'timed') {
    if (prev.sec && set.sec > prev.sec) out.push('Longest hold');
  } else if (ex.type === 'cardio') {
    if (prev.km && set.km > prev.km) out.push('Longest distance');
  }
  return out;
}

/** Progressive-overload suggestion for the next session of an exercise. */
export function suggestion(item, ex) {
  const last = lastPerformance(ex.id);
  if (!last) return null;
  const done = last.entry.sets.filter(s => s.done);
  if (!done.length) return null;
  if (ex.type === 'strength' && item?.hi) {
    const topKg = Math.max(...done.map(s => s.kg || 0));
    const atTop = done.filter(s => (s.kg || 0) === topKg);
    if (topKg > 0 && atTop.length >= Math.min(item.sets || 1, done.length) && atTop.every(s => s.reps >= item.hi)) {
      return { kg: round(topKg + (ex.inc || 2.5), 0.5), text: `You hit ${atTop.length}×${item.hi}+ at ${topKg} kg last time → try ${round(topKg + (ex.inc || 2.5), 0.5)} kg` };
    }
    return { kg: topKg, text: `Last time: ${done.map(s => `${s.kg}×${s.reps}`).join(', ')} — beat it by one rep` };
  }
  if (ex.type === 'bodyweight' && item?.hi) {
    const best = Math.max(...done.map(s => s.reps || 0));
    if (best >= item.hi) return { text: `You hit ${best} reps — slow the tempo or add weight` };
  }
  return null;
}

/** Planned template for a weekday (0 = Monday). */
export const planFor = date => S.program[weekdayIdx(date)];

// ── rings for any day ──────────────────────────────────────
/** Ring fill (0–1) for a date: nutrition, workout, steps. */
export function dayRings(date) {
  return memo('rings|' + date, () => {
    const t = targets();
    const tot = dayTotals(date);
    const sessions = S.sessions.filter(s => s.date === date);
    let workout = 0;
    if (S.active && S.active.date === date) {
      const all = S.active.exercises.flatMap(e => e.sets);
      workout = all.length ? all.filter(s => s.done).length / all.length : 0;
    } else if (sessions.length || planFor(date).rest) workout = 1;
    return {
      nutrition: tot.kcal / t.kcal, workout, steps: (checkin(date).steps || 0) / S.settings.stepGoal,
      trained: sessions.length > 0,
    };
  });
}
/** Protein hit, calories within ±10%, workout ring closed, steps goal reached. */
export function perfectDay(date) {
  const t = targets(), tot = dayTotals(date), r = dayRings(date);
  return tot.count > 0 && tot.p >= t.protein * 0.95 && Math.abs(tot.kcal - t.kcal) <= t.kcal * 0.1 && r.workout >= 1 && r.steps >= 1;
}

// ── body composition (US Navy tape method) ─────────────────
function latest(field, date) {
  const keys = Object.keys(S.checkins).filter(k => k <= date && S.checkins[k][field]).sort();
  return keys.length ? { date: keys[keys.length - 1], v: S.checkins[keys[keys.length - 1]][field] } : null;
}
/** Estimated body-fat % on a date, or null if measurements are missing. */
export function bodyFat(date = todayKey()) {
  const p = S.profile;
  if (!p?.heightCm) return null;
  const waist = latest('waist', date), neck = latest('neck', date);
  if (!waist || !neck) return null;
  let pct;
  if (p.sex === 'female') {
    const hip = latest('hip', date);
    if (!hip || waist.v + hip.v - neck.v <= 0) return null;
    pct = 495 / (1.29579 - 0.35004 * Math.log10(waist.v + hip.v - neck.v) + 0.221 * Math.log10(p.heightCm)) - 450;
  } else {
    if (waist.v - neck.v <= 0) return null;
    pct = 495 / (1.0324 - 0.19077 * Math.log10(waist.v - neck.v) + 0.15456 * Math.log10(p.heightCm)) - 450;
  }
  if (!isFinite(pct) || pct < 3 || pct > 60) return null;
  const weight = trendAt(date) ?? p.weightKg;
  const fat = (weight * pct) / 100;
  return { pct, fat, lean: weight - fat, weight, date: waist.date > neck.date ? waist.date : neck.date };
}
/** Body-fat estimate at every date a waist or neck measurement was taken. */
export function bodyFatSeries() {
  const dates = Object.keys(S.checkins).filter(k => S.checkins[k].waist || S.checkins[k].neck).sort();
  return dates.map(d => ({ date: d, bf: bodyFat(d) })).filter(x => x.bf);
}

// ── streaks ────────────────────────────────────────────────
export function firstDataDate() {
  const keys = [...Object.keys(S.checkins), ...Object.keys(S.food), ...S.sessions.map(s => s.date)].sort();
  return keys[0] || todayKey();
}
/** { current, best } run of consecutive days where test(date) is true. Today not counting against current. */
export function dayStreak(test) {
  const end = todayKey();
  let best = 0, run = 0;
  for (let d = firstDataDate(); d <= end; d = addDays(d, 1)) {
    if (test(d)) { run++; best = Math.max(best, run); } else if (d !== end) run = 0;
  }
  return { current: run, best };
}
/** Consecutive weeks (ending this or last week) with at least `n` workouts. */
export function weekStreak(n) {
  const count = mon => S.sessions.filter(s => s.date >= mon && s.date <= addDays(mon, 6)).length;
  let mon = addDays(todayKey(), -weekdayIdx(todayKey()));
  if (count(mon) < n) mon = addDays(mon, -7);
  let streak = 0;
  while (count(mon) >= n && streak < 520) { streak++; mon = addDays(mon, -7); }
  return streak;
}

// ── awards ─────────────────────────────────────────────────
export function awards() {
  return memo('awards|' + todayKey(), () => {
    const t = targets();
    const nSess = S.sessions.length;
    const allSets = S.sessions.flatMap(s => s.exercises.flatMap(e => e.sets));
    const prs = allSets.filter(x => x.pr?.length).length;
    const tonnes = sum(S.sessions.map(sessionVolume)) / 1000;
    const protein = dayStreak(d => dayTotals(d).count > 0 && dayTotals(d).p >= t.protein * 0.95);
    const logging = dayStreak(d => dayTotals(d).count > 0);
    const checkins = dayStreak(d => !!S.checkins[d]?.weight);
    const water = dayStreak(d => (S.checkins[d]?.water || 0) >= S.settings.waterGoal);
    const nojunk = dayStreak(d => dayTotals(d).count > 0 && !dayItems(d).some(i => i.tag === 'j'));
    let perfect = 0, maxSteps = 0;
    for (let d = firstDataDate(); d <= todayKey(); d = addDays(d, 1)) {
      if (perfectDay(d)) perfect++;
      maxSteps = Math.max(maxSteps, S.checkins[d]?.steps || 0);
    }
    const ws = waistSeries();
    const waistDrop = ws.length > 1 ? Math.max(...ws.map(p => p.v)) - ws[ws.length - 1].v : 0;
    const weeks = weekStreak(4);
    const A = (icon, name, desc, have, need) => ({ icon, name, desc, have: Math.min(have, need), need, done: have >= need });
    return {
      streaks: { protein, logging, checkins, weeks, nojunk },
      list: [
        A('🏁', 'First rep', 'Finish your first workout', nSess, 1),
        A('🔟', 'Regular', '10 workouts logged', nSess, 10),
        A('🏋️', 'Committed', '50 workouts logged', nSess, 50),
        A('💯', 'Century', '100 workouts logged', nSess, 100),
        A('🏆', 'Record breaker', 'Set your first personal record', prs, 1),
        A('🚀', 'PR machine', '25 personal records', prs, 25),
        A('🐘', 'Elephant lifted', 'Lift 5 tonnes in total', tonnes, 5),
        A('🚚', 'Truck lifted', 'Lift 50 tonnes in total', tonnes, 50),
        A('✈️', 'Jumbo jet', 'Lift 400 tonnes in total', tonnes, 400),
        A('📅', 'Full week', 'All 4 workouts in one week', maxWeek() >= 4 ? 1 : 0, 1),
        A('🗓️', 'Month strong', '4 full weeks in a row', weeks, 4),
        A('🥩', 'Protein streak', 'Hit protein 7 days running', protein.best, 7),
        A('🍗', 'Protein pro', 'Hit protein 30 days running', protein.best, 30),
        A('📝', 'Honest logger', 'Log food 14 days running', logging.best, 14),
        A('⚖️', 'Scale habit', 'Weigh in 14 days running', checkins.best, 14),
        A('💧', 'Hydrated', 'Hit water goal 7 days running', water.best, 7),
        A('🥗', 'Clean week', '7 days with no junk food', nojunk.best, 7),
        A('👟', '10k day', 'Walk 10,000 steps in a day', maxSteps, 10000),
        A('✨', 'Perfect day', 'Protein, calories, workout and steps all on target', perfect, 1),
        A('🌟', 'Perfect ten', '10 perfect days', perfect, 10),
        A('📏', 'Belt notch', 'Waist down 2 cm', waistDrop, 2),
        A('🎯', 'New belt', 'Waist down 5 cm', waistDrop, 5),
      ],
    };
  });
}
function maxWeek() {
  const byWeek = {};
  for (const s of S.sessions) { const m = addDays(s.date, -weekdayIdx(s.date)); byWeek[m] = (byWeek[m] || 0) + 1; }
  return Math.max(0, ...Object.values(byWeek));
}

// ── daily coach ────────────────────────────────────────────
const PROTEIN_PICKS = [
  ['whey_protein', 1], ['boiled_egg', 3], ['chicken_breast_cooked', 1.5], ['greek_yogurt', 1], ['paneer', 1],
  ['grilled_fish', 1], ['roasted_chana', 1], ['chicken_tikka', 1], ['omelette', 1], ['curd_dahi', 1],
];
/** Foods that would help close the protein gap inside the calories left. */
export function proteinIdeas(date) {
  const t = targets(), tot = dayTotals(date);
  const gap = t.protein - tot.p, room = Math.max(t.kcal - tot.kcal, 250);
  return PROTEIN_PICKS
    .map(([id, n]) => { const f = foodById(id); return f && { f, n, e: makeEntry(f, f.g * n) }; })
    .filter(x => x && x.e.kcal <= room && x.e.p >= 8)
    .sort((a, b) => Math.abs(a.e.p - Math.min(gap, 45)) - Math.abs(b.e.p - Math.min(gap, 45)))
    .slice(0, 2);
}

/** Up to two short, actionable nudges for today. */
export function coach(now = new Date()) {
  const d = todayKey(), hr = now.getHours();
  const t = targets(), tot = dayTotals(d), c = checkin(d), r = dayRings(d);
  const plan = planFor(d);
  const out = [];
  const add = (icon, html, a = '', args = '') => out.push({ icon, html, a, args });
  const rd = readiness(d);

  if (perfectDay(d)) add('✨', '<b>Perfect day.</b> Protein, calories, workout and steps all on target.');
  if (rd && rd.score < 55 && !r.trained && !plan.rest) add('🪫', `<b>Readiness is ${rd.score}.</b> Train, but drop one set per exercise and skip the last-rep grinders.`);
  if (!plan.rest && !r.trained && !S.active && hr >= 17) add('🏋️', `<b>${plan.name} is still open.</b> Even a shorter session keeps the week on track.`, 'tab', 'data-t="workout"');

  const gap = t.protein - tot.p;
  if (tot.count && gap > 20 && hr >= 13) {
    const ideas = proteinIdeas(d).map(x => `${x.n > 1 ? x.n + ' × ' : ''}${x.f.name.toLowerCase()} (+${Math.round(x.e.p)} g)`);
    add('🥩', `<b>${Math.round(gap)} g protein to go.</b>${ideas.length ? ' Easy wins: ' + ideas.join(' or ') + '.' : ''}`, 'tab', 'data-t="food"');
  } else if (!tot.count && hr >= 10) {
    add('🍽️', '<b>Nothing logged yet today.</b> Log as you eat — it takes ten seconds per meal.', 'tab', 'data-t="food"');
  }
  if (tot.kcal > t.kcal * 1.1) add('🔥', `<b>${Math.round(tot.kcal - t.kcal)} kcal over target.</b> Keep the next meal light and protein-first; a 30-minute walk burns about 120.`);
  if (c.steps && r.steps < 1 && hr >= 17) {
    const left = S.settings.stepGoal - c.steps;
    add('👣', `<b>${left.toLocaleString('en-IN')} steps short.</b> About ${Math.max(5, Math.round(left / 110 / 5) * 5)} minutes of walking closes the ring.`);
  }
  if ((c.water || 0) < S.settings.waterGoal * 0.5 && hr >= 15) add('💧', `<b>Only ${c.water || 0} L of water so far.</b> Have a big glass now.`, 'habitTap', 'data-id="water"');
  if (weekdayIdx(d) === 6) {
    if (!c.waist) add('📏', '<b>Sunday measure-up.</b> Log your waist (and neck) to track fat loss, not just weight.', 'checkin');
    add('📊', '<b>Your weekly review is ready.</b> See what to adjust next week.', 'goReview');
  }
  const hasData = S.sessions.length + Object.keys(S.food).length > 5;
  const since = S.meta.lastBackup ? daysBetween(S.meta.lastBackup, d) : Infinity;
  if (hasData && since > 14) add('💾', `<b>${S.meta.lastBackup ? 'Last backup was ' + since + ' days ago.' : 'No backup yet.'}</b> Your data lives only on this phone — export a copy.`, 'openSettings');
  return out.slice(0, 2);
}

// ── weekly muscle-group balance ────────────────────────────
/** Done sets per exercise group for sessions in [from, to]. */
export function setsByGroup(from, to) {
  const out = {};
  for (const s of S.sessions) {
    if (s.date < from || s.date > to) continue;
    for (const e of s.exercises) {
      const g = exById(e.ex).group;
      out[g] = (out[g] || 0) + e.sets.filter(x => x.done).length;
    }
  }
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}
