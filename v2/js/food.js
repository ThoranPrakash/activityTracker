// Food tab: meal logging from the food database, saved meals, copy yesterday.

import { S, save } from './store.js';
import { view, register, render } from './core.js';
import { allFoods, foodById, makeEntry, mealTotals, dayTotals, targets } from './calc.js';
import { MEALS, FOOD_CATS } from '../data/foods.js';
import { openSheet, closeSheet, setSheetBody } from './ui.js';
import { $, esc, fmt, uid, todayKey, addDays, fmtDate, toast, num, round } from './util.js';

const TAG = { p: '<span class="badge prot">P</span>', j: '<span class="badge junk">junk</span>', w: '' };

export function renderFood(el) {
  const d = view.foodDate;
  const t = targets();
  const tot = dayTotals(d);
  const left = t.kcal - tot.kcal;
  const pct = (v, max) => Math.min(100, (v / max) * 100);
  let h = `<div class="top"><div><div class="eyebrow datenav"><button data-a="foodDay" data-d="-1">‹</button>${esc(fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' }))}<button data-a="foodDay" data-d="1" ${d >= todayKey() ? 'disabled style="opacity:.3"' : ''}>›</button></div>
    <div class="title">Food</div></div><button class="icon-btn" data-a="foodMenu" aria-label="Food options">⋯</button></div>`;

  h += `<div class="card"><div class="row between" style="align-items:flex-end"><div>
      <div class="lbl" style="margin:0">${left >= 0 ? 'REMAINING' : 'OVER TARGET'}</div>
      <div class="big num ${left >= 0 ? 'c-pink' : 'c-orange'}">${fmt(Math.abs(left))} <span style="font-size:15px;color:var(--t2)">kcal</span></div></div>
      <div class="muted" style="text-align:right;font-size:12px">Target ${fmt(t.kcal)}<br>Eaten ${fmt(tot.kcal)}</div></div>
    <div class="macros">
      <div><div class="n">Protein <b>${fmt(tot.p)} / ${t.protein} g</b></div><div class="bar"><i style="width:${pct(tot.p, t.protein)}%;background:var(--blue)"></i></div></div>
      <div><div class="n">Carbs <b>${fmt(tot.c)}g</b></div><div class="bar"><i style="width:${pct(tot.c, t.carbs)}%;background:var(--orange)"></i></div></div>
      <div><div class="n">Fat <b>${fmt(tot.f)}g</b></div><div class="bar"><i style="width:${pct(tot.f, t.fat)}%;background:var(--yellow)"></i></div></div>
    </div>${t.estimated ? `<div class="hint" style="color:var(--t2);background:var(--c2)">Targets are placeholders — <button class="link" data-a="openSettings">set up your profile</button> to calculate yours.</div>` : ''}</div>`;

  h += `<button class="search" style="text-align:left;color:var(--t3)" data-a="addFood" data-m="${guessMeal()}">🔍  Search ${allFoods().length}+ foods… chicken, dosa, whey</button>`;

  const day = S.food[d] || {};
  const yday = S.food[addDays(d, -1)] || {};
  for (const m of MEALS) {
    const items = day[m.id] || [];
    const mt = mealTotals(items);
    h += `<div class="card"><div class="ch"><span>${m.icon} ${m.name}</span><small>${items.length ? `${fmt(mt.kcal)} kcal · ${fmt(mt.p)} g P` : '—'}</small></div>`;
    items.forEach((it, k) => {
      h += `<div class="li tap" data-a="editItem" data-m="${m.id}" data-k="${k}"><div class="grow"><div class="t">${esc(it.name)} ${TAG[it.tag] || ''}</div><div class="s">${fmt(it.g)} g</div></div>
        <div class="k">${fmt(it.kcal)}<span>${fmt(it.p)} g P</span></div></div>`;
    });
    h += `<div class="row" style="gap:14px;flex-wrap:wrap;${items.length ? 'border-top:1px solid var(--line);padding-top:10px' : ''}">
      <button class="link" data-a="addFood" data-m="${m.id}">＋ Add food</button>
      ${S.savedMeals.length ? `<button class="link blue" data-a="savedMeals" data-m="${m.id}">⭐ Saved</button>` : ''}
      ${!items.length && (yday[m.id] || []).length ? `<button class="link blue" data-a="copyYesterday" data-m="${m.id}">↻ Copy yesterday</button>` : ''}
      ${items.length > 1 ? `<button class="link blue" data-a="saveMeal" data-m="${m.id}">☆ Save meal</button>` : ''}
    </div></div>`;
  }
  el.innerHTML = h;
}

