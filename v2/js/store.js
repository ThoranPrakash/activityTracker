// All app state lives in localStorage under "ft2_*" keys.
// S holds the in-memory copy; call save('name') after changing S.name.

import { DEFAULT_PROGRAM, OLD_PROGRAM_NAMES } from '../data/program.js';
import { dkey, todayKey, toast, uid } from './util.js';

export const SCHEMA = 1;

const DEFAULTS = {
  profile: () => null, // { sex, age, heightCm, weightKg, activity, deficitPct, proteinPerKg, kcalOverride, proteinOverride }
  settings: () => ({ restSec: 90, stepGoal: 8000, waterGoal: 3, sleepGoal: 7 }),
  checkins: () => ({}), // { date: { weight, sleepH, sleepScore, rhr, steps, energy, soreness, water, waist } }
  sessions: () => [], // finished workouts
  active: () => null, // workout in progress
  program: () => JSON.parse(JSON.stringify(DEFAULT_PROGRAM)),
  customExercises: () => [],
  food: () => ({}), // { date: { breakfast: [entry], lunch: [], snack: [], dinner: [] } }
  customFoods: () => [],
  favFoods: () => [],
  savedMeals: () => [], // [{ id, name, items: [entry] }]
  habits: () => defaultHabits(),
  habitLogs: () => ({}), // { date: { habitId: true } }
  meta: () => ({ schema: SCHEMA, migrated: false }),
};

export function defaultHabits() {
  return [
    { id: 'protein', name: 'Hit protein', icon: '🥩', auto: 'protein' },
    { id: 'steps', name: 'Steps goal', icon: '👣', auto: 'steps' },
    { id: 'sleep', name: 'Sleep 7h+', icon: '😴', auto: 'sleep' },
    { id: 'water', name: 'Water', icon: '💧', auto: 'water' },
    { id: 'nojunk', name: 'No junk', icon: '🥗', auto: 'nojunk' },
    { id: 'supps', name: 'Creatine / supplements', icon: '💊' },
  ];
}

export const S = {};
const KEY = name => 'ft2_' + name;

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch (e) {
    return fallback;
  }
}

export function loadAll() {
  for (const name of Object.keys(DEFAULTS)) S[name] = read(KEY(name), DEFAULTS[name]());
}

export function save(...names) {
  for (const name of names) {
    try {
      localStorage.setItem(KEY(name), JSON.stringify(S[name]));
    } catch (e) {
      toast('⚠️ Storage full — export a backup');
    }
  }
}

export function exportAll() {
  const out = { app: 'FitTracker', version: 2, schema: SCHEMA, exportedAt: new Date().toISOString(), data: {} };
  for (const name of Object.keys(DEFAULTS)) out.data[name] = S[name];
  return out;
}

export function importAll(obj) {
  if (!obj || obj.app !== 'FitTracker' || !obj.data) throw new Error('Not a FitTracker v2 backup');
  for (const name of Object.keys(DEFAULTS)) {
    if (name in obj.data) S[name] = obj.data[name];
  }
  save(...Object.keys(DEFAULTS));
}

export function resetAll() {
  for (const name of Object.keys(DEFAULTS)) {
    localStorage.removeItem(KEY(name));
    S[name] = DEFAULTS[name]();
  }
  S.meta.migrated = true; // don't re-import old data after an explicit reset
  save('meta');
}

// ─────────────────────────────────────────────────────────────
//  Migration from the previous app (ft_* keys). Old keys are only
//  read, never modified, so the old app keeps working.
// ─────────────────────────────────────────────────────────────
export function hasOldData() {
  return ['ft_dailyLog', 'ft_exerciseLogs', 'ft_habitLogs'].some(k => localStorage.getItem(k));
}

export function migrateOld() {
  const report = { checkins: 0, sessions: 0, habits: 0 };

  // Daily log → check-ins. Old date keys were UTC-based; close enough.
  const daily = read('ft_dailyLog', {});
  for (const [date, log] of Object.entries(daily)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !log) continue;
    const c = S.checkins[date] || {};
    const n = v => (v === '' || v == null || isNaN(+v) ? undefined : +v);
    if (c.weight == null && n(log.weight)) c.weight = n(log.weight);
    if (c.sleepH == null && n(log.sleep)) c.sleepH = n(log.sleep);
    if (c.water == null && n(log.water)) c.water = n(log.water);
    if (c.energy == null && n(log.energy)) c.energy = n(log.energy);
    if (!c.notes && log.notes) c.notes = log.notes;
    if (Object.keys(c).length) { S.checkins[date] = c; report.checkins++; }
  }
  const waist = parseFloat(localStorage.getItem('ft_waist'));
  if (waist) {
    const t = todayKey();
    S.checkins[t] = { ...(S.checkins[t] || {}), waist: waist > 60 ? waist : Math.round(waist * 2.54 * 10) / 10 };
  }

  // Exercise logs (keyed w{week}d{day}e{index}) → sessions grouped by date + day.
  const exLogs = read('ft_exerciseLogs', {});
  const groups = {};
  for (const [key, log] of Object.entries(exLogs)) {
    const m = /^w(\d+)d(\d)e(\d+)$/.exec(key);
    if (!m || !log || !log.sets) continue;
    const di = +m[2], ei = +m[3];
    const exId = (OLD_PROGRAM_NAMES[di] || [])[ei];
    const sets = log.sets
      .filter(s => s.weight !== '' || s.reps !== '')
      .map(s => ({ kg: +s.weight || 0, reps: +s.reps || 0, done: true }));
    if (!exId || !sets.length) continue;
    const date = log.date || dkey();
    const gk = date + '|' + di;
    (groups[gk] ||= { date, di, exercises: [] }).exercises.push({ ex: exId, sets, note: log.note || '' });
  }
  const existing = new Set(S.sessions.map(s => s.migratedFrom).filter(Boolean));
  for (const [gk, g] of Object.entries(groups)) {
    if (existing.has(gk)) continue;
    const start = new Date(g.date + 'T18:00:00').getTime();
    S.sessions.push({
      id: uid(), date: g.date, day: g.di, name: DEFAULT_PROGRAM[g.di]?.name || 'Workout',
      start, end: start + 60 * 60000, exercises: g.exercises, migratedFrom: gk,
    });
    report.sessions++;
  }
  S.sessions.sort((a, b) => a.start - b.start);

  // Habits with at least one log (skip old water/sleep/junk — now automatic).
  const oldHabits = read('ft_habits', []);
  const oldLogs = read('ft_habitLogs', {});
  for (const h of oldHabits) {
    if (['h1', 'h2', 'h3'].includes(h.id)) continue;
    const used = Object.values(oldLogs).some(l => l && l[h.id]);
    if (!used) continue;
    const id = 'old_' + h.id;
    if (!S.habits.some(x => x.id === id)) {
      S.habits.push({ id, name: h.name, icon: h.icon || '⭐' });
      report.habits++;
    }
    for (const [date, l] of Object.entries(oldLogs)) {
      if (l && l[h.id]) (S.habitLogs[date] ||= {})[id] = true;
    }
  }

  S.meta.migrated = true;
  save('checkins', 'sessions', 'habits', 'habitLogs', 'meta');
  return report;
}
