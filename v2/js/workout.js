// Workout tab: weekly plan, live session logging (Strong/Hevy style),
// rest timer, PRs, exercise library, plan editor, history.

import { S, save } from './store.js';
import { view, register, render } from './core.js';
import {
  allExercises, exById, restFor, lastPerformance, bests, setPRs, suggestion, sessionVolume, e1rm,
} from './calc.js';
import { EX_GROUPS } from '../data/exercises.js';
import { DEFAULT_PROGRAM } from '../data/program.js';
import { openSheet, closeSheet, setSheetBody } from './ui.js';
import {
  $, esc, fmt, uid, todayKey, weekdayIdx, mondayOf, addDays, DAY_SHORT, DAY_NAME, mmss, relDay, toast,
  haptic, beep, num, sum,
} from './util.js';

const UNIT = { strength: 'kg × reps', bodyweight: 'reps', timed: 'sec', cardio: 'min', rounds: 'min / round' };

function rangeText(item, ex) {
  if (!item) return '';
  const r = item.lo === item.hi ? `${item.lo}` : `${item.lo}–${item.hi}`;
  if (ex.type === 'timed') return `${item.sets} × ${r} s`;
  if (ex.type === 'cardio') return `${r} min`;
  if (ex.type === 'rounds') return `${item.sets} rounds × ${r} min`;
  return `${item.sets} × ${r}`;
}

// ═══════════════ rest timer ═══════════════
const rest = { end: 0, total: 0, timer: null };
export function startRest(sec) {
  if (!sec) return;
  rest.total = sec;
  rest.end = Date.now() + sec * 1000;
  clearInterval(rest.timer);
  rest.timer = setInterval(tickRest, 250);
  tickRest();
}
function tickRest() {
  const el = $('#rest');
  const left = (rest.end - Date.now()) / 1000;
  if (left <= 0) {
    clearInterval(rest.timer);
    el.classList.remove('show');
    if (rest.total) { haptic([200, 100, 200]); beep(); toast('💪 Rest done — next set'); }
    rest.total = 0;
    return;
  }
  el.classList.add('show');
  el.querySelector('.time').textContent = mmss(left);
  el.querySelector('.prog').style.width = `${(1 - left / rest.total) * 100}%`;
}
register({
  restAdd: el => { rest.end += +el.dataset.s * 1000; rest.total += +el.dataset.s; tickRest(); },
  restSkip: () => { rest.total = 0; rest.end = 0; tickRest(); },
});

// ═══════════════ session model ═══════════════
function newEntry(exId, item) {
  const ex = exById(exId);
  const n = item?.sets || (ex.type === 'cardio' ? 1 : 3);
  const sugg = suggestion(item, ex);
  return {
    ex: exId, item: item || null, note: '',
    sets: Array.from({ length: n }, () => ({ done: false, ...(sugg?.kg ? { kg: sugg.kg } : {}) })),
  };
}

function startSession(dayIdx) {
  if (S.active) { view.tab = 'workout'; render(); return; }
  const day = dayIdx == null ? null : S.program[dayIdx];
  S.active = {
    id: uid(), date: todayKey(), day: dayIdx, name: day ? day.name : 'Workout', start: Date.now(),
    exercises: day ? day.items.map(it => newEntry(it.ex, it)) : [],
  };
  save('active');
  view.tab = 'workout';
  closeSheet();
  render();
  window.scrollTo(0, 0);
}

