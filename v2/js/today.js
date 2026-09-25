// Today tab: rings, morning check-in, readiness, habits, workout + food summary.

import { S, save } from './store.js';
import { view, register, render } from './core.js';
import {
  targets, dayTotals, checkin, readiness, habitStatus, allHabitsStreak, planFor, exById, sessionVolume, profileComplete,
  mealTotals,
} from './calc.js';
import { MEALS } from '../data/foods.js';
import { ringsSVG, openSheet, closeSheet } from './ui.js';
import { $, esc, fmt, todayKey, fmtDate, mmss, num, toast, weekdayIdx, haptic, sum } from './util.js';

export function renderToday(el) {
  const d = todayKey();
  const t = targets();
  const tot = dayTotals(d);
  const c = checkin(d);
  const plan = planFor(d);
  const sessions = S.sessions.filter(s => s.date === d);
  const stepGoal = S.settings.stepGoal;

  // workout ring: planned sets done (or full on rest days / when a session is logged)
  let wPct, wLabel;
  if (S.active && S.active.date === d) {
    const all = S.active.exercises.flatMap(e => e.sets);
    wPct = all.length ? all.filter(s => s.done).length / all.length : 0;
    wLabel = `${Math.round(wPct * 100)}%<span> · in progress</span>`;
  } else if (sessions.length) {
    wPct = 1; wLabel = `Done<span> · ${esc(sessions[sessions.length - 1].name)}</span>`;
  } else if (plan.rest) {
    wPct = 1; wLabel = `Rest<span> · recovery day</span>`;
  } else {
    wPct = 0; wLabel = `0%<span> · ${esc(plan.name)}</span>`;
  }

  let h = `<div class="top"><div><div class="eyebrow">${esc(fmtDate(d))}</div><div class="title">Today</div></div>
    <button class="icon-btn" data-a="openSettings" aria-label="Settings">⚙︎</button></div>`;

  if (!profileComplete()) {
    h += `<div class="card" style="border:1px solid rgba(166,255,0,.35)"><div class="ch">👋 Welcome to FitTracker</div>
      <div class="muted" style="margin-bottom:12px">Add your age, height and weight so the app can work out your calorie and protein targets for a recomp.</div>
      <button class="btn" data-a="openSettings">Set up profile</button></div>`;
  }

  h += `<div class="card"><div class="rings">
    ${ringsSVG([
      { pct: tot.kcal / t.kcal, color: '#FA114F', track: '#3a0716' },
      { pct: wPct, color: '#A6FF00', track: '#243800' },
      { pct: (c.steps || 0) / stepGoal, color: '#00E5F0', track: '#00363a' },
    ])}
    <div class="leg">
      <div data-a="tab" data-t="food"><div class="l c-pink">Nutrition</div><div class="v c-pink num">${fmt(tot.kcal)}<span> / ${fmt(t.kcal)} kcal</span></div></div>
      <div data-a="tab" data-t="workout"><div class="l c-green">Workout</div><div class="v c-green">${wLabel}</div></div>
      <div data-a="checkin"><div class="l c-cyan">Steps</div><div class="v c-cyan num">${fmt(c.steps || 0)}<span> / ${fmt(stepGoal)}</span></div></div>
    </div></div>
    <div class="macros" style="margin-top:14px"><div><div class="n">Protein <b>${fmt(tot.p)} / ${t.protein} g</b></div><div class="bar"><i style="width:${Math.min(100, (tot.p / t.protein) * 100)}%;background:var(--blue)"></i></div></div>
    <div><div class="n">Carbs <b>${fmt(tot.c)}g</b></div><div class="bar"><i style="width:${Math.min(100, (tot.c / t.carbs) * 100)}%;background:var(--orange)"></i></div></div>
    <div><div class="n">Fat <b>${fmt(tot.f)}g</b></div><div class="bar"><i style="width:${Math.min(100, (tot.f / t.fat) * 100)}%;background:var(--yellow)"></i></div></div></div></div>`;

  // check-in / readiness
  const r = readiness(d);
  if (!Object.keys(c).filter(k => !['water', 'notes'].includes(k)).length) {
    h += `<div class="card"><div class="ch">☀️ Morning check-in <small>~20 sec</small></div>
      <div class="muted" style="margin-bottom:12px">Weight, sleep and resting HR from your Amazfit, plus how you feel. Powers your readiness score.</div>
      <button class="btn" data-a="checkin">Check in</button></div>`;
  } else {
    h += `<div class="card tap" data-a="checkin"><div class="ch">Readiness <small>tap to edit check-in</small></div>
      <div class="row" style="gap:14px">${r ? `<div class="big c-${r.color} num">${r.score}</div>` : ''}
      <div><div style="font-weight:700;font-size:14px">${r ? esc(r.label) : 'Add sleep / energy for a score'}</div>
      <div class="mini">
        ${c.weight ? `<div><b>${c.weight} kg</b>Weight</div>` : ''}
        ${c.sleepH != null ? `<div><b>${c.sleepH}h</b>Sleep${c.sleepScore ? ' · ' + c.sleepScore : ''}</div>` : ''}
        ${c.rhr ? `<div><b>${c.rhr}</b>Rest HR</div>` : ''}
        ${c.energy ? `<div><b>${c.energy}/5</b>Energy</div>` : ''}
        ${c.soreness ? `<div><b>${c.soreness}/5</b>Sore</div>` : ''}
      </div></div></div></div>`;
  }

  // habits
  const hs = S.habits.map(hb => ({ hb, st: habitStatus(hb, d) }));
  const doneN = hs.filter(x => x.st.done).length;
  const streak = allHabitsStreak(d);
  h += `<div class="card"><div class="ch">Habits <small>${doneN} of ${hs.length}${streak ? ` · 🔥 ${streak}-day streak` : ''}</small></div><div class="chips">`;
  h += hs.map(({ hb, st }) => {
    const label = hb.auto && hb.auto !== 'water' ? `${hb.icon} ${esc(st.label)}` : st.water ? `${hb.icon} ${esc(st.label)}` : `${hb.icon} ${esc(hb.name)}`;
    return `<button class="chip ${st.done ? 'on' : ''}" data-a="habitTap" data-id="${hb.id}">${st.done ? '✓ ' : ''}${label}</button>`;
  }).join('');
  h += `</div></div>`;

  // workout card
  if (S.active) {
    h += `<div class="card"><div class="ch">🏋️ ${esc(S.active.name)} <small>in progress · ${mmss((Date.now() - S.active.start) / 1000)}</small></div>
      <button class="btn" data-a="tab" data-t="workout">Resume workout</button></div>`;
  } else if (sessions.length) {
    const s = sessions[sessions.length - 1];
    h += `<div class="card"><div class="ch">✅ ${esc(s.name)} <small>${mmss((s.end - s.start) / 1000)} · ${fmt(sessionVolume(s))} kg</small></div>
      <div class="muted">${s.exercises.map(e => esc(exById(e.ex).name)).join(' · ')}</div></div>`;
  } else if (plan.items.length && !plan.rest) {
    h += `<div class="card"><div class="ch">Today · ${esc(plan.name)} <small>${plan.items.length} exercises</small></div>
      <div class="muted" style="margin-bottom:12px">${plan.items.slice(0, 5).map(i => esc(exById(i.ex).name)).join(' · ')}${plan.items.length > 5 ? ` · +${plan.items.length - 5}` : ''}</div>
      <button class="btn" data-a="startDay" data-d="${weekdayIdx(d)}">Start workout</button></div>`;
  } else {
    h += `<div class="card"><div class="ch">🧘 ${esc(plan.name)}</div><div class="muted" style="margin-bottom:12px">${esc(plan.focus || 'Recovery day')}. A walk and some stretching helps recovery.</div>
      <button class="btn ghost" data-a="${plan.items.length ? 'startDay' : 'startEmpty'}" data-d="${weekdayIdx(d)}">${plan.items.length ? 'Log walk / mobility' : 'Log an activity'}</button></div>`;
  }

  // meals summary
  const day = S.food[d] || {};
  h += `<div class="card"><div class="ch">🍽️ Meals <small>${fmt(tot.kcal)} kcal · ${fmt(tot.p)} g protein</small></div>`;
  h += MEALS.map(m => {
    const mt = mealTotals(day[m.id] || []);
    return `<div class="li tap" data-a="addFoodFromToday" data-m="${m.id}"><div class="grow"><div class="t">${m.icon} ${m.name}</div><div class="s">${mt.count ? (day[m.id]).map(i => esc(i.name)).join(', ') : 'Not logged'}</div></div>
      <div class="k">${mt.count ? fmt(mt.kcal) : '<span class="link">＋</span>'}</div></div>`;
  }).join('');
  h += `</div>`;
  el.innerHTML = h;
}

