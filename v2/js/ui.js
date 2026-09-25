// Shared UI pieces: bottom sheet, rings, charts.

import { $, esc } from './util.js';

// ── bottom sheet ───────────────────────────────────────────
let onClose = null;
export function openSheet(title, body, { right = '', onclose } = {}) {
  $('#sheet-title').textContent = title;
  $('#sheet-right').innerHTML = right;
  $('#sheet-body').innerHTML = body;
  $('#sheet-body').scrollTop = 0;
  $('#overlay').classList.add('show');
  $('#sheet').classList.add('show');
  onClose = onclose || null;
}
export function setSheetBody(html) {
  $('#sheet-body').innerHTML = html;
}
export function closeSheet() {
  $('#overlay').classList.remove('show');
  $('#sheet').classList.remove('show');
  const cb = onClose;
  onClose = null;
  if (cb) cb();
}
export const sheetOpen = () => $('#sheet').classList.contains('show');

// ── activity rings ─────────────────────────────────────────
export function ringsSVG(rings, size = 150) {
  // rings: [{ pct, color, track }] outer → inner
  const stroke = size * 0.1;
  const c = size / 2;
  let out = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">`;
  rings.forEach((r, i) => {
    const rad = c - stroke / 2 - i * (stroke + 3);
    const circ = 2 * Math.PI * rad;
    const pct = Math.max(0, Math.min(1, r.pct || 0));
    out += `<circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${r.track}" stroke-width="${stroke}"/>`;
    if (pct > 0) out += `<circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${r.color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(circ * pct).toFixed(1)} ${circ.toFixed(1)}"/>`;
  });
  return out + '</svg>';
}

// ── line chart ─────────────────────────────────────────────
/**
 * series: [{ points: [{x: number, y: number}], color, dots?, width? }]
 * xLabels: [{x, label}]
 */
export function lineChart(series, { height = 150, xLabels = [], unit = '', dp = 1 } = {}) {
  const W = 340, H = height, pl = 30, pr = 8, pt = 10, pb = 20;
  const all = series.flatMap(s => s.points);
  if (all.length < 1) return `<div class="empty">Not enough data yet</div>`;
  let minX = Math.min(...all.map(p => p.x)), maxX = Math.max(...all.map(p => p.x));
  let minY = Math.min(...all.map(p => p.y)), maxY = Math.max(...all.map(p => p.y));
  if (maxX === minX) { minX -= 1; maxX += 1; }
  const padY = Math.max((maxY - minY) * 0.15, 0.5);
  minY -= padY; maxY += padY;
  const X = x => pl + ((x - minX) / (maxX - minX)) * (W - pl - pr);
  const Y = y => pt + (1 - (y - minY) / (maxY - minY)) * (H - pt - pb);
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}">`;
  for (let i = 0; i <= 3; i++) {
    const v = minY + ((maxY - minY) * i) / 3;
    svg += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2a2a2c"/>`;
    svg += `<text x="0" y="${Y(v) + 3}">${v.toFixed(dp)}</text>`;
  }
  xLabels.forEach(l => {
    const x = X(l.x);
    const anchor = x < pl + 20 ? 'start' : x > W - pr - 20 ? 'end' : 'middle';
    svg += `<text x="${x}" y="${H - 4}" text-anchor="${anchor}">${esc(l.label)}</text>`;
  });
  for (const s of series) {
    if (s.dots) {
      s.points.forEach(p => { svg += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="2.6" fill="${s.color}"/>`; });
    }
    if (s.line !== false && s.points.length > 1) {
      const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
      svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.5}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }
  const lastS = series[series.length - 1];
  const lp = lastS.points[lastS.points.length - 1];
  if (lp) svg += `<text x="${Math.min(X(lp.x), W - 40)}" y="${Math.max(Y(lp.y) - 8, 10)}" style="fill:${lastS.color};font-weight:700;font-size:11px">${lp.y.toFixed(dp)}${unit}</text>`;
  return svg + '</svg>';
}

/** Simple bar chart. bars: [{label, v, color}] */
export function barChart(bars, { height = 120, target = null } = {}) {
  const W = 340, H = height, pb = 18, pt = 8;
  const max = Math.max(...bars.map(b => b.v), target || 0, 1);
  const bw = (W / bars.length) * 0.6;
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}">`;
  bars.forEach((b, i) => {
    const cx = (W / bars.length) * (i + 0.5);
    const h = ((H - pb - pt) * b.v) / max;
    svg += `<rect x="${cx - bw / 2}" y="${H - pb - h}" width="${bw}" height="${Math.max(h, b.v ? 2 : 0)}" rx="4" fill="${b.color}"/>`;
    svg += `<text x="${cx}" y="${H - 4}" text-anchor="middle">${esc(b.label)}</text>`;
  });
  if (target) {
    const y = H - pb - ((H - pb - pt) * target) / max;
    svg += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="#98989F" stroke-dasharray="4 4"/>`;
  }
  return svg + '</svg>';
}
