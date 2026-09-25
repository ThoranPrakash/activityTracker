// Entry point: load data, migrate, wire up tabs and global event delegation.

import { S, loadAll, save, hasOldData, migrateOld } from './store.js';
import { view, actions, register, setRender } from './core.js';
import { renderToday } from './today.js';
import { renderWorkout } from './workout.js';
import { renderFood } from './food.js';
import { renderProgress } from './progress.js';
import './settings.js';
import { closeSheet } from './ui.js';
import { $, $$, todayKey, toast } from './util.js';

const RENDER = { today: renderToday, workout: renderWorkout, food: renderFood, progress: renderProgress };
let lastTab = null;

function render() {
  for (const t of Object.keys(RENDER)) $('#screen-' + t).classList.toggle('active', t === view.tab);
  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.t === view.tab));
  RENDER[view.tab]($('#screen-' + view.tab));
  if (lastTab !== view.tab) { window.scrollTo(0, 0); lastTab = view.tab; }
}
setRender(render);

register({
  tab: el => {
    view.tab = el.dataset.t;
    if (view.tab === 'food') view.foodDate = view.foodDate || todayKey();
    render();
  },
  closeSheet,
});

// ── global event delegation ──
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.a];
  if (fn) { e.preventDefault(); fn(el, e); }
});
const onInput = e => {
  const el = e.target.closest('[data-in]');
  if (!el) return;
  const fn = actions[el.dataset.in];
  if (fn) fn(el, e);
};
document.addEventListener('input', onInput);
document.addEventListener('change', e => { if (e.target.tagName === 'SELECT') onInput(e); });
$('#overlay').addEventListener('click', closeSheet);

// ── day rollover: re-render when the app comes back after midnight ──
let renderedDay = todayKey();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && todayKey() !== renderedDay) {
    renderedDay = todayKey();
    view.foodDate = renderedDay;
    render();
  }
});

// ── boot ──
loadAll();
if (!S.meta.migrated && hasOldData()) {
  const r = migrateOld();
  if (r.checkins || r.sessions || r.habits) setTimeout(() => toast(`Imported ${r.checkins} days + ${r.sessions} workouts from the old app`), 600);
} else if (!S.meta.migrated) {
  S.meta.migrated = true;
  save('meta');
}
if (S.active) view.tab = 'workout';
render();

// ── offline support ──
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
