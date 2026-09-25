// Progress tab: body trend, strength charts, habit heatmaps, weekly review.

import { S } from './store.js';
import { view, register, render } from './core.js';
import {
  weightSeries, weightTrend, waistSeries, trendAt, exById, allExercises, e1rm, bests, sessionVolume, dayTotals,
  dayItems, habitStatus, targets, adaptiveTDEE, checkin, profileComplete,
} from './calc.js';
import { MEALS } from '../data/foods.js';
import { setText } from './workout.js';
import { lineChart, barChart } from './ui.js';
import {
  esc, fmt, todayKey, addDays, daysBetween, parseKey, mondayOf, fmtDate, relDay, avg, sum, DAY_SHORT,
} from './util.js';

const SEGS = [['body', 'Body'], ['strength', 'Strength'], ['habits', 'Habits'], ['review', 'Review']];

export function renderProgress(el) {
  let h = `<div class="top"><div><div class="eyebrow">${esc(fmtDate(todayKey()))}</div><div class="title">Progress</div></div></div>
    <div class="seg">${SEGS.map(([k, l]) => `<button class="${view.progSeg === k ? 'on' : ''}" data-a="progSeg" data-s="${k}">${l}</button>`).join('')}</div>`;
  h += { body: bodyHTML, strength: strengthHTML, habits: habitsHTML, review: reviewHTML }[view.progSeg]();
  el.innerHTML = h;
}
register({
  progSeg: el => { view.progSeg = el.dataset.s; render(); },
  weightRange: el => { view.weightRange = +el.dataset.r; render(); },
  strengthEx: el => { view.strengthEx = el.value; render(); },
  reviewWeek: el => {
    const n = addDays(view.reviewWeek, +el.dataset.d * 7);
    if (n > mondayOf(todayKey())) return;
    view.reviewWeek = n; render();
  },
});

const xOf = date => daysBetween('2020-01-01', date);
function dateLabels(from, to) {
  const span = daysBetween(from, to);
  const step = Math.max(1, Math.round(span / 4));
  const out = [];
  for (let i = 0; i <= span; i += step) {
    const d = addDays(from, i);
    out.push({ x: xOf(d), label: parseKey(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) });
  }
  return out;
}

