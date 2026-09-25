// Small shared helpers: dates (always local time), formatting, DOM.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const pad = n => String(n).padStart(2, '0');

/** Local-time date key "YYYY-MM-DD". Never use toISOString() for this — it's UTC. */
export function dkey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const todayKey = () => dkey(new Date());
export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(k, n) {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dkey(d);
}
export function daysBetween(a, b) {
  return Math.round((parseKey(b) - parseKey(a)) / 86400000);
}
/** Monday = 0 … Sunday = 6 */
export const weekdayIdx = k => (parseKey(k).getDay() + 6) % 7;
export const mondayOf = k => addDays(k, -weekdayIdx(k));
export const DAY_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const DAY_NAME = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function fmtDate(k, opts = { weekday: 'long', day: 'numeric', month: 'short' }) {
  return parseKey(k).toLocaleDateString('en-GB', opts);
}
export function relDay(k) {
  const t = todayKey();
  if (k === t) return 'Today';
  if (k === addDays(t, -1)) return 'Yesterday';
  if (k === addDays(t, 1)) return 'Tomorrow';
  return fmtDate(k, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmt(n, dp = 0) {
  if (n == null || !isFinite(n)) return '–';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
export const round = (n, step = 1) => Math.round(n / step) * step;
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const num = v => (v === '' || v == null || isNaN(+v) ? null : +v);
export function mmss(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
export const avg = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
export const sum = arr => arr.reduce((a, b) => a + b, 0);

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function haptic(pattern = 10) {
  try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) { /* unsupported */ }
}

let toastTimer;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

export function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch (e) { /* audio unavailable */ }
}