/** Placeholder (from last session / plan) for set j of an entry. */
function placeholder(entry, j) {
  const ex = exById(entry.ex);
  const last = lastPerformance(entry.ex, S.active?.start ?? Infinity);
  const ls = last ? last.entry.sets.filter(s => s.done) : [];
  const p = ls[j] || ls[ls.length - 1] || {};
  const it = entry.item || {};
  switch (ex.type) {
    case 'strength': return { kg: p.kg ?? '', reps: p.reps ?? it.lo ?? '' };
    case 'bodyweight': return { kg: p.kg || '', reps: p.reps ?? it.lo ?? '' };
    case 'timed': return { sec: p.sec ?? it.lo ?? '' };
    case 'cardio': return { min: p.min ?? it.lo ?? '', km: p.km ?? '' };
    case 'rounds': return { min: p.min ?? it.lo ?? 3 };
    default: return {};
  }
}
function prevText(entry, j) {
  const ex = exById(entry.ex);
  const last = lastPerformance(entry.ex, S.active?.start ?? Infinity);
  if (!last) return '—';
  const ls = last.entry.sets.filter(s => s.done);
  const p = ls[j];
  if (!p) return '—';
  return setText(ex, p);
}
export function setText(ex, s) {
  switch (ex.type) {
    case 'strength': return `${fmt(s.kg, s.kg % 1 ? 1 : 0)} × ${s.reps}`;
    case 'bodyweight': return `${s.kg ? '+' + s.kg + 'kg × ' : ''}${s.reps}`;
    case 'timed': return `${s.sec}s`;
    case 'cardio': return `${s.min} min${s.km ? ' · ' + s.km + ' km' : ''}`;
    case 'rounds': return `${s.min} min`;
    default: return '';
  }
}
const FIELDS = {
  strength: [['kg', 'KG', 'decimal'], ['reps', 'REPS', 'numeric']],
  bodyweight: [['kg', '+KG', 'decimal'], ['reps', 'REPS', 'numeric']],
  timed: [['sec', 'SEC', 'numeric']],
  cardio: [['min', 'MIN', 'decimal'], ['km', 'KM', 'decimal']],
  rounds: [['min', 'MIN', 'decimal']],
};

// ═══════════════ render ═══════════════
let elapsedTimer = null;
export function renderWorkout(el) {
  clearInterval(elapsedTimer);
  if (S.active) {
    el.innerHTML = sessionHTML();
    elapsedTimer = setInterval(() => {
      const e = $('#sess-elapsed');
      if (!e || !S.active) return clearInterval(elapsedTimer);
      e.textContent = mmss((Date.now() - S.active.start) / 1000);
    }, 1000);
    return;
  }
  el.innerHTML = overviewHTML();
}

function overviewHTML() {
  const t = todayKey();
  const di = weekdayIdx(t);
  const day = S.program[di];
  const doneToday = S.sessions.filter(s => s.date === t);
  const mon = mondayOf(t);
  let h = `<div class="top"><div><div class="eyebrow">${relDay(t)} · ${DAY_NAME[di]}</div><div class="title">Workout</div></div>
    <button class="icon-btn" data-a="openLibrary" data-mode="browse" aria-label="Exercise library">☰</button></div>`;

  // today card
  h += `<div class="card"><div class="ch"><span>${esc(day.name)}</span><small>${esc(day.focus || '')}</small></div>`;
  if (doneToday.length) {
    h += doneToday.map(s => `<div class="note" style="margin:0 0 10px;color:var(--green)">✓ Done: ${esc(s.name)} · ${mmss((s.end - s.start) / 1000)} · ${fmt(sessionVolume(s))} kg volume</div>`).join('');
  }
  if (day.items.length) {
    h += day.items.map(it => { const ex = exById(it.ex); return `<div class="li"><div class="grow"><div class="t">${esc(ex.name)}</div></div><div class="muted">${rangeText(it, ex)}</div></div>`; }).join('');
    h += `<div style="height:10px"></div><button class="btn" data-a="startDay" data-d="${di}">${doneToday.length ? 'Start again' : 'Start workout'}</button>`;
  } else {
    h += `<div class="muted" style="margin-bottom:10px">Rest day — recover, walk, stretch. Want to train anyway?</div>
      <button class="btn ghost" data-a="startEmpty">Start an empty workout</button>`;
  }
  h += `</div>`;

  h += `<div class="btn-row" style="margin-bottom:10px">
    <button class="btn dark" data-a="startEmpty">＋ Empty workout</button>
    <button class="btn dark" data-a="quickBoxing">🥊 Boxing / cardio</button></div>`;

  // week
  h += `<div class="sec-title">This week</div><div class="card">`;
  S.program.forEach((d, i) => {
    const date = addDays(mon, i);
    const done = S.sessions.some(s => s.date === date);
    h += `<div class="li tap" data-a="dayPreview" data-d="${i}">
      <div class="daybadge ${i === di ? 'today' : ''}">${DAY_SHORT[i]}</div>
      <div class="grow"><div class="t">${esc(d.name)}</div><div class="s">${d.items.length ? d.items.length + ' exercises' : 'Rest'}${d.focus ? ' · ' + esc(d.focus) : ''}</div></div>
      ${d.items.length && !d.rest ? `<span class="check ${done ? 'on' : ''}">${done ? '✓' : ''}</span>` : `<span class="dim">›</span>`}
    </div>`;
  });
  h += `</div>`;

  // history
  const hist = S.sessions.slice(-12).reverse();
  h += `<div class="sec-title">History</div><div class="card">`;
  h += hist.length ? hist.map(s => {
    const prs = sum(s.exercises.map(e => e.sets.filter(x => x.pr?.length).length));
    return `<div class="li tap" data-a="sessionDetail" data-id="${s.id}"><div class="grow"><div class="t">${esc(s.name)} ${prs ? `<span class="badge pr">🏆 ${prs}</span>` : ''}</div>
      <div class="s">${relDay(s.date)} · ${mmss((s.end - s.start) / 1000)} · ${s.exercises.length} exercises</div></div>
      <div class="k">${fmt(sessionVolume(s))}<span style="color:var(--t2)">kg</span></div></div>`;
  }).join('') : `<div class="empty">No workouts yet — your finished sessions appear here.</div>`;
  h += `</div>`;
  return h;
}