// ═══════════════ check-in sheet ═══════════════
function scale(name, val, emojis) {
  return `<div class="scale">${[1, 2, 3, 4, 5].map(n => `<button class="${val === n ? 'on' : ''}" data-a="ciScale" data-f="${name}" data-v="${n}">${emojis[n - 1]}</button>`).join('')}</div>`;
}
let ci = {};
function openCheckin() {
  ci = { ...checkin(todayKey()) };
  openSheet('Check-in', checkinHTML(), { onclose: render });
}
function checkinHTML() {
  const f = (id, label, unit, mode = 'decimal', ph = '') => `<div class="field"><label>${label}</label><div class="unit-wrap"><input id="ci-${id}" type="number" inputmode="${mode}" step="any" value="${ci[id] ?? ''}" placeholder="${ph}"><span>${unit}</span></div></div>`;
  const sunday = weekdayIdx(todayKey()) === 6;
  return `<div class="muted" style="margin-bottom:12px">Everything is optional. Steps can be updated again later in the day.</div>
    <div class="grid2">${f('weight', '⚖️ Weight', 'kg', 'decimal', 'after toilet, before food')}${f('steps', '👣 Steps', 'steps', 'numeric')}
    ${f('sleepH', '😴 Sleep', 'hrs')}${f('sleepScore', '💤 Sleep score', '/100', 'numeric')}
    ${f('rhr', '❤️ Resting HR', 'bpm', 'numeric')}${f('waist', `📏 Waist${sunday ? ' (Sunday!)' : ''}`, 'cm')}</div>
    <div class="field"><label>⚡ Energy</label>${scale('energy', ci.energy, ['😫', '😓', '😐', '💪', '🔥'])}</div>
    <div class="field"><label>🦵 Muscle soreness</label>${scale('soreness', ci.soreness, ['😌', '🙂', '😐', '😣', '🥵'])}</div>
    <div class="field"><label>📝 Notes</label><textarea id="ci-notes" rows="2" placeholder="Anything worth remembering">${esc(ci.notes || '')}</textarea></div>
    <button class="btn" data-a="ciSave">Save check-in</button>`;
}
register({
  checkin: openCheckin,
  ciScale: el => {
    const f = el.dataset.f, v = +el.dataset.v;
    readCheckinFields();
    ci[f] = ci[f] === v ? undefined : v;
    $('#sheet-body').innerHTML = checkinHTML();
  },
  ciSave: () => {
    readCheckinFields();
    const d = todayKey();
    const clean = {};
    for (const [k, v] of Object.entries({ ...S.checkins[d], ...ci })) if (v != null && v !== '') clean[k] = v;
    S.checkins[d] = clean;
    save('checkins');
    toast('✓ Check-in saved');
    closeSheet();
  },
  habitTap: el => {
    const hb = S.habits.find(x => x.id === el.dataset.id);
    const d = todayKey();
    if (hb.auto === 'water') return openWater();
    if (hb.auto) {
      const how = { protein: 'Ticks itself when food logged today reaches your protein target.', steps: 'Ticks itself when your check-in steps reach your goal.', sleep: `Ticks itself when check-in sleep is ${S.settings.sleepGoal}h or more.`, nojunk: 'Ticks itself when you log food and none of it is tagged junk.' }[hb.auto];
      return toast(how);
    }
    const logs = (S.habitLogs[d] ||= {});
    logs[hb.id] = !logs[hb.id];
    if (!logs[hb.id]) delete logs[hb.id];
    haptic(10);
    save('habitLogs');
    render();
  },
  addFoodFromToday: el => { view.tab = 'food'; view.foodDate = todayKey(); render(); import('./food.js').then(m => m.openAddFood(el.dataset.m)); },
});
function readCheckinFields() {
  for (const k of ['weight', 'steps', 'sleepH', 'sleepScore', 'rhr', 'waist']) {
    const el = $('#ci-' + k);
    if (el) ci[k] = num(el.value) ?? undefined;
  }
  const n = $('#ci-notes');
  if (n) ci.notes = n.value.trim() || undefined;
}

function openWater() {
  const d = todayKey();
  const cur = checkin(d).water || 0;
  const goal = S.settings.waterGoal;
  openSheet('💧 Water', `<div class="stepper" style="margin-bottom:14px"><button data-a="water" data-d="-0.25">−</button><div class="val num">${cur} L<div class="muted" style="font-size:12px;font-weight:500">goal ${goal} L</div></div><button data-a="water" data-d="0.25">＋</button></div>
    <div class="chips" style="justify-content:center">${[0.25, 0.5, 0.75, 1].map(x => `<button class="chip" data-a="water" data-d="${x}">+${x * 1000} ml</button>`).join('')}</div>`, { onclose: render });
}
register({
  water: el => {
    const d = todayKey();
    const c = (S.checkins[d] ||= {});
    c.water = Math.max(0, Math.round(((c.water || 0) + +el.dataset.d) * 100) / 100);
    save('checkins');
    haptic(8);
    openWater();
  },
});