function guessMeal() {
  const hr = new Date().getHours();
  return hr < 11 ? 'breakfast' : hr < 16 ? 'lunch' : hr < 19 ? 'snack' : 'dinner';
}
const mealName = id => MEALS.find(m => m.id === id)?.name || id;

function recentFoods() {
  const seen = new Map();
  const dates = Object.keys(S.food).sort().reverse().slice(0, 21);
  for (const d of dates) for (const m of MEALS) for (const it of S.food[d][m.id] || []) {
    if (!seen.has(it.fid)) seen.set(it.fid, 0);
    seen.set(it.fid, seen.get(it.fid) + 1);
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => foodById(id)).filter(Boolean).slice(0, 20);
}

// ═══════════════ add-food sheet ═══════════════
let pick = { meal: 'breakfast', q: '', cat: null };
function openAddFood(meal) {
  pick = { meal, q: '', cat: null };
  openSheet(`Add to ${mealName(meal)}`, addFoodHTML(), { right: `<button class="link" data-a="newFood">＋ Custom</button>`, onclose: render });
}
function addFoodHTML() {
  return `<input class="search" id="food-q" placeholder="Search foods…" value="${esc(pick.q)}" data-in="foodSearch" autocomplete="off">
    <div class="chips scroll" style="margin-bottom:6px">
      ${['Recent', 'Favourites', ...FOOD_CATS, ...(S.customFoods.length ? ['My foods'] : [])].map(c => `<button class="chip ${(pick.cat || 'Recent') === c ? 'sel' : ''}" data-a="foodCat" data-c="${esc(c)}">${esc(c)}</button>`).join('')}
    </div><div id="food-list">${foodList()}</div>`;
}
function foodList() {
  const q = pick.q.trim().toLowerCase();
  let list;
  if (q) {
    const words = q.split(/\s+/);
    list = allFoods().filter(f => words.every(w => f.name.toLowerCase().includes(w) || f.cat.toLowerCase().includes(w)));
  } else if (!pick.cat || pick.cat === 'Recent') {
    list = recentFoods();
    if (!list.length) return `<div class="empty">Foods you log show up here. Search above or pick a category.</div>`;
  } else if (pick.cat === 'Favourites') {
    list = S.favFoods.map(foodById).filter(Boolean);
    if (!list.length) return `<div class="empty">Tap ☆ on a food to add it to favourites.</div>`;
  } else if (pick.cat === 'My foods') {
    list = S.customFoods;
  } else {
    list = allFoods().filter(f => f.cat === pick.cat);
  }
  if (!list.length) return `<div class="empty">No match. Tap “＋ Custom” to add it.</div>`;
  return list.map(f => {
    const e = makeEntry(f, f.g);
    return `<div class="li tap" data-a="pickFood" data-id="${f.id}"><div class="grow"><div class="t">${esc(f.name)} ${TAG[f.tag] || ''}</div><div class="s">${esc(f.label)} · ${f.g} g</div></div>
      <div class="k">${fmt(e.kcal)}<span>${fmt(e.p)} g P</span></div></div>`;
  }).join('');
}

// quantity step: servings or grams
let qty = { food: null, grams: 0, mode: 'serv', meal: null, editK: null };
function openQty(food, grams, meal, editK = null) {
  qty = { food, grams, meal, editK, mode: 'serv' };
  openSheet(food.name, qtyHTML(), {
    right: `<button class="link" data-a="toggleFav" style="font-size:20px">${S.favFoods.includes(food.id) ? '★' : '☆'}</button>`,
    onclose: render,
  });
}
function qtyHTML() {
  const f = qty.food;
  const e = makeEntry(f, qty.grams);
  const serv = qty.grams / f.g;
  return `<div class="muted" style="margin-bottom:12px">${esc(f.cat)} · 1 serving = ${esc(f.label)} (${f.g} g) · per 100 g: ${fmt(f.kcal)} kcal, ${fmt(f.p, 1)} g protein</div>
    <div class="seg"><button class="${qty.mode === 'serv' ? 'on' : ''}" data-a="qtyMode" data-m="serv">Servings</button><button class="${qty.mode === 'g' ? 'on' : ''}" data-a="qtyMode" data-m="g">Grams</button></div>
    ${qty.mode === 'serv'
      ? `<div class="stepper" style="margin-bottom:8px"><button data-a="qtyStep" data-d="-0.5">−</button><div class="val num">${fmt(serv, serv % 1 ? 1 : 0)}<div class="muted" style="font-size:12px;font-weight:500">${esc(f.label)}</div></div><button data-a="qtyStep" data-d="0.5">＋</button></div>
         <div class="chips" style="justify-content:center;margin-bottom:14px">${[0.5, 1, 1.5, 2, 3].map(x => `<button class="chip ${Math.abs(serv - x) < 0.01 ? 'sel' : ''}" data-a="qtySet" data-x="${x}">×${x}</button>`).join('')}</div>`
      : `<div class="field unit-wrap"><input class="inp" id="qty-g" type="number" inputmode="decimal" value="${Math.round(qty.grams)}" data-in="qtyGrams" style="font-size:22px;font-weight:800;text-align:center"><span>g</span></div>`}
    <div class="grid2" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px" id="qty-macros">${qtyMacros(e)}</div>
    <button class="btn" data-a="qtyAdd">${qty.editK == null ? 'Add to ' + mealName(qty.meal) : 'Update'}</button>
    ${qty.editK != null ? `<button class="btn danger" style="margin-top:8px" data-a="qtyDelete">Remove</button>` : ''}`;
}
const qtyMacros = e => `<div class="st"><div class="l">kcal</div><div class="v c-pink">${fmt(e.kcal)}</div></div>
  <div class="st"><div class="l">Protein</div><div class="v c-blue">${fmt(e.p)}g</div></div>
  <div class="st"><div class="l">Carbs</div><div class="v c-orange">${fmt(e.c)}g</div></div>
  <div class="st"><div class="l">Fat</div><div class="v c-yellow">${fmt(e.f)}g</div></div>`;