function sessionHTML() {
  const a = S.active;
  let h = `<div class="sess-top"><div><div class="eyebrow">${esc(a.name)}</div><div class="title num" id="sess-elapsed">${mmss((Date.now() - a.start) / 1000)}</div></div>
    <div class="row"><button class="btn sm dark" data-a="cancelSession">Discard</button><button class="btn sm" data-a="finishSession">Finish</button></div></div>`;
  if (!a.exercises.length) h += `<div class="card empty">Add exercises from the library to start logging.</div>`;
  a.exercises.forEach((e, i) => { h += exerciseCard(e, i); });
  h += `<button class="btn ghost" data-a="openLibrary" data-mode="session" style="margin-bottom:10px">＋ Add exercise</button>`;
  return h;
}

function exerciseCard(e, i) {
  const ex = exById(e.ex);
  const f = FIELDS[ex.type] || FIELDS.strength;
  const sugg = suggestion(e.item, ex);
  const hasPR = e.sets.some(s => s.pr?.length);
  let h = `<div class="card" id="ex-${i}"><div class="row between"><div class="exn">${esc(ex.name)} ${hasPR ? '<span class="badge pr">🏆 PR</span>' : ''}</div>
    <button class="icon-btn" style="width:30px;height:30px;font-size:14px" data-a="exMenu" data-i="${i}">⋯</button></div>
    <div class="muted" style="font-size:12px;margin-top:2px">${e.item ? 'Target ' + rangeText(e.item, ex) + ' · ' : ''}${UNIT[ex.type]}</div>
    <table class="sets"><tr><th>SET</th><th>PREVIOUS</th>${f.map(x => `<th>${x[1]}</th>`).join('')}<th>✓</th></tr>`;
  e.sets.forEach((s, j) => {
    const ph = placeholder(e, j);
    h += `<tr class="${s.done ? 'done' : ''}"><td class="n">${j + 1}</td><td class="p">${prevText(e, j)}</td>`;
    for (const [k, , mode] of f) {
      h += `<td><input type="number" inputmode="${mode}" step="any" value="${s[k] ?? ''}" placeholder="${ph[k] ?? ''}" data-in="setField" data-i="${i}" data-j="${j}" data-k="${k}"></td>`;
    }
    h += `<td><button class="tick" data-a="tickSet" data-i="${i}" data-j="${j}">✓</button></td></tr>`;
  });
  h += `</table>`;
  if (sugg && !e.sets.some(s => s.done)) h += `<div class="hint">💡 ${esc(sugg.text)}</div>`;
  if (e.note) h += `<div class="note">📝 ${esc(e.note)}</div>`;
  h += `<div class="row between" style="margin-top:10px"><button class="link" data-a="addSet" data-i="${i}">＋ Add ${ex.type === 'rounds' ? 'round' : 'set'}</button>
    ${e.sets.length > 1 ? `<button class="link red" data-a="removeSet" data-i="${i}">− Remove last</button>` : ''}</div></div>`;
  return h;
}

