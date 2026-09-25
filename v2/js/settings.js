// Settings sheet: profile + targets, goals, habits, backup, data.

import { S, save, exportAll, importAll, resetAll, hasOldData, migrateOld } from './store.js';
import { register, render } from './core.js';
import { ACTIVITY, targets, profileComplete } from './calc.js';
import { openSheet, closeSheet, setSheetBody } from './ui.js';
import { $, esc, fmt, num, toast, uid, todayKey } from './util.js';

export function openSettings() {
  openSheet('Settings', settingsHTML(), { onclose: render });
}

function settingsHTML() {
  const p = S.profile || { sex: 'male', activity: 1.375, deficitPct: 12, proteinPerKg: 2 };
  const t = targets();
  const st = S.settings;
  const opt = (v, cur, label) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${label}</option>`;
  return `
  <div class="sec-title" style="margin-top:0">Profile</div>
  <div class="card">
    <div class="grid2">
      <div class="field"><label>Sex</label><select id="p-sex">${opt('male', p.sex, 'Male')}${opt('female', p.sex, 'Female')}</select></div>
      <div class="field"><label>Age</label><input id="p-age" type="number" inputmode="numeric" value="${p.age ?? ''}"></div>
      <div class="field"><label>Height (cm)</label><input id="p-height" type="number" inputmode="decimal" value="${p.heightCm ?? ''}"></div>
      <div class="field"><label>Weight (kg)</label><input id="p-weight" type="number" inputmode="decimal" step="0.1" value="${p.weightKg ?? ''}"></div>
    </div>
    <div class="field"><label>Daily activity</label><select id="p-activity">${ACTIVITY.map(a => opt(a.v, p.activity, a.label)).join('')}</select></div>
    <div class="grid2">
      <div class="field"><label>Deficit</label><select id="p-deficit">${[[0, 'Maintenance'], [8, 'Gentle −8%'], [12, 'Recomp −12%'], [15, 'Cut −15%'], [20, 'Aggressive −20%']].map(([v, l]) => opt(v, p.deficitPct ?? 12, l)).join('')}</select></div>
      <div class="field"><label>Protein</label><select id="p-ppk">${[1.6, 1.8, 2.0, 2.2].map(v => opt(v, p.proteinPerKg ?? 2, v + ' g / kg')).join('')}</select></div>
    </div>
    <button class="btn" data-a="saveProfile">Save & calculate</button>
  </div>

  <div class="card"><div class="ch">Your daily targets <small>${profileComplete() ? 'calculated' : 'placeholder'}</small></div>
    <div class="grid2" style="grid-template-columns:repeat(4,1fr)">
      <div class="st"><div class="l">kcal</div><div class="v c-pink">${fmt(t.kcal)}</div></div>
      <div class="st"><div class="l">Protein</div><div class="v c-blue">${t.protein}g</div></div>
      <div class="st"><div class="l">Carbs</div><div class="v c-orange">${t.carbs}g</div></div>
      <div class="st"><div class="l">Fat</div><div class="v c-yellow">${t.fat}g</div></div></div>
    ${t.tdee ? `<div class="muted" style="margin-top:10px;font-size:12.5px">BMR ${fmt(t.bmr)} × activity = ~${fmt(t.tdee)} kcal burned/day. Weight used: ${t.weight.toFixed(1)} kg (7-day trend once you log weigh-ins).</div>` : ''}
    <div class="hr"></div>
    <div class="grid2">
      <div class="field"><label>Override kcal</label><input id="p-kcalo" type="number" inputmode="numeric" placeholder="auto" value="${p.kcalOverride ?? ''}"></div>
      <div class="field"><label>Override protein (g)</label><input id="p-proto" type="number" inputmode="numeric" placeholder="auto" value="${p.proteinOverride ?? ''}"></div>
    </div>
    <button class="btn dark" data-a="saveOverrides">Save overrides</button>
  </div>

  <div class="sec-title">Goals</div>
  <div class="card"><div class="grid2">
    <div class="field"><label>Steps / day</label><input id="s-steps" type="number" inputmode="numeric" value="${st.stepGoal}"></div>
    <div class="field"><label>Water (L)</label><input id="s-water" type="number" inputmode="decimal" step="0.25" value="${st.waterGoal}"></div>
    <div class="field"><label>Sleep (hrs)</label><input id="s-sleep" type="number" inputmode="decimal" step="0.5" value="${st.sleepGoal}"></div>
    <div class="field"><label>Rest timer (sec)</label><input id="s-rest" type="number" inputmode="numeric" value="${st.restSec}"></div>
  </div><button class="btn dark" data-a="saveGoals">Save goals</button></div>

  <div class="sec-title">Habits</div>
  <div class="card">${S.habits.map(h => `<div class="li"><div class="grow"><div class="t">${h.icon} ${esc(h.name)}</div><div class="s">${h.auto ? 'Automatic' : 'Tap to tick'}</div></div><button class="link red" data-a="delHabit" data-id="${h.id}">Remove</button></div>`).join('')}
    <div class="hr"></div>
    <div class="row"><input class="inp" id="h-icon" style="width:56px;text-align:center" value="⭐" maxlength="2"><input class="inp grow" id="h-name" placeholder="New habit, e.g. 10 min stretch"></div>
    <button class="btn ghost" style="margin-top:8px" data-a="addHabit">＋ Add habit</button>
    ${restorable().length ? `<div class="muted" style="margin-top:10px">Restore: ${restorable().map(h => `<button class="link" data-a="restoreHabit" data-id="${h.id}">${h.icon} ${esc(h.name)}</button>`).join(' · ')}</div>` : ''}
  </div>

  <div class="sec-title">Data</div>
  <div class="card">
    <div class="muted" style="margin-bottom:10px">Everything is stored only on this phone. Export a backup every week or two, and keep it in Google Drive / email.</div>
    <div class="btn-row" style="margin-bottom:8px"><button class="btn" data-a="exportData">⤓ Export backup</button><button class="btn dark" data-a="importData">⤒ Import</button></div>
    ${hasOldData() ? `<button class="btn dark" data-a="migrate" style="margin-bottom:8px">Import data from old FitTracker</button>` : ''}
    <button class="btn danger" data-a="resetData">Erase all v2 data</button>
    <input type="file" id="import-file" accept="application/json,.json" style="display:none">
  </div>
  <div class="muted" style="text-align:center;margin:14px 0 4px;font-size:12px">FitTracker v2 · ${S.meta.lastBackup ? 'last backup ' + esc(S.meta.lastBackup) : 'no backup yet'}</div>`;
}

const restorable = () => {
  const ids = S.habits.map(h => h.id);
  return [
    { id: 'protein', name: 'Hit protein', icon: '🥩', auto: 'protein' }, { id: 'steps', name: 'Steps goal', icon: '👣', auto: 'steps' },
    { id: 'sleep', name: 'Sleep 7h+', icon: '😴', auto: 'sleep' }, { id: 'water', name: 'Water', icon: '💧', auto: 'water' },
    { id: 'nojunk', name: 'No junk', icon: '🥗', auto: 'nojunk' },
  ].filter(h => !ids.includes(h.id));
};

register({
  openSettings,
  saveProfile: () => {
    const p = { ...(S.profile || {}) };
    p.sex = $('#p-sex').value;
    p.age = num($('#p-age').value);
    p.heightCm = num($('#p-height').value);
    p.weightKg = num($('#p-weight').value);
    p.activity = +$('#p-activity').value;
    p.deficitPct = +$('#p-deficit').value;
    p.proteinPerKg = +$('#p-ppk').value;
    if (!p.age || !p.heightCm || !p.weightKg) return toast('Age, height and weight are needed');
    S.profile = p;
    // record today's weight if nothing logged yet
    const c = (S.checkins[todayKey()] ||= {});
    if (!c.weight) { c.weight = p.weightKg; save('checkins'); }
    save('profile');
    toast('✓ Targets updated');
    setSheetBody(settingsHTML());
  },
  saveOverrides: () => {
    if (!S.profile) return toast('Save your profile first');
    S.profile.kcalOverride = num($('#p-kcalo').value) || undefined;
    S.profile.proteinOverride = num($('#p-proto').value) || undefined;
    save('profile');
    toast('✓ Saved');
    setSheetBody(settingsHTML());
  },
  saveGoals: () => {
    const st = S.settings;
    st.stepGoal = num($('#s-steps').value) || st.stepGoal;
    st.waterGoal = num($('#s-water').value) || st.waterGoal;
    st.sleepGoal = num($('#s-sleep').value) || st.sleepGoal;
    st.restSec = num($('#s-rest').value) || st.restSec;
    save('settings');
    toast('✓ Goals saved');
  },
  addHabit: () => {
    const name = $('#h-name').value.trim();
    if (!name) return toast('Enter a habit name');
    S.habits.push({ id: 'h_' + uid(), name, icon: $('#h-icon').value.trim() || '⭐' });
    save('habits');
    setSheetBody(settingsHTML());
  },
  delHabit: el => {
    if (!confirm('Remove this habit? Its history is kept if you add it back.')) return;
    S.habits = S.habits.filter(h => h.id !== el.dataset.id);
    save('habits');
    setSheetBody(settingsHTML());
  },
  restoreHabit: el => {
    const h = restorable().find(x => x.id === el.dataset.id);
    if (h) { S.habits.push(h); save('habits'); setSheetBody(settingsHTML()); }
  },
  exportData: () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `FitTracker-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    S.meta.lastBackup = todayKey();
    save('meta');
    toast('✓ Backup downloaded');
  },
  importData: () => {
    const input = $('#import-file');
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      file.text().then(txt => {
        try {
          const obj = JSON.parse(txt);
          if (!confirm('Replace data on this phone with this backup?')) return;
          importAll(obj);
          toast('✓ Backup restored');
          closeSheet();
        } catch (e) {
          toast('✕ ' + (e.message || 'Invalid backup file'));
        }
      });
    };
    input.click();
  },
  migrate: () => {
    const r = migrateOld();
    toast(`Imported ${r.checkins} days, ${r.sessions} workouts, ${r.habits} habits`);
    setSheetBody(settingsHTML());
  },
  resetData: () => {
    if (!confirm('Erase ALL FitTracker v2 data on this phone? Export a backup first!')) return;
    if (!confirm('Really erase everything? This cannot be undone.')) return;
    resetAll();
    toast('All data erased');
    closeSheet();
  },
});
