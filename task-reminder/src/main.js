import '@fontsource-variable/outfit';
import '@fontsource-variable/jetbrains-mono';
import { App as CapApp } from '@capacitor/app';
import { createCity } from './city.js';
import { createBrain } from './brain.js';
import * as S from './store.js';
import * as N from './notify.js';

/* ---------- util ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ICONS = {
  city: '<path d="M4 21V9l6-3v15M10 21V4l10 4v13M3 21h18M13 11h4M13 15h4"/>',
  tasks: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6.5l1.5 1.5 2.5-3M3.5 12.5l1.5 1.5 2.5-3M3.5 18.5l1.5 1.5 2.5-3"/>',
  idea: '<circle cx="12" cy="12" r="2.5"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="20" r="2"/><path d="M10 10.5L6.4 7.4M14 10.5l3.6-3.1M12 14.5V18"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13v4M8.5 20h7M10 17h4"/>',
  auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  sunset: '<path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 7v3M5.6 10.6l1.7 1.7M18.4 10.6l-1.7 1.7"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.2 1.4.8 2.2 1.6 2.6C10.2 8.4 10.8 5.6 12 3z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  pause: '<path d="M8 5.5v13M16 5.5v13"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5"/>',
  repeat: '<path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  branch: '<path d="M6 4v10a4 4 0 0 0 4 4h8M6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4.5 4.5"/>',
  clipboard: '<rect x="6" y="4.5" width="12" height="16" rx="2.5"/><path d="M9.5 4.5h5v2.5h-5zM9.5 12h5M9.5 16h3"/>',
};
const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
const pad = (n) => String(n).padStart(2, '0');
const timeStr = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${timeStr(d)}`;
function fmtDue(iso) {
  const d = new Date(iso), now = new Date();
  const tm = new Date(now); tm.setDate(tm.getDate() + 1);
  const k = S.dayKey(d);
  if (k === S.dayKey(now)) return `Hari ini, ${timeStr(d)}`;
  if (k === S.dayKey(tm)) return `Besok, ${timeStr(d)}`;
  return `${d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}, ${timeStr(d)}`;
}
const PRIO = { 1: ['Rendah', 'var(--prio-1)'], 2: ['Sedang', 'var(--prio-2)'], 3: ['Tinggi', 'var(--prio-3)'] };

/* ---------- state & 3D ---------- */
S.load();
let state = S.get();
const cityCanvas = $('#city'), brainCanvas = $('#brain');
let city = null, brain = null;
try { city = createCity(cityCanvas); } catch (e) { console.warn('WebGL kota gagal', e); }
try { brain = createBrain(brainCanvas); } catch (e) { console.warn('WebGL ide gagal', e); }

/* ---------- toast & pulau ---------- */
function toast(msg, action, ttl = 4500) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
  $('#toasts').append(el);
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 320); };
  if (action) el.querySelector('button').onclick = () => { action.fn(); kill(); };
  setTimeout(kill, ttl);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}
let islandQ = Promise.resolve();
function island(ic, text) {
  islandQ = islandQ.then(() => new Promise((res) => {
    const box = $('#island');
    box.innerHTML = `<div>${icon(ic)}<span>${esc(text)}</span></div>`;
    setTimeout(res, 3300);
  }));
}

/* ---------- HUD ---------- */
function renderHud() {
  const p = S.points(), lv = S.levelInfo(p);
  $('#coName').textContent = state.company;
  $('#coLevel').textContent = lv.next ? `${lv.name} · ${lv.remaining} poin lagi` : `${lv.name} · level tertinggi`;
  $('#lvlBar').style.transform = `scaleX(${Math.max(0.03, lv.progress)})`;
  $('#hud').classList.remove('loading');
  city?.setName(state.company);
}
const TIME_ICON = { auto: 'auto', pagi: 'sun', senja: 'sunset', malam: 'moon' };
const TIME_LABEL = { auto: 'Otomatis', pagi: 'Pagi', senja: 'Senja', malam: 'Malam' };
function renderTimeBtn() {
  const m = city?.timeMode || 'auto';
  $('#timeBtn').innerHTML = icon(TIME_ICON[m]);
  $('#timeBtn').setAttribute('aria-label', `Waktu kota: ${TIME_LABEL[m]}. Ketuk untuk mengganti`);
}
$('#trophyBtn').innerHTML = icon('trophy');
$('#timeBtn').onclick = () => { const m = city?.cycleTime(); renderTimeBtn(); if (m) toast(`Waktu kota: ${TIME_LABEL[m]}`, null, 1600); };
$('#nameBtn').onclick = () => openNameEditor();