// ═══════════════ session actions ═══════════════
register({
  startDay: el => startSession(+el.dataset.d),
  startEmpty: () => startSession(null),
  quickBoxing: () => {
    startSession(null);
    S.active.name = 'Boxing / Cardio';
    save('active');
    openLibrary('session', 'Boxing');
  },
  setField: el => {
    const e = S.active?.exercises[+el.dataset.i];
    if (!e) return;
    e.sets[+el.dataset.j][el.dataset.k] = num(el.value);
    save('active');
  },
  tickSet: el => {
    const i = +el.dataset.i, j = +el.dataset.j;
    const e = S.active.exercises[i];
    const s = e.sets[j];
    const ex = exById(e.ex);
    if (s.done) {
      s.done = false; delete s.pr;
    } else {
      const ph = placeholder(e, j);
      for (const [k] of FIELDS[ex.type] || []) {
        if (s[k] == null && ph[k] !== '' && ph[k] != null) s[k] = +ph[k];
      }
      const needed = (FIELDS[ex.type] || [])[ex.type === 'strength' || ex.type === 'bodyweight' ? 1 : 0][0];
      if (!s[needed]) { toast('Enter ' + needed + ' first'); return; }
      s.done = true;
      haptic(15);
      // compare against history + earlier sets in this session
      const prev = bests(e.ex, S.active.start);
      e.sets.slice(0, j).filter(x => x.done).forEach(x => {
        prev.kg = Math.max(prev.kg, x.kg || 0); prev.reps = Math.max(prev.reps, x.reps || 0);
        prev.sec = Math.max(prev.sec, x.sec || 0); prev.km = Math.max(prev.km, x.km || 0);
        prev.e1rm = Math.max(prev.e1rm, e1rm(x.kg, x.reps));
      });
      const prs = setPRs(ex, s, prev);
      if (prs.length) { s.pr = prs; toast('🏆 New PR — ' + prs[0]); haptic([30, 50, 30]); }
      if (ex.type !== 'cardio') startRest(restFor(ex));
    }
    save('active');
    const card = $('#ex-' + i);
    if (card) card.outerHTML = exerciseCard(e, i);
  },
  addSet: el => {
    const e = S.active.exercises[+el.dataset.i];
    const last = e.sets[e.sets.length - 1] || {};
    e.sets.push({ done: false, ...(last.kg ? { kg: last.kg } : {}) });
    save('active');
    $('#ex-' + el.dataset.i).outerHTML = exerciseCard(e, +el.dataset.i);
  },
  removeSet: el => {
    const e = S.active.exercises[+el.dataset.i];
    e.sets.pop();
    save('active');
    $('#ex-' + el.dataset.i).outerHTML = exerciseCard(e, +el.dataset.i);
  },
  exMenu: el => {
    const i = +el.dataset.i;
    const e = S.active.exercises[i];
    openSheet(exById(e.ex).name, `
      <div class="field"><label>Note</label><input id="ex-note" value="${esc(e.note)}" placeholder="Seat height, grip, how it felt…"></div>
      <button class="btn dark" data-a="exNoteSave" data-i="${i}" style="margin-bottom:8px">Save note</button>
      <div class="btn-row" style="margin-bottom:8px"><button class="btn dark" data-a="exMove" data-i="${i}" data-d="-1">↑ Move up</button><button class="btn dark" data-a="exMove" data-i="${i}" data-d="1">↓ Move down</button></div>
      <button class="btn dark" data-a="exHistory" data-ex="${e.ex}" style="margin-bottom:8px">📈 History</button>
      <button class="btn danger" data-a="exRemove" data-i="${i}">Remove exercise</button>`);
  },
  exNoteSave: el => { S.active.exercises[+el.dataset.i].note = $('#ex-note').value.trim(); save('active'); closeSheet(); render(); },
  exMove: el => {
    const i = +el.dataset.i, j = i + +el.dataset.d;
    const xs = S.active.exercises;
    if (j < 0 || j >= xs.length) return;
    [xs[i], xs[j]] = [xs[j], xs[i]];
    save('active'); closeSheet(); render();
  },
  exRemove: el => { S.active.exercises.splice(+el.dataset.i, 1); save('active'); closeSheet(); render(); },
  exHistory: el => {
    view.tab = 'progress'; view.progSeg = 'strength'; view.strengthEx = el.dataset.ex;
    closeSheet(); render();
  },
  cancelSession: () => {
    if (!confirm('Discard this workout? Logged sets will be lost.')) return;
    S.active = null; save('active'); render();
  },
  finishSession: () => {
    const a = S.active;
    const exercises = a.exercises
      .map(e => ({ ex: e.ex, note: e.note, sets: e.sets.filter(s => s.done) }))
      .filter(e => e.sets.length);
    if (!exercises.length) {
      if (confirm('No sets ticked. Discard this workout?')) { S.active = null; save('active'); render(); }
      return;
    }
    const session = { id: a.id, date: a.date, day: a.day, name: a.name, start: a.start, end: Date.now(), exercises };
    S.sessions.push(session);
    S.active = null;
    rest.total = 0; rest.end = 0; tickRest();
    save('sessions', 'active');
    render();
    showSummary(session, true);
  },
});