function mealList(date, meal) {
  const d = (S.food[date] ||= {});
  return (d[meal] ||= []);
}

register({
  foodDay: el => {
    const n = addDays(view.foodDate, +el.dataset.d);
    if (n > todayKey()) return;
    view.foodDate = n; render();
  },
  addFood: el => openAddFood(el.dataset.m),
  foodSearch: el => { pick.q = el.value; $('#food-list').innerHTML = foodList(); },
  foodCat: el => { pick.cat = el.dataset.c; pick.q = ''; setSheetBody(addFoodHTML()); },
  pickFood: el => { const f = foodById(el.dataset.id); if (f) openQty(f, f.g, pick.meal); },
  editItem: el => {
    const it = mealList(view.foodDate, el.dataset.m)[+el.dataset.k];
    const f = foodById(it.fid) || { id: it.fid, name: it.name, cat: 'Logged', g: it.g, label: `${it.g} g`, kcal: (it.kcal / it.g) * 100, p: (it.p / it.g) * 100, c: (it.c / it.g) * 100, f: (it.f / it.g) * 100, tag: it.tag };
    openQty(f, it.g, el.dataset.m, +el.dataset.k);
  },
  qtyMode: el => { qty.mode = el.dataset.m; setSheetBody(qtyHTML()); },
  qtyStep: el => { qty.grams = Math.max(qty.food.g * 0.5, qty.grams + +el.dataset.d * qty.food.g); setSheetBody(qtyHTML()); },
  qtySet: el => { qty.grams = +el.dataset.x * qty.food.g; setSheetBody(qtyHTML()); },
  qtyGrams: el => { qty.grams = num(el.value) || 0; $('#qty-macros').innerHTML = qtyMacros(makeEntry(qty.food, qty.grams)); },
  qtyAdd: () => {
    if (!qty.grams) return toast('Enter an amount');
    const list = mealList(view.foodDate, qty.meal);
    const e = makeEntry(qty.food, qty.grams);
    if (qty.editK == null) list.push(e); else list[qty.editK] = e;
    save('food');
    toast(`${qty.editK == null ? 'Added' : 'Updated'} ${qty.food.name} · ${fmt(e.kcal)} kcal`);
    const again = qty.editK == null;
    closeSheet();
    if (again) setTimeout(() => openAddFood(qty.meal), 0);
  },
  qtyDelete: () => { mealList(view.foodDate, qty.meal).splice(qty.editK, 1); save('food'); closeSheet(); },
  toggleFav: el => {
    const id = qty.food.id;
    const i = S.favFoods.indexOf(id);
    if (i >= 0) S.favFoods.splice(i, 1); else S.favFoods.push(id);
    save('favFoods');
    el.textContent = i >= 0 ? '☆' : '★';
    toast(i >= 0 ? 'Removed from favourites' : 'Added to favourites');
  },
  copyYesterday: el => {
    const src = (S.food[addDays(view.foodDate, -1)] || {})[el.dataset.m] || [];
    mealList(view.foodDate, el.dataset.m).push(...src.map(x => ({ ...x })));
    save('food'); toast('Copied yesterday’s ' + mealName(el.dataset.m).toLowerCase()); render();
  },
  saveMeal: el => {
    const items = mealList(view.foodDate, el.dataset.m);
    const name = prompt('Name this meal', `My usual ${mealName(el.dataset.m).toLowerCase()}`);
    if (!name) return;
    S.savedMeals.push({ id: uid(), name: name.trim(), items: items.map(x => ({ ...x })) });
    save('savedMeals'); toast('Saved “' + name + '”'); render();
  },
  savedMeals: el => {
    const meal = el.dataset.m;
    openSheet('Saved meals', S.savedMeals.map(sm => {
      const t = mealTotals(sm.items);
      return `<div class="card"><div class="ch"><span>${esc(sm.name)}</span><small>${fmt(t.kcal)} kcal · ${fmt(t.p)} g P</small></div>
        <div class="muted" style="margin-bottom:10px">${sm.items.map(i => esc(i.name)).join(', ')}</div>
        <div class="btn-row"><button class="btn sm" data-a="useSaved" data-id="${sm.id}" data-m="${meal}">Add to ${mealName(meal)}</button><button class="btn sm danger" data-a="delSaved" data-id="${sm.id}">Delete</button></div></div>`;
    }).join('') || '<div class="empty">No saved meals yet.</div>', { onclose: render });
  },
  useSaved: el => {
    const sm = S.savedMeals.find(x => x.id === el.dataset.id);
    mealList(view.foodDate, el.dataset.m).push(...sm.items.map(x => ({ ...x })));
    save('food'); toast('Added ' + sm.name); closeSheet();
  },
  delSaved: el => {
    if (!confirm('Delete this saved meal?')) return;
    S.savedMeals = S.savedMeals.filter(x => x.id !== el.dataset.id);
    save('savedMeals'); closeSheet();
  },
  newFood: () => {
    setSheetBody(`<div class="muted" style="margin-bottom:12px">Enter values for one serving — check the pack label or a quick search.</div>
      <div class="field"><label>Name</label><input id="nf-name" placeholder="e.g. Mom’s chicken fry"></div>
      <div class="grid2"><div class="field"><label>Serving name</label><input id="nf-label" placeholder="1 bowl"></div>
      <div class="field"><label>Serving weight (g)</label><input id="nf-g" type="number" inputmode="decimal" placeholder="150"></div>
      <div class="field"><label>Calories (kcal)</label><input id="nf-kcal" type="number" inputmode="decimal"></div>
      <div class="field"><label>Protein (g)</label><input id="nf-p" type="number" inputmode="decimal"></div>
      <div class="field"><label>Carbs (g)</label><input id="nf-c" type="number" inputmode="decimal"></div>
      <div class="field"><label>Fat (g)</label><input id="nf-f" type="number" inputmode="decimal"></div></div>
      <div class="field"><label>Type</label><select id="nf-tag"><option value="w">Regular / whole food</option><option value="p">Protein-rich</option><option value="j">Junk / fried / sweet</option></select></div>
      <button class="btn" data-a="saveFood">Save food</button>`);
  },
  saveFood: () => {
    const name = $('#nf-name').value.trim();
    const g = num($('#nf-g').value), kcal = num($('#nf-kcal').value);
    if (!name || !g || kcal == null) return toast('Name, serving weight and calories are required');
    const per = v => round(((num(v) || 0) / g) * 100, 0.1);
    const f = {
      id: 'cf_' + uid(), name, cat: 'My foods', g, label: $('#nf-label').value.trim() || `${g} g`,
      kcal: per(kcal), p: per($('#nf-p').value), c: per($('#nf-c').value), f: per($('#nf-f').value), tag: $('#nf-tag').value,
    };
    S.customFoods.push(f);
    save('customFoods');
    toast('Saved ' + name);
    openQty(f, f.g, pick.meal);
  },
  foodMenu: () => {
    openSheet('Food options', `
      <button class="btn dark" data-a="manageFoods" style="margin-bottom:8px">My custom foods (${S.customFoods.length})</button>
      <button class="btn dark" data-a="goToday" style="margin-bottom:8px">Jump to today</button>
      <button class="btn dark" data-a="openSettings">Targets & profile</button>`);
  },
  goToday: () => { view.foodDate = todayKey(); closeSheet(); render(); },
  manageFoods: () => {
    setSheetBody(S.customFoods.length ? S.customFoods.map(f => `<div class="li"><div class="grow"><div class="t">${esc(f.name)}</div><div class="s">${esc(f.label)} · ${fmt((f.kcal * f.g) / 100)} kcal · ${fmt((f.p * f.g) / 100)} g P</div></div><button class="link red" data-a="delFood" data-id="${f.id}">Delete</button></div>`).join('') : '<div class="empty">No custom foods yet. Add one from the food search (＋ Custom).</div>');
  },
  delFood: el => {
    if (!confirm('Delete this food? Past logs keep their values.')) return;
    S.customFoods = S.customFoods.filter(f => f.id !== el.dataset.id);
    save('customFoods'); closeSheet();
  },
});

export { openAddFood };