/* ---------- dock & tab ---------- */
const TABS = [['kota', 'Kota', 'city'], ['tugas', 'Tugas', 'tasks'], ['ide', 'Ide', 'idea'], ['fokus', 'Fokus', 'timer']];
const dock = $('#dock');
TABS.forEach(([id, label, ic]) => {
  const b = document.createElement('button');
  b.className = 'tab'; b.dataset.tab = id;
  b.innerHTML = `${icon(ic)}<span>${label}</span>`;
  b.onclick = () => setTab(id);
  dock.append(b);
});
let tab = 'kota';
function setTab(id) {
  tab = id;
  const i = TABS.findIndex((t) => t[0] === id);
  dock.style.setProperty('--i', i);
  dock.querySelectorAll('.tab').forEach((b) => { if (b.dataset.tab === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#sheet').dataset.tab = id;
  const ide = id === 'ide';
  cityCanvas.hidden = ide; brainCanvas.hidden = !ide || !brain; $('#p-ide').hidden = !ide;
  if (ide) { city?.stop(); brain?.start(); brainCanvas.hidden = !brain; requestAnimationFrame(updateBrainInset); }
  else { brain?.stop(); city?.resize(); city?.start(); }
  if (id === 'tugas') renderTasks();
  if (id === 'fokus') renderFocus();
  updateInset();
}
function updateInset() {
  if (!city || tab === 'ide') return;
  const sheet = $('#sheet');
  const dockTop = window.innerHeight - dock.getBoundingClientRect().top;
  const peek = parseFloat(getComputedStyle(sheet).getPropertyValue('--peek')) || 244;
  const vis = tab === 'kota' ? peek : sheet.offsetHeight;
  city.setInset(dockTop + 12 + vis);
}
new ResizeObserver(updateInset).observe($('#sheet'));
window.addEventListener('resize', updateInset);

/* ---------- permainan: poin, level, pencapaian ---------- */
let shownPoints = S.points();
function afterChange({ celebrate = false } = {}) {
  state = S.get();
  const p = S.points();
  const before = S.levelInfo(shownPoints).index, after = S.levelInfo(p).index;
  city?.setPoints(p, { animate: true });
  if (celebrate) city?.celebrate();
  if (after > before) island('bolt', `Naik level: ${S.levelInfo(p).name}`);
  shownPoints = p;
  const gained = S.checkAchievements();
  if (gained.length) { S.commit(); gained.forEach((a) => island('trophy', `Pencapaian: ${a.title}`)); if (navigator.vibrate) navigator.vibrate(40); }
  renderHud();
  renderKota();
  if (tab === 'tugas') renderTasks();
  if (tab === 'fokus') renderFocus();
}

/* ---------- panel Kota ---------- */
function renderKota() {
  const active = state.tasks.filter((t) => !t.done);
  const next = active.slice().sort(byDue)[0];
  $('#p-kota').innerHTML = `
    <div class="row between">
      <div><h2>Hari ini</h2><p class="sub">${active.length ? `${active.length} tugas menunggu` : 'Tidak ada tugas aktif'}</p></div>
      <button class="btn primary sm" data-go="add">${icon('plus')}Tugas</button>
    </div>
    <div class="metrics">
      <div class="metric"><b>${state.stats.completed}</b><span>Selesai</span></div>
      <div class="metric"><b>${S.currentStreak()}</b><span>Streak hari</span></div>
      <div class="metric"><b>${state.stats.focusMin}</b><span>Menit fokus</span></div>
    </div>
    <div class="next">${next ? taskRow(next, 0, true) : `<p class="hint">Selesaikan tugas untuk menambah lantai, gedung, dan kendaraan di kota Anda.</p>`}</div>`;
}
$('#p-kota').addEventListener('click', (e) => {
  if (e.target.closest('[data-go="add"]')) return openTaskEditor();
  taskClick(e);
});

/* ---------- panel Tugas ---------- */
let showDone = false;
const byDue = (a, b) => (a.due && b.due ? new Date(a.due) - new Date(b.due) : a.due ? -1 : b.due ? 1 : b.prio - a.prio || b.created - a.created);
function taskRow(t, n, compact) {
  const [plabel, pcol] = PRIO[t.prio];
  const late = t.due && !t.done && new Date(t.due) < new Date();
  return `<div class="task ${t.done ? 'done' : ''}" data-id="${t.id}" style="--n:${n};--c:${pcol}">
    <button class="check" data-act="done" aria-label="${t.done ? 'Selesai' : 'Tandai selesai'}: ${esc(t.title)}" ${t.done ? 'disabled' : ''}><span><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></button>
    <button class="main" data-act="edit" aria-label="Ubah: ${esc(t.title)}">
      <div class="t">${esc(t.title)}</div>
      <div class="m"><span class="row" style="gap:6px"><i class="dot"></i>${plabel}</span>
        ${t.due ? `<span class="${late ? 'late' : ''}">${late ? 'Terlambat · ' : ''}${fmtDue(t.due)}</span>` : ''}
        ${t.repeat !== 'none' ? icon('repeat') : ''}${t.due && t.remind >= 0 && !t.done ? icon('bell') : ''}</div>
    </button>
    <span></span></div>`;
}
function renderTasks() {
  const p = $('#p-tugas');
  const now = new Date();
  const active = state.tasks.filter((t) => !t.done).sort(byDue);
  const done = state.tasks.filter((t) => t.done).sort((a, b) => b.doneAt - a.doneAt).slice(0, 30);
  let body = '';
  if (!showDone) {
    const late = active.filter((t) => t.due && new Date(t.due) < now);
    const today = active.filter((t) => t.due && new Date(t.due) >= now && S.dayKey(t.due) === S.dayKey(now));
    const soon = active.filter((t) => t.due && new Date(t.due) >= now && S.dayKey(t.due) !== S.dayKey(now));
    const none = active.filter((t) => !t.due);
    let n = 0;
    const grp = (label, arr, cls = '') => (arr.length ? `<div class="group ${cls}">${label}</div>${arr.map((t) => taskRow(t, n++)).join('')}` : '');
    body = grp('TERLAMBAT', late, 'late') + grp('HARI INI', today) + grp('MENDATANG', soon) + grp('TANPA TENGGAT', none);
    if (!active.length) body = `<div class="empty">${icon('clipboard')}<b>Belum ada tugas</b><span>Tambahkan tugas pertama. Setiap tugas selesai membangun satu lantai baru di kota Anda.</span><button class="btn primary" data-act="add" style="margin-top:10px">${icon('plus')}Tambah tugas</button></div>`;
  } else {
    body = done.length ? done.map((t, i) => taskRow(t, i)).join('') : `<div class="empty">${icon('check')}<b>Belum ada yang selesai</b><span>Tugas yang Anda selesaikan muncul di sini.</span></div>`;
  }
  p.innerHTML = `<div class="row between"><h2>Tugas</h2>
      <div class="row"><div class="seg" role="group" aria-label="Filter"><button data-seg="0" aria-pressed="${!showDone}">Aktif</button><button data-seg="1" aria-pressed="${showDone}">Selesai</button></div>
      <button class="fab" data-act="add" aria-label="Tambah tugas">${icon('plus')}</button></div></div>
    <div class="list">${body}</div>`;
}
$('#p-tugas').addEventListener('click', (e) => {
  const seg = e.target.closest('[data-seg]');
  if (seg) { showDone = seg.dataset.seg === '1'; return renderTasks(); }
  if (e.target.closest('[data-act="add"]')) return openTaskEditor();
  taskClick(e);
});
function taskClick(e) {
  const row = e.target.closest('.task');
  if (!row) return;
  const id = Number(row.dataset.id);
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'done') completeFlow(id, row);
  else if (act === 'edit') openTaskEditor(state.tasks.find((t) => t.id === id));
}
function completeFlow(id, row) {
  if (row.classList.contains('completing')) return;
  row.classList.add('completing');
  if (navigator.vibrate) navigator.vibrate(18);
  setTimeout(() => {
    const res = S.completeTask(id);
    if (!res) return;
    N.cancel(id);
    if (res.next) N.schedule(res.next);
    afterChange({ celebrate: true });
    toast(`Selesai: ${res.task.title}. Kota bertambah besar.`, {
      label: 'Urungkan',
      fn: () => { S.undoComplete(id, res.next?.id); if (res.next) N.cancel(res.next.id); shownPoints = S.points(); city?.setPoints(shownPoints, { animate: false }); state = S.get(); afterChange(); },
    }, 5200);
  }, 520);
}

/* ---------- editor tugas ---------- */
function openModal(html) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false;
  m.onclick = (e) => { if (e.target === m) closeModal(); };
  return m.firstElementChild;
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
function openTaskEditor(task, preset) {
  const t = task || { title: preset?.title || '', note: '', due: null, prio: 2, remind: 0, repeat: 'none' };
  const el = openModal(`
    <div class="row between"><h2>${task ? 'Ubah tugas' : 'Tugas baru'}</h2><button class="round" data-close aria-label="Tutup" style="width:44px;height:44px">${icon('close')}</button></div>
    <div class="field" id="fg-title"><label for="f-title">Judul tugas</label><input id="f-title" maxlength="120" placeholder="Contoh: Kirim proposal ke klien" value="${esc(t.title)}" autocomplete="off" /><span class="err" id="e-title"></span></div>
    <div class="field"><label for="f-note">Catatan (opsional)</label><textarea id="f-note" maxlength="400" placeholder="Detail yang perlu diingat">${esc(t.note)}</textarea></div>
    <div class="field"><label for="f-due">Tenggat dan pengingat</label><input id="f-due" type="datetime-local" value="${t.due ? toLocalInput(new Date(t.due)) : ''}" />
      <div class="chips" style="margin-top:2px"><button class="chip" data-q="h">Hari ini 17:00</button><button class="chip" data-q="b">Besok 09:00</button><button class="chip" data-q="j">1 jam lagi</button><button class="chip" data-q="x">Tanpa tenggat</button></div></div>
    <div class="field"><span class="lab">Prioritas</span><div class="seg" id="f-prio" role="group" aria-label="Prioritas">${[1, 2, 3].map((p) => `<button data-p="${p}" aria-pressed="${t.prio === p}">${PRIO[p][0]}</button>`).join('')}</div></div>
    <div class="grid2">
      <div class="field"><label for="f-rem">Ingatkan</label><select id="f-rem">${[[0, 'Tepat waktu'], [10, '10 menit sebelum'], [60, '1 jam sebelum'], [1440, '1 hari sebelum']].map(([v, l]) => `<option value="${v}" ${t.remind === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="f-rep">Ulangi</label><select id="f-rep">${[['none', 'Tidak'], ['daily', 'Setiap hari'], ['weekly', 'Setiap minggu']].map(([v, l]) => `<option value="${v}" ${t.repeat === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    </div>
    <div class="row" style="margin-top:6px"><button class="btn primary" style="flex:1" id="f-save">Simpan</button>${task ? `<button class="btn danger" id="f-del" aria-label="Hapus tugas">${icon('trash')}</button>` : ''}</div>`);
  let prio = t.prio;
  el.querySelector('[data-close]').onclick = closeModal;
  el.querySelector('#f-prio').onclick = (e) => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    prio = Number(b.dataset.p);
    el.querySelectorAll('#f-prio button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  };
  el.querySelectorAll('[data-q]').forEach((b) => {
    b.onclick = () => {
      const d = new Date();
      if (b.dataset.q === 'h') d.setHours(17, 0, 0, 0);
      if (b.dataset.q === 'b') { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
      if (b.dataset.q === 'j') d.setMinutes(d.getMinutes() + 60, 0, 0);
      $('#f-due').value = b.dataset.q === 'x' ? '' : toLocalInput(d);
    };
  });
  const title = $('#f-title');
  title.oninput = () => { $('#fg-title').classList.remove('bad'); $('#e-title').textContent = ''; };
  $('#f-save').onclick = async () => {
    const v = title.value.trim();
    if (!v) { $('#fg-title').classList.add('bad'); $('#e-title').textContent = 'Judul tugas wajib diisi.'; title.focus(); return; }
    const dueVal = $('#f-due').value;
    const patch = { title: v, note: $('#f-note').value.trim(), due: dueVal ? new Date(dueVal).toISOString() : null, prio, remind: Number($('#f-rem').value), repeat: dueVal ? $('#f-rep').value : 'none' };
    let saved;
    if (task) saved = S.updateTask(task.id, patch);
    else {
      saved = S.addTask(patch);
      if (preset?.fromIdea) {
        const idea = state.brain.ideas.find((i) => i.id === preset.fromIdea);
        if (idea) { idea.taskId = saved.id; state.stats.ideasToTasks += 1; S.commit(); syncBrain(); }
      }
    }
    closeModal();
    if (saved.due) { await N.ensurePermission(); N.schedule(saved); }
    else N.cancel(saved.id);
    toast(task ? 'Tugas diperbarui' : 'Tugas ditambahkan', null, 1800);
    afterChange();
  };
  if (task) {
    const del = $('#f-del');
    del.onclick = () => {
      if (!del.dataset.arm) { del.dataset.arm = '1'; del.innerHTML = 'Yakin hapus?'; setTimeout(() => { if (del.isConnected) { del.innerHTML = icon('trash'); delete del.dataset.arm; } }, 2500); return; }
      S.removeTask(task.id); N.cancel(task.id); closeModal(); afterChange(); toast('Tugas dihapus', null, 1800);
    };
  }
  setTimeout(() => !task && title.focus(), 380);
}
function openNameEditor() {
  const el = openModal(`<h2>Nama perusahaan</h2>
    <div class="field"><label for="f-co">Nama yang tampil di papan kota</label><input id="f-co" maxlength="28" value="${esc(state.company)}" autocomplete="off" /></div>
    <button class="btn primary wide" id="f-co-ok">Simpan</button>`);
  const inp = el.querySelector('#f-co');
  el.querySelector('#f-co-ok').onclick = () => { state.company = inp.value.trim() || 'Perusahaan Saya'; S.commit(); closeModal(); renderHud(); };
  setTimeout(() => inp.select(), 380);
}
function openAchievements() {
  const got = state.unlocked;
  const el = openModal(`<div class="row between"><h2>Pencapaian</h2><button class="round" data-close aria-label="Tutup" style="width:44px;height:44px">${icon('close')}</button></div>
    <p class="sub" style="margin-bottom:8px">${Object.keys(got).length} dari ${S.ACHIEVEMENTS.length} terbuka</p>
    ${S.ACHIEVEMENTS.map((a) => `<div class="ach ${got[a.id] ? 'on' : 'off'}"><div class="ic">${icon(got[a.id] ? 'trophy' : 'bolt')}</div><div><b>${a.title}</b><div class="dim" style="font-size:.85rem">${a.desc}</div></div></div>`).join('')}`);
  el.querySelector('[data-close]').onclick = closeModal;
}
$('#trophyBtn').onclick = openAchievements;

/* ---------- panel Fokus ---------- */
const FKEY = 'kotakarya.focus';
const focus = { running: false, dur: state.settings.focusMin * 60000, endAt: 0, remain: state.settings.focusMin * 60000, taskId: null };
try { Object.assign(focus, JSON.parse(localStorage.getItem(FKEY) || '{}')); } catch { /* abaikan */ }
const saveFocus = () => { try { localStorage.setItem(FKEY, JSON.stringify(focus)); } catch { /* abaikan */ } };
let ftimer = 0;
const fmtClock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
function renderFocus() {
  const p = $('#p-fokus');
  const week = S.last7(), max = Math.max(1, ...week.map((d) => d.n));
  const active = state.tasks.filter((t) => !t.done);
  p.innerHTML = `
    <div class="row between"><h2>Fokus</h2><div class="seg" id="f-dur" role="group" aria-label="Durasi">${[15, 25, 50].map((m) => `<button data-m="${m}" aria-pressed="${focus.dur === m * 60000}" ${focus.running ? 'disabled' : ''}>${m} mnt</button>`).join('')}</div></div>
    <div class="ring ${focus.running ? 'run' : ''}" id="ring"><svg viewBox="0 0 200 200"><circle class="bg" cx="100" cy="100" r="88"/><circle class="fg" id="ringFg" cx="100" cy="100" r="88"/></svg>
      <div class="time"><b id="fClock">${fmtClock(focus.running ? focus.endAt - Date.now() : focus.remain)}</b><span class="${focus.running ? 'pulse' : ''}">${focus.running ? 'Lembur di kantor Anda' : 'Siap mulai'}</span></div></div>
    <div class="field" style="margin-top:14px"><label for="f-task">Fokus untuk tugas</label><select id="f-task" ${focus.running ? 'disabled' : ''}><option value="">Bebas, tanpa tugas</option>${active.map((t) => `<option value="${t.id}" ${focus.taskId === t.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></div>
    <div class="row"><button class="btn primary" style="flex:1" id="fGo">${icon(focus.running ? 'pause' : 'play')}${focus.running ? 'Jeda' : focus.remain < focus.dur ? 'Lanjut' : 'Mulai fokus'}</button><button class="btn" id="fReset" aria-label="Setel ulang">${icon('reset')}</button></div>
    <div class="stat3"><div class="metric"><b>${state.stats.sessions}</b><span>Sesi selesai</span></div><div class="metric"><b>${state.stats.focusMin}</b><span>Menit fokus</span></div><div class="metric"><b>${S.currentStreak()}</b><span>Streak hari</span></div></div>
    <div class="lab" style="margin-top:16px">Tugas selesai, 7 hari terakhir</div>
    <div class="bars" role="img" aria-label="Grafik tugas selesai 7 hari">${week.map((d) => `<div><i class="${d.n ? '' : 'zero'}" style="--v:${d.n ? Math.max(0.12, d.n / max) : 0.05}"></i><small class="mono">${d.n || '·'}</small><small>${d.label}</small></div>`).join('')}</div>`;
  updateRing();
}
function updateRing() {
  const fg = $('#ringFg'), clock = $('#fClock');
  if (!fg || !clock) return;
  const left = focus.running ? focus.endAt - Date.now() : focus.remain;
  clock.textContent = fmtClock(left);
  fg.style.strokeDashoffset = String(552.9 * (1 - Math.max(0, left) / focus.dur));
}
function focusTick() {
  if (!focus.running) return;
  if (focus.endAt - Date.now() <= 0) return focusDone();
  if (tab === 'fokus') updateRing();
}
function focusStart() {
  focus.running = true; focus.endAt = Date.now() + focus.remain; saveFocus();
  clearInterval(ftimer); ftimer = setInterval(focusTick, 250);
  city?.setOvertime(true);
  N.ensurePermission().then(() => N.scheduleFocusEnd(focus.endAt, 'Kota Anda siap berkembang. Ambil jeda sejenak.'));
  renderFocus();
}
function focusPause() {
  focus.remain = Math.max(1000, focus.endAt - Date.now()); focus.running = false; saveFocus();
  clearInterval(ftimer); city?.setOvertime(false); N.cancelFocusEnd(); renderFocus();
}
function focusReset() {
  focus.running = false; focus.remain = focus.dur; saveFocus(); clearInterval(ftimer); city?.setOvertime(false); N.cancelFocusEnd(); renderFocus();
}
function focusDone() {
  const min = Math.round(focus.dur / 60000);
  focus.running = false; focus.remain = focus.dur; saveFocus(); clearInterval(ftimer);
  city?.setOvertime(false); N.cancelFocusEnd();
  S.addSession(min);
  N.webNotify('Sesi fokus selesai', `${min} menit fokus tercatat.`);
  toast(`Sesi ${min} menit selesai. Kota Anda bekerja lembur.`, null, 3500);
  afterChange({ celebrate: true });
}
$('#p-fokus').addEventListener('click', (e) => {
  const m = e.target.closest('[data-m]');
  if (m && !focus.running) { focus.dur = Number(m.dataset.m) * 60000; focus.remain = focus.dur; state.settings.focusMin = Number(m.dataset.m); S.commit(); saveFocus(); return renderFocus(); }
  if (e.target.closest('#fGo')) return focus.running ? focusPause() : focusStart();
  if (e.target.closest('#fReset')) return focusReset();
});
$('#p-fokus').addEventListener('change', (e) => { if (e.target.id === 'f-task') { focus.taskId = e.target.value ? Number(e.target.value) : null; saveFocus(); } });

/* ---------- panel Ide (brainstorming 3D) ---------- */
const SPARKS = [
  'Bagaimana jika biayanya sepuluh kali lebih murah?', 'Apa yang bisa dihapus dari rencana ini?', 'Kalau tidak boleh memakai uang, apa caranya?',
  'Gabungkan dua ide tadi menjadi satu.', 'Apa kebalikan dari ide ini?', 'Bagaimana Anda menjelaskannya kepada anak sepuluh tahun?',
  'Apa yang akan dilakukan pesaing terbaik Anda?', 'Bagaimana mengerjakannya hanya dalam satu jam?', 'Siapa yang bisa membantu menyelesaikannya?',
  'Apa risiko terbesarnya, dan bagaimana menghindarinya?', 'Buat versi lebih kecil, lebih besar, atau lebih cepat.', 'Pakai alat dan bahan yang sudah ada di sekitar Anda.',
];
let selIdea = null, branchMode = false, sparkIdx = -1;
function buildIde() {
  const el = $('#p-ide');
  el.innerHTML = `
    <div class="b-top"><button class="topic glass" id="topicBtn"><small>Topik ide</small><b id="topicTxt"></b></button>
      <button class="round glass" id="sparkBtn" aria-label="Minta pemicu ide">${icon('spark')}</button></div>
    <div class="b-empty" id="bEmpty"><b>Peta ide masih kosong</b>Tulis ide pertama di bawah. Putar bola dengan jari, ketuk ide untuk memilihnya.</div>
    <div class="b-ctl glass" id="bCtl"><div id="bSpark"></div><div class="b-sel" id="bSel"></div>
      <form class="b-row" id="bForm"><input class="inp" id="bInp" maxlength="80" placeholder="Tulis satu ide..." aria-label="Tulis satu ide" autocomplete="off" /><button class="fab" aria-label="Tambah ide" type="submit">${icon('plus')}</button></form></div>`;
  $('#topicBtn').onclick = openTopicEditor;
  $('#sparkBtn').onclick = () => {
    sparkIdx = (sparkIdx + 1 + Math.floor(Math.random() * (SPARKS.length - 1))) % SPARKS.length;
    $('#bSpark').innerHTML = `<button class="spark" id="sparkCard">${icon('spark')}<span>${SPARKS[sparkIdx]}</span></button>`;
    $('#sparkCard').onclick = () => { $('#bInp').focus(); $('#bInp').placeholder = SPARKS[sparkIdx]; $('#bSpark').innerHTML = ''; };
  };
  $('#bForm').onsubmit = (e) => {
    e.preventDefault();
    const v = $('#bInp').value.trim();
    if (!v) { $('#bInp').focus(); return; }
    state.brain.ideas.push({ id: `i${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`, text: v, parent: branchMode ? selIdea : null, taskId: null });
    state.stats.ideasMade += 1;
    $('#bInp').value = ''; $('#bInp').placeholder = 'Tulis satu ide...';
    if (navigator.vibrate) navigator.vibrate(12);
    S.commit(); syncBrain(); afterChange();
  };
  new ResizeObserver(updateBrainInset).observe($('#bCtl'));
  renderSel();
}
function updateBrainInset() {
  const c = $('#bCtl'); if (!c || $('#p-ide').hidden) return;
  brainCanvas.style.setProperty('--ctl-h', `${Math.max(0, window.innerHeight - c.getBoundingClientRect().top)}px`);
  brain?.resize();
}
function syncBrain() {
  $('#topicTxt') && ($('#topicTxt').textContent = state.brain.topic);
  $('#bEmpty') && ($('#bEmpty').hidden = state.brain.ideas.length > 0);
  brain?.setData({ topic: state.brain.topic, ideas: state.brain.ideas });
  renderSel();
}
function renderSel() {
  const box = $('#bSel'); if (!box) return;
  const idea = state.brain.ideas.find((i) => i.id === selIdea);
  if (!idea) { selIdea = null; branchMode = false; box.innerHTML = ''; return; }
  box.innerHTML = `<div class="row between"><div class="q">${esc(idea.text)}</div></div>
    <div class="chips"><button class="chip" data-s="branch" aria-pressed="${branchMode}" style="${branchMode ? 'border-color:var(--accent);color:var(--accent)' : ''}">${branchMode ? 'Mode cabang aktif' : 'Tambah cabang'}</button>
    ${idea.taskId ? '<span class="chip" style="border-color:var(--accent);color:var(--accent)">Sudah jadi tugas</span>' : '<button class="chip" data-s="task">Jadikan tugas</button>'}
    <button class="chip" data-s="del" style="color:var(--danger)">Hapus</button></div>`;
}
$('#p-ide').addEventListener('click', (e) => {
  const b = e.target.closest('[data-s]'); if (!b) return;
  const idea = state.brain.ideas.find((i) => i.id === selIdea); if (!idea) return;
  if (b.dataset.s === 'branch') { branchMode = !branchMode; renderSel(); if (branchMode) { $('#bInp').focus(); $('#bInp').placeholder = 'Cabang dari ide ini...'; } }
  if (b.dataset.s === 'task') openTaskEditor(null, { title: idea.text, fromIdea: idea.id });
  if (b.dataset.s === 'del') {
    const drop = new Set([idea.id]);
    let grew = true;
    while (grew) { grew = false; state.brain.ideas.forEach((i) => { if (i.parent && drop.has(i.parent) && !drop.has(i.id)) { drop.add(i.id); grew = true; } }); }
    state.brain.ideas = state.brain.ideas.filter((i) => !drop.has(i.id));
    selIdea = null; S.commit(); syncBrain();
  }
});
function openTopicEditor() {
  const el = openModal(`<h2>Topik ide</h2><div class="field"><label for="f-top">Apa yang sedang Anda pikirkan?</label><input id="f-top" maxlength="60" value="${esc(state.brain.topic)}" autocomplete="off" /></div><button class="btn primary wide" id="f-top-ok">Simpan</button>`);
  el.querySelector('#f-top-ok').onclick = () => { state.brain.topic = el.querySelector('#f-top').value.trim() || 'Ide besar saya'; S.commit(); closeModal(); syncBrain(); };
  setTimeout(() => el.querySelector('#f-top').select(), 380);
}
if (brain) brain.onSelect = (id) => { selIdea = id; if (!id) branchMode = false; renderSel(); };
buildIde();

/* ---------- pengingat ---------- */
function checkDue() {
  N.dueNow(S.get().tasks).forEach((t) => {
    S.get().tasks.find((x) => x.id === t.id).notified = true;
    S.commit();
    N.webNotify('Pengingat tugas', t.title);
    toast(`Waktunya: ${t.title}`, {
      label: 'Selesai', fn: () => { const row = document.createElement('div'); completeFlow(t.id, row); },
    }, 9000);
  });
}
setInterval(checkDue, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkDue(); focusTick(); updateInset(); } });

/* ---------- tombol kembali Android ---------- */
CapApp.addListener?.('backButton', () => {
  if (!$('#modal').hidden) return closeModal();
  if (tab !== 'kota') return setTab('kota');
  CapApp.exitApp();
}).catch?.(() => {});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

/* ---------- mulai ---------- */
N.setupChannel();
state.tasks.filter((t) => !t.done && t.due).forEach((t) => N.schedule(t));
renderHud(); renderTimeBtn(); renderKota(); renderTasks(); renderFocus(); syncBrain();
city?.setPoints(S.points(), { animate: false });
if (city) { city.onTap = () => { if (navigator.vibrate) navigator.vibrate(10); }; city.start(); } else toast('WebGL tidak tersedia di perangkat ini. Visual 3D dinonaktifkan.', null, 6000);
if (focus.running) { if (focus.endAt <= Date.now()) focusDone(); else { ftimer = setInterval(focusTick, 250); city?.setOvertime(true); } }
setTab('kota');
requestAnimationFrame(() => { updateInset(); });
window.__kk = { S, city, brain, setTab, afterChange };