// ═══════════════ body ═══════════════
function bodyHTML() {
  const range = view.weightRange;
  const from = range ? addDays(todayKey(), -range + 1) : (weightSeries()[0]?.date || todayKey());
  const raw = weightSeries().filter(p => p.date >= from);
  const trend = weightTrend().filter(p => p.date >= from);
  const now = trendAt(todayKey());
  const wk = trendAt(addDays(todayKey(), -7));
  const mo = trendAt(addDays(todayKey(), -30));
  const d7 = now != null && wk != null ? now - wk : null;
  const d30 = now != null && mo != null ? now - mo : null;
  const sign = v => (v == null ? '–' : (v > 0 ? '+' : '') + v.toFixed(1));

  let h = `<div class="card"><div class="ch">Weight <small>dots = daily · line = 7-day average</small></div>
    <div class="chips" style="margin-bottom:8px">${[[30, '30 days'], [90, '90 days'], [0, 'All']].map(([r, l]) => `<button class="chip ${range === r ? 'sel' : ''}" data-a="weightRange" data-r="${r}">${l}</button>`).join('')}</div>
    ${raw.length ? lineChart([
      { points: raw.map(p => ({ x: xOf(p.date), y: p.v })), color: '#98989F', dots: true, line: false },
      { points: trend.map(p => ({ x: xOf(p.date), y: p.v })), color: '#A6FF00' },
    ], { xLabels: dateLabels(from, todayKey()), unit: ' kg' }) : '<div class="empty">Log your weight in the morning check-in to see your trend.</div>'}
    </div>
    <div class="grid3"><div class="st"><div class="l">Trend weight</div><div class="v">${now != null ? now.toFixed(1) : '–'}<span class="muted"> kg</span></div></div>
    <div class="st"><div class="l">7 days</div><div class="v ${d7 != null && d7 <= 0 ? 'c-green' : 'c-orange'}">${sign(d7)}</div></div>
    <div class="st"><div class="l">30 days</div><div class="v ${d30 != null && d30 <= 0 ? 'c-green' : 'c-orange'}">${sign(d30)}</div></div></div>`;

  const ws = waistSeries();
  h += `<div class="card"><div class="ch">Waist <small>measure Sunday mornings at the navel</small></div>
    ${ws.length ? lineChart([{ points: ws.map(p => ({ x: xOf(p.date), y: p.v })), color: '#00E5F0', dots: true }], { xLabels: ws.length > 1 ? dateLabels(ws[0].date, ws[ws.length - 1].date) : [], unit: ' cm' }) : '<div class="empty">Add waist in the check-in (weekly is enough).</div>'}
    ${ws.length > 1 ? `<div class="muted" style="margin-top:6px">Change since first: <b class="${ws[ws.length - 1].v <= ws[0].v ? 'c-green' : 'c-orange'}">${sign(ws[ws.length - 1].v - ws[0].v)} cm</b></div>` : ''}</div>`;

  h += `<div class="tip"><b>Reading a recomp:</b> waist going down while weight stays about the same (or drops slowly) means you’re losing fat and keeping or gaining muscle. Aim for 0.25–0.5 kg/week loss at most.</div>`;

  const t = targets();
  const ad = adaptiveTDEE();
  h += `<div class="card"><div class="ch">Energy balance</div>
    ${profileComplete() ? `<div class="mini"><div><b>${fmt(t.bmr)}</b>BMR</div><div><b>${fmt(t.tdee)}</b>Est. burn</div><div><b>${fmt(t.kcal)}</b>Target</div><div><b>${t.protein} g</b>Protein</div></div>` : '<div class="muted">Set up your profile to see targets.</div>'}
    ${ad ? `<div class="hr"></div><div class="muted">Based on the last ${ad.days} days you ate ~<b style="color:var(--t1)">${fmt(ad.intake)}</b> kcal and your trend moved <b style="color:var(--t1)">${ad.kgPerWeek.toFixed(2)} kg/week</b>, so your real burn is about <b class="c-green">${fmt(ad.tdee)} kcal</b>.</div>` : '<div class="hr"></div><div class="muted">After 3 weeks of logging weight + food, this card estimates your real maintenance calories.</div>'}</div>`;
  return h;
}