function showSummary(s, fresh) {
  const prs = s.exercises.flatMap(e => e.sets.filter(x => x.pr?.length).map(x => ({ ex: exById(e.ex), s: x })));
  const sets = sum(s.exercises.map(e => e.sets.length));
  let h = `${fresh ? '<div style="text-align:center;font-size:44px;margin:4px 0 6px">🎉</div>' : ''}
    <div class="grid3"><div class="st"><div class="l">Duration</div><div class="v">${mmss((s.end - s.start) / 1000)}</div></div>
    <div class="st"><div class="l">Sets</div><div class="v">${sets}</div></div>
    <div class="st"><div class="l">Volume</div><div class="v">${fmt(sessionVolume(s))}<span class="muted"> kg</span></div></div></div>`;
  if (prs.length) {
    h += `<div class="card"><div class="ch">🏆 Personal records</div>${prs.map(p => `<div class="li"><div class="grow"><div class="t">${esc(p.ex.name)}</div><div class="s">${p.s.pr.join(', ')}</div></div><div class="k">${setText(p.ex, p.s)}</div></div>`).join('')}</div>`;
  }
  h += `<div class="card">${s.exercises.map(e => { const ex = exById(e.ex); return `<div class="li"><div class="grow"><div class="t">${esc(ex.name)}</div><div class="s">${e.sets.map(x => setText(ex, x)).join(' · ')}</div>${e.note ? `<div class="s">📝 ${esc(e.note)}</div>` : ''}</div></div>`; }).join('')}</div>`;
  if (!fresh) h += `<button class="btn danger" data-a="deleteSession" data-id="${s.id}">Delete workout</button>`;
  openSheet(fresh ? 'Workout complete' : `${s.name} · ${relDay(s.date)}`, h);
}
register({
  sessionDetail: el => { const s = S.sessions.find(x => x.id === el.dataset.id); if (s) showSummary(s, false); },
  deleteSession: el => {
    if (!confirm('Delete this workout from history?')) return;
    S.sessions = S.sessions.filter(x => x.id !== el.dataset.id);
    save('sessions'); closeSheet(); render();
  },
});

// ═══════════════ day preview + plan editor ═══════════════
register({
  dayPreview: el => {
    const i = +el.dataset.d, d = S.program[i];
    const body = `<div class="muted" style="margin-bottom:10px">${esc(d.focus || '')}</div>
      <div class="card">${d.items.length ? d.items.map(it => { const ex = exById(it.ex); return `<div class="li"><div class="grow t">${esc(ex.name)}</div><div class="muted">${rangeText(it, ex)}</div></div>`; }).join('') : '<div class="empty">Rest day</div>'}</div>
      ${d.items.length ? `<button class="btn" data-a="startDay" data-d="${i}" style="margin-bottom:8px">Start this workout</button>` : ''}
      <button class="btn dark" data-a="editDay" data-d="${i}">✎ Edit ${DAY_NAME[i]}</button>`;
    openSheet(`${DAY_NAME[i]} · ${d.name}`, body);
  },
  editDay: el => openPlanEditor(+el.dataset.d),
});

