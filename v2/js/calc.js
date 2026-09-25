// Derived numbers: targets, trends, food totals, readiness, habits, PRs.

import { S } from './store.js';
import { EXERCISES, TYPE_DEFAULT_REST } from '../data/exercises.js';
import { FOODS, MEALS } from '../data/foods.js';
import { addDays, avg, daysBetween, round, sum, todayKey, weekdayIdx, clamp } from './util.js';

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
  return Object.entries(S.checkins)
    .filter(([, c]) => c.weight)
    .map(([date, c]) => ({ date, v: c.weight }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
/** 7-day moving average ending on each weigh-in date. */
export function weightTrend() {
  const s = weightSeries();
  return s.map((p, i) => {
    const win = s.slice(0, i + 1).filter(q => daysBetween(q.date, p.date) < 7);
    return { date: p.date, v: avg(win.map(q => q.v)) };
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
export const dayTotals = date => mealTotals(dayItems(date));

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