// ═══════════════ strength ═══════════════
function strengthHTML() {
  const used = [...new Set(S.sessions.flatMap(s => s.exercises.map(e => e.ex)))];
  if (!used.length) return `<div class="card empty">Finish a workout to see strength trends and personal records.</div>`;
  if (!view.strengthEx || !used.includes(view.strengthEx)) view.strengthEx = used[0];
  const ex = exById(view.strengthEx);
  const opts = allExercises().filter(e => used.includes(e.id));

  const pts = [];
  const rows = [];
  for (const s of S.sessions) {
    const e = s.exercises.find(x => x.ex === ex.id);
    if (!e) continue;
    const done = e.sets.filter(x => x.done);
    if (!done.length) continue;
    let y;
    if (ex.type === 'strength') y = Math.max(...done.map(x => e1rm(x.kg, x.reps)));
    else if (ex.type === 'bodyweight') y = Math.max(...done.map(x => x.reps || 0));
    else if (ex.type === 'timed') y = Math.max(...done.map(x => x.sec || 0));
    else y = sum(done.map(x => x.min || 0));
    pts.push({ x: xOf(s.date), y });
    rows.push({ s, done });
  }
  const b = bests(ex.id);
  const metric = { strength: 'Best estimated 1-rep max (kg)', bodyweight: 'Most reps in a set', timed: 'Longest hold (s)', cardio: 'Total minutes', rounds: 'Total minutes' }[ex.type];

  let h = `<select class="search" data-in="strengthEx">${opts.map(o => `<option value="${o.id}" ${o.id === ex.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select>
    <div class="card"><div class="ch">${esc(ex.name)} <small>${metric}</small></div>
    ${lineChart([{ points: pts, color: '#00E5F0', dots: true }], { xLabels: pts.length > 1 ? dateLabels(rows[0].s.date, rows[rows.length - 1].s.date) : [], dp: ex.type === 'strength' ? 1 : 0 })}</div>`;

  h += `<div class="grid3">`;
  if (ex.type === 'strength') {
    h += `<div class="st"><div class="l">Heaviest</div><div class="v">${fmt(b.kg, 1)} kg</div></div><div class="st"><div class="l">Best e1RM</div><div class="v">${fmt(b.e1rm, 1)}</div></div>`;
  } else if (ex.type === 'bodyweight') h += `<div class="st"><div class="l">Most reps</div><div class="v">${b.reps}</div></div><div class="st"><div class="l">Added kg</div><div class="v">${fmt(b.kg, 1)}</div></div>`;
  else if (ex.type === 'timed') h += `<div class="st"><div class="l">Longest</div><div class="v">${b.sec}s</div></div><div class="st"><div class="l">&nbsp;</div><div class="v">&nbsp;</div></div>`;
  else h += `<div class="st"><div class="l">Longest</div><div class="v">${b.min} min</div></div><div class="st"><div class="l">Distance</div><div class="v">${fmt(b.km, 1)} km</div></div>`;
  h += `<div class="st"><div class="l">Sessions</div><div class="v">${rows.length}</div></div></div>`;

  h += `<div class="card"><div class="ch">History</div>${rows.slice(-15).reverse().map(({ s, done }) => `<div class="li"><div class="grow"><div class="t">${relDay(s.date)}</div><div class="s">${done.map(x => setText(ex, x) + (x.pr?.length ? ' 🏆' : '')).join(' · ')}</div></div></div>`).join('')}</div>`;

  // all-time PR board
  const board = opts.filter(o => o.type === 'strength').map(o => ({ o, b: bests(o.id) })).filter(x => x.b.kg).sort((a, b) => b.b.e1rm - a.b.e1rm);
  if (board.length) {
    h += `<div class="card"><div class="ch">🏆 Records board <small>heaviest · e1RM</small></div>${board.map(({ o, b }) => `<div class="li"><div class="grow t">${esc(o.name)}</div><div class="k">${fmt(b.kg, 1)} kg<span style="color:var(--t2)">${fmt(b.e1rm, 1)} e1RM</span></div></div>`).join('')}</div>`;
  }
  return h;
}

// ═══════════════ habits ═══════════════
function habitsHTML() {
  const end = todayKey();
  const start = addDays(mondayOf(end), -7 * 7); // 8 weeks, aligned to Monday
  let h = '';
  for (const hb of S.habits) {
    let cells = '', done30 = 0;
    const days = daysBetween(start, end) + 1;
    // column-major: each column is a week (Mon→Sun)
    const grid = [];
    for (let i = 0; i < 56; i++) {
      const d = addDays(start, i);
      const on = d <= end && habitStatus(hb, d).done;
      grid.push(d > end ? 'fut' : on ? 'on' : '');
    }
    for (let i = 0; i < 30; i++) if (habitStatus(hb, addDays(end, -i)).done) done30++;
    for (let row = 0; row < 7; row++) for (let w = 0; w < 8; w++) cells += `<i class="${grid[w * 7 + row]}"></i>`;
    h += `<div class="card"><div class="ch">${hb.icon} ${esc(hb.name)} <small>${Math.round((done30 / 30) * 100)}% last 30 days</small></div>
      <div class="row" style="align-items:flex-start;gap:8px"><div style="display:grid;grid-template-rows:repeat(7,1fr);gap:3px;font-size:9px;color:var(--t3)">${DAY_SHORT.map(d => `<span style="line-height:1">${d[0]}</span>`).join('')}</div>
      <div class="heat grow" style="grid-template-columns:repeat(8,1fr)">${cells}</div></div></div>`;
  }
  return h + `<div class="muted" style="text-align:center;margin:6px 0 12px">Manage habits in Settings ⚙︎</div>`;
}

// ═══════════════ weekly review ═══════════════
export function weekStats(mon) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i)).filter(d => d <= todayKey());
  const t = targets();
  const foodDays = days.filter(d => dayTotals(d).count);
  const totals = foodDays.map(dayTotals);
  const proteinDays = foodDays.filter(d => dayTotals(d).p >= t.protein * 0.95).length;
  const sessions = S.sessions.filter(s => s.date >= mon && s.date <= addDays(mon, 6));
  const planned = S.program.filter(d => !d.rest && d.items.length).length;
  const prs = sum(sessions.map(s => sum(s.exercises.map(e => e.sets.filter(x => x.pr?.length).length))));
  const volume = sum(sessions.map(sessionVolume));
  const prevMon = addDays(mon, -7);
  const prevVolume = sum(S.sessions.filter(s => s.date >= prevMon && s.date < mon).map(sessionVolume));

  // foods
  const counts = new Map();
  let junk = 0;
  for (const d of days) for (const it of dayItems(d)) {
    counts.set(it.name, (counts.get(it.name) || 0) + 1);
    if (it.tag === 'j') junk++;
  }
  const topFoods = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const junkItems = [...new Set(days.flatMap(d => dayItems(d).filter(i => i.tag === 'j').map(i => i.name)))];
  const skipped = {};
  for (const m of MEALS) skipped[m.id] = foodDays.filter(d => !((S.food[d] || {})[m.id] || []).length).length;

  const wEnd = trendAt(days[days.length - 1] || mon);
  const wStart = trendAt(addDays(mon, -1));
  const waistNow = waistSeries().filter(p => p.date <= addDays(mon, 6)).pop();
  const waistPrev = waistSeries().filter(p => p.date < mon).pop();

  const cks = days.map(checkin);
  const sleep = avg(cks.map(c => c.sleepH).filter(Boolean));
  const steps = avg(cks.map(c => c.steps).filter(Boolean));

  const habitPct = S.habits.length && days.length
    ? sum(days.map(d => S.habits.filter(h => habitStatus(h, d).done).length)) / (S.habits.length * days.length)
    : null;
  const lowProteinDays = foodDays.filter(d => dayTotals(d).p < t.protein * 0.95).map(d => DAY_SHORT[daysBetween(mon, d)]);

  return {
    days, t, foodDays, avgKcal: avg(totals.map(x => x.kcal)), avgP: avg(totals.map(x => x.p)), proteinDays,
    sessions, planned, prs, volume, prevVolume, topFoods, junk, junkItems, skipped, wEnd, wStart,
    waistDelta: waistNow && waistPrev ? waistNow.v - waistPrev.v : null, sleep, steps, habitPct, lowProteinDays,
    kcalByDay: days.map(d => ({ d, v: dayTotals(d).kcal })),
  };
}

export function suggestions(w) {
  const out = [];
  const wd = w.wEnd != null && w.wStart != null ? w.wEnd - w.wStart : null;
  if (w.foodDays.length >= 3 && w.proteinDays < 5) {
    out.push({ cls: 'warn', t: `<b>Protein:</b> hit on only ${w.proteinDays} of ${w.foodDays.length} logged days${w.lowProteinDays.length ? ` (missed ${w.lowProteinDays.join(', ')})` : ''}. Add eggs at breakfast or a whey shake in the evening — that’s an easy 25–40 g.` });
  }
  if (w.avgKcal && w.avgKcal > w.t.kcal * 1.1) out.push({ cls: 'warn', t: `<b>Calories:</b> averaging ${fmt(w.avgKcal)} vs a target of ${fmt(w.t.kcal)}. Trim ~${fmt(round10(w.avgKcal - w.t.kcal))} kcal/day — usually snacks, oil or rice portions.` });
  if (w.avgKcal && w.avgKcal < w.t.kcal * 0.8) out.push({ cls: 'warn', t: `<b>Under-eating:</b> averaging ${fmt(w.avgKcal)} kcal. Eating too little makes it hard to build muscle — aim closer to ${fmt(w.t.kcal)}.` });
  if (wd != null && w.t.weight && wd < -0.01 * w.t.weight) out.push({ cls: 'warn', t: `<b>Losing fast:</b> ${wd.toFixed(1)} kg this week. For a recomp, add ~150 kcal/day so you keep your muscle.` });
  if (wd != null && wd > 0.3 && (w.waistDelta ?? 0) >= 0) out.push({ cls: 'warn', t: `<b>Weight creeping up</b> (+${wd.toFixed(1)} kg) without a smaller waist. Cut ~150 kcal/day next week.` });
  if (wd != null && Math.abs(wd) <= 0.3 && w.waistDelta != null && w.waistDelta < 0) out.push({ cls: 'good', t: `<b>Recomp is working:</b> weight steady and waist down ${Math.abs(w.waistDelta).toFixed(1)} cm. Keep doing exactly this.` });
  if (w.sessions.length < w.planned && w.days.length === 7) out.push({ cls: 'warn', t: `<b>Training:</b> ${w.sessions.length} of ${w.planned} planned workouts. Consistency beats intensity — book the sessions like meetings.` });
  if (w.junk >= 4) out.push({ cls: 'warn', t: `<b>Junk food:</b> ${w.junk} items this week (${w.junkItems.slice(0, 3).join(', ')}). Pick one to swap — e.g. roasted chana or fruit instead of fried snacks.` });
  if (w.sleep && w.sleep < 7) out.push({ cls: 'warn', t: `<b>Sleep:</b> averaging ${w.sleep.toFixed(1)} h. Under 7 h hurts recovery and appetite control — try lights-out 30 min earlier.` });
  if (w.skipped.breakfast >= 3) out.push({ cls: '', t: `<b>Breakfast skipped ${w.skipped.breakfast}×.</b> If that leads to big evening meals, a protein breakfast (eggs, pesarattu, curd) helps.` });
  if (w.prs) out.push({ cls: 'good', t: `<b>${w.prs} personal record${w.prs > 1 ? 's' : ''}</b> this week — you’re getting stronger. 💪` });
  if (w.volume && w.prevVolume && w.volume > w.prevVolume * 1.05) out.push({ cls: 'good', t: `<b>Volume up ${Math.round((w.volume / w.prevVolume - 1) * 100)}%</b> vs last week. Progressive overload in action.` });
  if (!out.length) out.push({ cls: 'good', t: w.foodDays.length ? '<b>Solid week.</b> Nothing to fix — keep the same plan next week.' : '<b>Log food and check-ins</b> through the week and this review will tell you what to adjust.' });
  return out.slice(0, 4);
}
const round10 = v => Math.round(v / 10) * 10;

function reviewHTML() {
  const mon = view.reviewWeek;
  const w = weekStats(mon);
  const wd = w.wEnd != null && w.wStart != null ? w.wEnd - w.wStart : null;
  const thisWeek = mon === mondayOf(todayKey());
  let h = `<div class="row between" style="margin-bottom:10px"><button class="icon-btn" data-a="reviewWeek" data-d="-1">‹</button>
    <div style="text-align:center"><div style="font-weight:800">${parseKey(mon).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${parseKey(addDays(mon, 6)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div><div class="muted" style="font-size:12px">${thisWeek ? 'This week (so far)' : 'Weekly review'}</div></div>
    <button class="icon-btn" data-a="reviewWeek" data-d="1" ${thisWeek ? 'style="opacity:.3"' : ''}>›</button></div>`;

  const sg = v => (v == null ? '–' : (v > 0 ? '+' : '') + v.toFixed(1));
  h += `<div class="grid3">
    <div class="st"><div class="l">Weight</div><div class="v ${wd != null && wd <= 0 ? 'c-green' : 'c-orange'}">${sg(wd)}<span class="muted"> kg</span></div></div>
    <div class="st"><div class="l">Waist</div><div class="v ${w.waistDelta != null && w.waistDelta <= 0 ? 'c-green' : 'c-orange'}">${sg(w.waistDelta)}<span class="muted"> cm</span></div></div>
    <div class="st"><div class="l">Workouts</div><div class="v">${w.sessions.length} / ${w.planned}</div></div>
    <div class="st"><div class="l">Protein days</div><div class="v c-blue">${w.proteinDays} / ${w.foodDays.length || '–'}</div></div>
    <div class="st"><div class="l">Avg kcal</div><div class="v c-pink">${w.avgKcal ? fmt(w.avgKcal) : '–'}</div></div>
    <div class="st"><div class="l">Habits</div><div class="v c-orange">${w.habitPct != null ? Math.round(w.habitPct * 100) + '%' : '–'}</div></div>
    <div class="st"><div class="l">Volume</div><div class="v">${fmt(w.volume / 1000, 1)}<span class="muted"> t</span></div></div>
    <div class="st"><div class="l">Avg sleep</div><div class="v c-purple">${w.sleep ? w.sleep.toFixed(1) + 'h' : '–'}</div></div>
    <div class="st"><div class="l">Avg steps</div><div class="v c-cyan">${w.steps ? fmt(w.steps / 1000, 1) + 'k' : '–'}</div></div></div>`;

  h += `<div class="card"><div class="ch">Calories by day <small>dashed = target ${fmt(w.t.kcal)}</small></div>
    ${barChart(Array.from({ length: 7 }, (_, i) => { const d = addDays(mon, i); const v = d <= todayKey() ? dayTotals(d).kcal : 0; return { label: DAY_SHORT[i][0] + DAY_SHORT[i].slice(1).toLowerCase(), v, color: v > w.t.kcal * 1.1 ? '#FF9F0A' : '#FA114F' }; }), { target: w.t.kcal })}</div>`;

  h += `<div class="sec-title" style="margin-top:6px">Next week</div>${suggestions(w).map(s => `<div class="tip ${s.cls}">${s.t}</div>`).join('')}`;

  h += `<div class="card"><div class="ch">Most eaten <small>${w.junk ? `🍟 junk: ${w.junk}×` : '✓ no junk'}</small></div>
    ${w.topFoods.length ? w.topFoods.map(([n, c]) => `<div class="li"><div class="grow t">${esc(n)}</div><div class="muted">${c}×</div></div>`).join('') : '<div class="empty">No food logged this week.</div>'}</div>`;

  if (w.foodDays.length) {
    h += `<div class="card"><div class="ch">Meal pattern <small>days a meal wasn’t logged</small></div><div class="mini">${MEALS.map(m => `<div><b>${w.skipped[m.id]}</b>${m.name}</div>`).join('')}</div></div>`;
  }

  h += `<div class="card"><div class="ch">Workouts</div>${w.sessions.length ? w.sessions.map(s => `<div class="li tap" data-a="sessionDetail" data-id="${s.id}"><div class="grow"><div class="t">${esc(s.name)}</div><div class="s">${relDay(s.date)}</div></div><div class="k">${fmt(sessionVolume(s))}<span style="color:var(--t2)">kg</span></div></div>`).join('') : '<div class="empty">No workouts this week.</div>'}</div>`;
  return h;
}