let editingDay = 0;
function openPlanEditor(i) {
  editingDay = i;
  openSheet(`Edit ${DAY_NAME[i]}`, planEditorHTML(), { onclose: render });
}
function planEditorHTML() {
  const d = S.program[editingDay];
  let h = `<div class="field"><label>Name</label><input value="${esc(d.name)}" data-in="planName"></div>
    <div class="field"><label>Focus</label><input value="${esc(d.focus || '')}" data-in="planFocus"></div>
    <div class="card">`;
  h += d.items.length ? d.items.map((it, k) => {
    const ex = exById(it.ex);
    const unit = ex.type === 'timed' ? 'sec' : ex.type === 'cardio' || ex.type === 'rounds' ? 'min' : 'reps';
    return `<div class="li" style="flex-wrap:wrap"><div class="grow"><div class="t">${esc(ex.name)}</div></div>
      <button class="link" data-a="planMove" data-k="${k}" data-d="-1">↑</button><button class="link" data-a="planMove" data-k="${k}" data-d="1">↓</button>
      <button class="link red" data-a="planRemove" data-k="${k}">✕</button>
      <div class="row" style="width:100%;gap:6px;font-size:13px;color:var(--t2)">
        ${ex.type === 'cardio' ? '' : `<input class="inp" style="width:56px;padding:6px;text-align:center" type="number" inputmode="numeric" value="${it.sets}" data-in="planField" data-k="${k}" data-f="sets"> ${ex.type === 'rounds' ? 'rounds' : 'sets'} ×`}
        <input class="inp" style="width:56px;padding:6px;text-align:center" type="number" inputmode="numeric" value="${it.lo}" data-in="planField" data-k="${k}" data-f="lo"> –
        <input class="inp" style="width:56px;padding:6px;text-align:center" type="number" inputmode="numeric" value="${it.hi}" data-in="planField" data-k="${k}" data-f="hi"> ${unit}
      </div></div>`;
  }).join('') : `<div class="empty">No exercises — this is a rest day.</div>`;
  h += `</div><button class="btn ghost" data-a="openLibrary" data-mode="plan" style="margin-bottom:8px">＋ Add exercise</button>
    <button class="btn dark" data-a="planResetDay">Reset ${DAY_NAME[editingDay]} to default</button>`;
  return h;
}
register({
  planName: el => { S.program[editingDay].name = el.value; save('program'); },
  planFocus: el => { S.program[editingDay].focus = el.value; save('program'); },
  planField: el => { const v = num(el.value); if (v != null) { S.program[editingDay].items[+el.dataset.k][el.dataset.f] = v; save('program'); } },
  planMove: el => {
    const xs = S.program[editingDay].items, k = +el.dataset.k, j = k + +el.dataset.d;
    if (j < 0 || j >= xs.length) return;
    [xs[k], xs[j]] = [xs[j], xs[k]];
    save('program'); setSheetBody(planEditorHTML());
  },
  planRemove: el => {
    const d = S.program[editingDay];
    d.items.splice(+el.dataset.k, 1);
    if (!d.items.length) d.rest = true;
    save('program'); setSheetBody(planEditorHTML());
  },
  planResetDay: () => {
    if (!confirm('Reset this day to the default plan?')) return;
    S.program[editingDay] = JSON.parse(JSON.stringify(DEFAULT_PROGRAM[editingDay]));
    save('program'); setSheetBody(planEditorHTML());
  },
});

