import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const native = Capacitor.isNativePlatform();
let granted = false;

export async function ensurePermission() {
  try {
    if (native) {
      let p = await LocalNotifications.checkPermissions();
      if (p.display !== 'granted') p = await LocalNotifications.requestPermissions();
      granted = p.display === 'granted';
    } else if ('Notification' in window) {
      if (Notification.permission === 'default') await Notification.requestPermission();
      granted = Notification.permission === 'granted';
    }
  } catch { granted = false; }
  return granted;
}
export const hasPermission = () => granted;

export async function setupChannel() {
  if (!native) return;
  try {
    await LocalNotifications.createChannel({ id: 'tugas', name: 'Pengingat tugas', description: 'Pengingat tenggat tugas', importance: 4, visibility: 1, vibration: true });
  } catch { /* kanal sudah ada */ }
}

export function fireAtOf(task) {
  if (!task.due || task.done) return null;
  return new Date(new Date(task.due).getTime() - (task.remind || 0) * 60000);
}

export async function schedule(task) {
  await cancel(task.id);
  const at = fireAtOf(task);
  if (!native || !at || at.getTime() <= Date.now()) return;
  if (!granted && !(await ensurePermission())) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: task.id, title: task.remind ? 'Tugas segera jatuh tempo' : 'Waktunya mengerjakan',
        body: task.title, channelId: 'tugas', schedule: { at, allowWhileIdle: true },
      }],
    });
  } catch { /* tanpa izin alarm tepat, sistem akan menjadwalkan mendekati waktu */ }
}
export async function cancel(id) {
  if (!native) return;
  try { await LocalNotifications.cancel({ notifications: [{ id }] }); } catch { /* abaikan */ }
}
export async function scheduleFocusEnd(endAt, label) {
  if (!native) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    if (!granted && !(await ensurePermission())) return;
    await LocalNotifications.schedule({ notifications: [{ id: 1, title: 'Sesi fokus selesai', body: label, channelId: 'tugas', schedule: { at: new Date(endAt), allowWhileIdle: true } }] });
  } catch { /* abaikan */ }
}
export async function cancelFocusEnd() {
  if (!native) return;
  try { await LocalNotifications.cancel({ notifications: [{ id: 1 }] }); } catch { /* abaikan */ }
}

// Cadangan di web / saat aplikasi terbuka: kembalikan tugas yang waktunya sudah tiba.
export function dueNow(tasks) {
  const now = Date.now();
  return tasks.filter((t) => {
    const at = fireAtOf(t);
    return at && !t.notified && at.getTime() <= now;
  });
}
export function webNotify(title, body) {
  if (!native && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body }); } catch { /* abaikan */ }
  }
  if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
}
export const isNative = native;
