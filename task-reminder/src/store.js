const KEY = 'kotakarya.v1';

export const LEVELS = [
  { at: 0, name: 'Garasi Rintisan' },
  { at: 1, name: 'Kantor Mungil' },
  { at: 3, name: 'Studio Kreatif' },
  { at: 6, name: 'Gedung Menengah' },
  { at: 10, name: 'Kantor Pusat' },
  { at: 16, name: 'Menara Korporat' },
  { at: 24, name: 'Kampus Teknologi' },
  { at: 35, name: 'Distrik Bisnis' },
  { at: 50, name: 'Metropolis' },
  { at: 75, name: 'Imperium Karya' },
];

export const ACHIEVEMENTS = [
  { id: 'first', title: 'Batu pertama', desc: 'Selesaikan tugas pertama', test: (s) => s.stats.completed >= 1 },
  { id: 'five', title: 'Tim kecil', desc: 'Selesaikan 5 tugas', test: (s) => s.stats.completed >= 5 },
  { id: 'twentyfive', title: 'Ekspansi', desc: 'Selesaikan 25 tugas', test: (s) => s.stats.completed >= 25 },
  { id: 'streak3', title: 'Tiga hari beruntun', desc: 'Streak 3 hari', test: (s) => s.stats.bestStreak >= 3 },
  { id: 'streak7', title: 'Seminggu penuh', desc: 'Streak 7 hari', test: (s) => s.stats.bestStreak >= 7 },
  { id: 'day5', title: 'Hari produktif', desc: '5 tugas dalam sehari', test: (s) => Object.values(s.stats.byDay).some((n) => n >= 5) },
  { id: 'focus', title: 'Mode fokus', desc: 'Selesaikan 1 sesi fokus', test: (s) => s.stats.sessions >= 1 },
  { id: 'ideas', title: 'Otak berputar', desc: 'Catat 10 ide', test: (s) => s.stats.ideasMade >= 10 },
  { id: 'convert', title: 'Dari ide ke aksi', desc: 'Ubah ide jadi tugas', test: (s) => s.stats.ideasToTasks >= 1 },
];

const fresh = () => ({
  v: 1,
  company: 'Perusahaan Saya',
  tasks: [],
  brain: { topic: 'Ide besar saya', ideas: [] },
  stats: { completed: 0, sessions: 0, focusMin: 0, streak: 0, bestStreak: 0, lastDay: null, byDay: {}, ideasMade: 0, ideasToTasks: 0 },
  unlocked: {},
  settings: { focusMin: 25 },
});

export const dayKey = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

let state = fresh();
const subs = new Set();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...fresh(), ...JSON.parse(raw) };
    state.stats = { ...fresh().stats, ...state.stats };
  } catch { state = fresh(); }
  return state;
}
export const get = () => state;
export function commit() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* penyimpanan penuh atau diblokir */ }
  subs.forEach((f) => f(state));
}
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };

export const points = (s = state) => s.stats.completed + Math.floor(s.stats.sessions / 2);

export function levelInfo(p = points()) {
  let idx = 0;
  LEVELS.forEach((l, i) => { if (p >= l.at) idx = i; });
  const next = LEVELS[idx + 1] || null;
  const cur = LEVELS[idx];
  return { index: idx, name: cur.name, next, progress: next ? (p - cur.at) / (next.at - cur.at) : 1, remaining: next ? next.at - p : 0 };
}

export function currentStreak(s = state) {
  const { lastDay, streak } = s.stats;
  if (!lastDay) return 0;
  const today = dayKey();
  const y = new Date(); y.setDate(y.getDate() - 1);
  return lastDay === today || lastDay === dayKey(y) ? streak : 0;
}

export function uid() {
  return Math.floor(Math.random() * 2000000000) + 1;
}

export function checkAchievements() {
  const gained = [];
  ACHIEVEMENTS.forEach((a) => {
    if (!state.unlocked[a.id] && a.test(state)) { state.unlocked[a.id] = Date.now(); gained.push(a); }
  });
  return gained;
}

export function addTask({ title, note, due, prio, remind, repeat }) {
  const t = { id: uid(), title, note: note || '', due: due || null, prio: prio || 2, remind: remind ?? 0, repeat: repeat || 'none', done: false, doneAt: null, created: Date.now(), notified: false };
  state.tasks.unshift(t);
  commit();
  return t;
}
export function updateTask(id, patch) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return null;
  Object.assign(t, patch);
  if ('due' in patch || 'remind' in patch) t.notified = false;
  commit();
  return t;
}
export function removeTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  commit();
}

export function completeTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t || t.done) return null;
  t.done = true; t.doneAt = Date.now();
  const s = state.stats;
  s.completed += 1;
  const today = dayKey();
  s.byDay[today] = (s.byDay[today] || 0) + 1;
  if (s.lastDay !== today) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    s.streak = s.lastDay === dayKey(y) ? s.streak + 1 : 1;
    s.lastDay = today;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
  }
  let next = null;
  if (t.repeat !== 'none' && t.due) {
    const d = new Date(t.due);
    d.setDate(d.getDate() + (t.repeat === 'daily' ? 1 : 7));
    while (d.getTime() < Date.now()) d.setDate(d.getDate() + (t.repeat === 'daily' ? 1 : 7));
    next = { ...t, id: uid(), done: false, doneAt: null, due: d.toISOString(), created: Date.now(), notified: false };
    state.tasks.unshift(next);
  }
  commit();
  return { task: t, next };
}

export function undoComplete(id, nextId) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t || !t.done) return;
  t.done = false; t.doneAt = null;
  const s = state.stats, today = dayKey();
  s.completed = Math.max(0, s.completed - 1);
  s.byDay[today] = Math.max(0, (s.byDay[today] || 1) - 1);
  if (nextId) state.tasks = state.tasks.filter((x) => x.id !== nextId);
  commit();
}

export function addSession(min) {
  state.stats.sessions += 1;
  state.stats.focusMin += min;
  commit();
}

export function last7() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    out.push({ key: dayKey(d), label: d.toLocaleDateString('id-ID', { weekday: 'short' }).slice(0, 3), n: state.stats.byDay[dayKey(d)] || 0 });
  }
  return out;
}