// ═══════════════ exercise library ═══════════════
let lib = { mode: 'session', q: '', group: null };
function openLibrary(mode, group = null) {
  const returnToPlan = mode === 'plan';
  lib = { mode, q: '', group };
  openSheet(mode === 'browse' ? 'Exercise library' : 'Add exercise', libraryHTML(), {
    right: `<button class="link" data-a="newExercise">＋ Custom</button>`,
    onclose: returnToPlan ? () => setTimeout(() => openPlanEditor(editingDay), 0) : render,
  });
  setTimeout(() => $('#lib-q')?.focus(), 250);
}
function libraryHTML() {
  return `<input class="search" id="lib-q" placeholder="Search exercises…" value="${esc(lib.q)}" data-in="libSearch" autocomplete="off">
    <div class="chips scroll" style="margin-bottom:10px">${['All', ...EX_GROUPS].map(g => `<button class="chip ${((lib.group || 'All') === g) ? 'sel' : ''}" data-a="libGroup" data-g="${g}">${g}</button>`).join('')}</div>
    <div id="lib-list">${libraryList()}</div>`;
}
function libraryList() {
  const q = lib.q.trim().toLowerCase();
  const list = allExercises().filter(e => (!lib.group || e.group === lib.group) && (!q || e.name.toLowerCase().includes(q)));
  if (!list.length) return `<div class="empty">No match. Tap “＋ Custom” to create it.</div>`;
  let h = '', g = null;
  for (const e of list) {
    if (e.group !== g) { g = e.group; h += `<div class="lbl" style="margin:12px 2px 4px">${esc(g)}</div>`; }
    const last = lastPerformance(e.id);
    h += `<div class="li tap" data-a="libPick" data-ex="${e.id}"><div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${UNIT[e.type]}${last ? ' · last ' + relDay(last.session.date) : ''}</div></div><span class="link">${lib.mode === 'browse' ? '›' : '＋'}</span></div>`;
  }
  return h;
}
register({
  openLibrary: el => openLibrary(el.dataset.mode),
  libSearch: el => { lib.q = el.value; $('#lib-list').innerHTML = libraryList(); },
  libGroup: el => { lib.group = el.dataset.g === 'All' ? null : el.dataset.g; setSheetBody(libraryHTML()); },
  libPick: el => {
    const id = el.dataset.ex;
    const ex = exById(id);
    if (lib.mode === 'session') {
      S.active.exercises.push(newEntry(id, null));
      save('active');
      toast('Added ' + ex.name);
      closeSheet();
      setTimeout(() => $('#ex-' + (S.active.exercises.length - 1))?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    } else if (lib.mode === 'plan') {
      const d = S.program[editingDay];
      const dflt = { strength: [3, 8, 12], bodyweight: [3, 8, 15], timed: [3, 30, 60], cardio: [1, 20, 30], rounds: [5, 3, 3] }[ex.type];
      d.items.push({ ex: id, sets: dflt[0], lo: dflt[1], hi: dflt[2] });
      d.rest = false;
      save('program');
      toast('Added to ' + DAY_NAME[editingDay]);
      closeSheet();
    } else {
      view.tab = 'progress'; view.progSeg = 'strength'; view.strengthEx = id;
      closeSheet();
    }
  },
  newExercise: () => {
    setSheetBody(`<div class="field"><label>Name</label><input id="nx-name" placeholder="e.g. Kettlebell swing"></div>
      <div class="field"><label>What do you record?</label><select id="nx-type">
        <option value="strength">Weight × reps</option><option value="bodyweight">Reps (bodyweight)</option>
        <option value="timed">Time (seconds)</option><option value="cardio">Minutes + distance</option><option value="rounds">Rounds (minutes each)</option></select></div>
      <div class="field"><label>Group</label><select id="nx-group">${EX_GROUPS.map(g => `<option>${g}</option>`).join('')}</select></div>
      <button class="btn" data-a="saveExercise">Save exercise</button>`);
  },
  saveExercise: () => {
    const name = $('#nx-name').value.trim();
    if (!name) return toast('Enter a name');
    const ex = { id: 'cx_' + uid(), name, type: $('#nx-type').value, group: $('#nx-group').value, inc: 2.5 };
    S.customExercises.push(ex);
    save('customExercises');
    lib.q = ''; lib.group = null;
    setSheetBody(libraryHTML());
    toast('Created ' + name);
  },
});

export const hasActiveSession = () => !!S.active;
export { startSession };
