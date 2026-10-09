/* Service worker: aplikasi tetap terbuka tanpa internet. */
const VERSION = 'chreswill-v2.0.0';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/util.js', 'js/db.js', 'js/parse.js', 'js/ocr.js', 'js/invoice.js', 'js/sync.js', 'js/app.js',
  'js/scene3d.js', 'vendor/three.min.js', 'vendor/firebase/firebase-app-compat.js', 'vendor/firebase/firebase-auth-compat.js', 'vendor/firebase/firebase-firestore-compat.js',
  'vendor/xlsx.full.min.js', 'vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js', 'vendor/jszip.min.js',
  'fonts/pjs-400.woff2', 'fonts/pjs-500.woff2', 'fonts/pjs-700.woff2', 'fonts/pjs-800.woff2',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];
// Mesin baca foto (±9 MB) disimpan saat pertama kali dipakai, atau di latar belakang setelah pemasangan.
const OCR_FILES = ['vendor/tesseract/tesseract.min.js', 'vendor/tesseract/worker.min.js', 'vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js', 'vendor/tesseract/core/tesseract-core-lstm.wasm.js', 'vendor/tesseract/lang/ind.traineddata.gz'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
    const c = await caches.open(VERSION);
    for (const f of OCR_FILES) { if (!(await c.match(f))) c.add(f).catch(() => {}); }
  })());
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit) {
      // perbarui di latar belakang untuk file aplikasi
      if (!url.pathname.includes('/vendor/')) fetch(e.request).then(r => { if (r.ok) c.put(e.request, r); }).catch(() => {});
      return hit;
    }
    try {
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      if (e.request.mode === 'navigate') return (await c.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
