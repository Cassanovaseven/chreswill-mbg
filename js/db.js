/* Data online real time (Firebase) dengan cadangan offline.
   - orders/{id}   : nama barang, qty, belanja, antar          → Xander & Gilbert
   - prices/{id}   : harga nota, harga jual, total, invoice    → hanya Xander (Gilbert hanya boleh membuat saat unggah)
   - files/{id}    : nota asli, foto bukti, tanda tangan (dipecah per bagian karena batas 1 MB/dokumen)
   - config/main   : profil CV & daftar dapur
   - private/main  : rekening (hanya Xander)
   PDF invoice disimpan di perangkat Xander saja dan bisa dibuat ulang kapan pun dari data. */
const DB = (() => {
  const FIREBASE = {
    apiKey: 'AIzaSyBOGLglxCa7sVP_svMRH7JT6RO8-gvb9lg',
    authDomain: 'chreswill-mbg.firebaseapp.com',
    projectId: 'chreswill-mbg',
    storageBucket: 'chreswill-mbg.firebasestorage.app',
    messagingSenderId: '899613108301',
    appId: '1:899613108301:web:c3cb9c5508b0fb08555404'
  };
  const XANDER_EMAIL = 'xander@chreswill-mbg.app';
  const PRICE_ITEM = ['hargaNota', 'hargaJual', 'jumlahNota'];
  const PRICE_ORDER = ['totalNota', 'invoice', 'selisihOk'];
  const CHUNK = 700000; // karakter base64 per dokumen

  /* Sesuai template invoice CV. Rekening tidak ditulis di kode (aplikasi online bisa dibuka siapa saja). */
  const DEFAULT_SETTINGS = {
    perusahaan: { nama: 'CV CHERSWILL PENTRA ABADI', badanHukum: 'AHU-01252.AH.02.01.TAHUN 2025', alamat: 'Jl Rijali Gang Vista 3, Kec Sirimau, Kota Ambon, Maluku 97123', telp: '', email: '', bank: '', rekening: '', atasNama: '', kota: 'Ambon', penandatangan: '', jabatan: '' },
    dapur: [
      { id: 'TM', kode: 'TM', nama: 'SPPG Taman Makmur', kepada: 'KA SPPG TAMAN MAKMUR', namaLengkap: 'Dapur BGN SPPG TAMAN MAKMUR', alamat: 'Jl. Dr Malihollo, Kec Nusaniwe, Kota Ambon', kenali: 'taman makmur', jamAntar: '05.00', wa: '' },
      { id: 'NSW', kode: 'ERI', nama: 'SPPG Nusaniwe', kepada: 'KA SPPG NUSANIWE', namaLengkap: 'Dapur BGN SPPG NUSANIWE', alamat: 'Jl. Amanhuse, Lorong Sipadore, Kec Nusaniwe, Kota Ambon, Maluku', kenali: 'amanhuse|sipadore|sppg nusaniwe', jamAntar: '05.00', wa: '' }
    ],
    kontak: { waXander: '', waGil: '' }
  };
  const PRIVATE_KEYS = ['bank', 'rekening', 'atasNama'];

  let fs, auth, user = null, role = null;
  const cache = { orders: new Map(), prices: new Map(), config: null, priv: null };
  const blobCache = new Map();
  const listeners = new Set();
  let unsub = [], ready = null, readyRes;
  const status = { online: navigator.onLine, pending: false, firstLoad: false };

  /* ---------- penyimpanan lokal kecil: PDF invoice di perangkat Xander ---------- */
  const local = (() => {
    let p;
    const open = () => p || (p = new Promise((ok, no) => {
      const r = indexedDB.open('chreswill-local', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id' }).createIndex('orderId', 'orderId');
      r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
    }));
    const run = async (mode, fn) => { const d = await open(); return new Promise((ok, no) => { const t = d.transaction('files', mode); const q = fn(t.objectStore('files')); t.oncomplete = () => ok(q?.result); t.onerror = () => no(t.error); }); };
    return {
      put: f => run('readwrite', s => s.put(f)),
      get: id => run('readonly', s => s.get(id)),
      del: id => run('readwrite', s => s.delete(id)),
      byOrder: id => run('readonly', s => s.index('orderId').getAll(id)),
      all: () => run('readonly', s => s.getAll()),
      clear: () => run('readwrite', s => s.clear())
    };
  })();

  /* ---------- awal ---------- */
  function init() {
    if (ready) return ready;
    ready = new Promise(res => { readyRes = res; });
    firebase.initializeApp(FIREBASE);
    fs = firebase.firestore();
    fs.settings({ ignoreUndefinedProperties: true, merge: true });
    fs.enablePersistence({ synchronizeTabs: true }).catch(() => {}); // tetap jalan offline
    auth = firebase.auth();
    auth.onAuthStateChanged(u => {
      unsub.forEach(f => f()); unsub = [];
      cache.orders.clear(); cache.prices.clear(); cache.config = cache.priv = null;
      user = u; role = u ? (u.email === XANDER_EMAIL ? 'xander' : 'gil') : null;
      if (!u) { status.firstLoad = true; readyRes(); emit({ type: 'auth' }); return; }
      startListeners();
    });
    addEventListener('online', () => { status.online = true; emit({ type: 'status' }); });
    addEventListener('offline', () => { status.online = false; emit({ type: 'status' }); });
    return ready;
  }

  function emit(e) { listeners.forEach(fn => { try { fn(e); } catch (er) { console.error(er); } }); }
  const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

  function startListeners() {
    let need = role === 'xander' ? 4 : 2, got = 0;
    const once = () => { if (++got === need) { status.firstLoad = true; readyRes(); emit({ type: 'auth' }); } };
    const watch = (ref, onSnap) => {
      let first = true;
      unsub.push(ref.onSnapshot({ includeMetadataChanges: true }, snap => {
        status.pending = snap.metadata.hasPendingWrites;
        onSnap(snap, first);
        if (first) { first = false; once(); }
        else emit({ type: 'data', snap, fromServer: !snap.metadata.hasPendingWrites && !snap.metadata.fromCache });
      }, err => { console.warn('sinkron', err); if (first) { first = false; once(); } emit({ type: 'error', err }); }));
    };
    watch(fs.collection('orders'), snap => snap.docChanges().forEach(c => { if (c.type === 'removed') cache.orders.delete(c.doc.id); else cache.orders.set(c.doc.id, c.doc.data()); }));
    watch(fs.collection('config').doc('main'), d => { cache.config = d.exists ? d.data() : null; });
    if (role === 'xander') {
      watch(fs.collection('prices'), snap => snap.docChanges().forEach(c => { if (c.type === 'removed') cache.prices.delete(c.doc.id); else cache.prices.set(c.doc.id, c.doc.data()); }));
      watch(fs.collection('private').doc('main'), d => { cache.priv = d.exists ? d.data() : null; });
    }
  }

  /* ---------- masuk / keluar ---------- */
  const authApi = {
    get user() { return user; },
    get role() { return role; },
    async gil() { await auth.signInAnonymously(); },
    async xander(password) { await auth.signInWithEmailAndPassword(XANDER_EMAIL, password); },
    async out() { await auth.signOut(); },
    async changePassword(oldPw, newPw) {
      const cred = firebase.auth.EmailAuthProvider.credential(XANDER_EMAIL, oldPw);
      await user.reauthenticateWithCredential(cred);
      await user.updatePassword(newPw);
    }
  };

  /* ---------- pengaturan ---------- */
  async function settings() {
    await ready;
    const c = cache.config || {};
    const s = {
      perusahaan: { ...DEFAULT_SETTINGS.perusahaan, ...(c.perusahaan || {}), ...(cache.priv || {}) },
      dapur: (c.dapur && c.dapur.length ? c.dapur : DEFAULT_SETTINGS.dapur).map(d => ({ ...d })),
      kontak: { ...DEFAULT_SETTINGS.kontak, ...(c.kontak || {}) }
    };
    return s;
  }
  async function saveSettings(s) {
    const pub = structuredClone(s.perusahaan), priv = {};
    PRIVATE_KEYS.forEach(k => { priv[k] = pub[k] || ''; delete pub[k]; });
    await fs.collection('config').doc('main').set({ perusahaan: pub, dapur: s.dapur, kontak: s.kontak });
    if (role === 'xander') await fs.collection('private').doc('main').set(priv);
  }

  /* ---------- permintaan ---------- */
  function merged(id) {
    const o = cache.orders.get(id);
    if (!o) return null;
    const out = structuredClone(o);
    out.id = id;
    const p = cache.prices.get(id);
    if (p) {
      PRICE_ORDER.forEach(k => { if (p[k] !== undefined) out[k] = p[k]; });
      out.items = (out.items || []).map(it => ({ ...it, ...((p.items || {})[it.id] || {}) }));
    }
    out.items = out.items || [];
    return out;
  }
  function split(o) {
    const ord = structuredClone(o), pr = { items: {} };
    PRICE_ORDER.forEach(k => { if (o[k] !== undefined) pr[k] = o[k]; delete ord[k]; });
    ord.items = (o.items || []).map(it => {
      const x = { ...it }, p = {};
      PRICE_ITEM.forEach(k => { if (it[k] !== undefined && it[k] !== null) p[k] = it[k]; delete x[k]; });
      pr.items[it.id] = p;
      return x;
    });
    delete ord.id;
    return { ord, pr };
  }
  const strip = v => JSON.parse(JSON.stringify(v)); // buang undefined
  const sameExceptLog = (a, b) => { const x = { ...a }, y = { ...b }; delete x.log; delete y.log; delete x.updatedAt; delete y.updatedAt; return JSON.stringify(x) === JSON.stringify(y); };

  const orders = {
    async all() {
      await ready;
      return [...cache.orders.keys()].map(merged).filter(Boolean)
        .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.createdAt || 0) - (a.createdAt || 0));
    },
    async get(id) { await ready; return merged(id); },
    /* opts.newFromGil: Gilbert boleh membuat dokumen harga satu kali saat unggah nota */
    async put(o, opts = {}) {
      const { ord, pr } = split(o);
      const ref = fs.collection('orders').doc(o.id);
      const prev = cache.orders.get(o.id);
      ord.updatedAt = Date.now(); ord.updatedBy = role;
      const ordClean = strip(ord);
      const writes = [];
      if (!prev) writes.push(ref.set(ordClean));
      else if (!sameExceptLog(prev, ordClean)) writes.push(ref.set(ordClean));
      else {
        const newLog = (ordClean.log || []).slice((prev.log || []).length);
        if (newLog.length) writes.push(ref.update({ log: firebase.firestore.FieldValue.arrayUnion(...newLog) }));
      }
      cache.orders.set(o.id, ordClean); // langsung tampil, tanpa menunggu server
      if (role === 'xander') { const p = strip(pr); cache.prices.set(o.id, p); writes.push(fs.collection('prices').doc(o.id).set(p)); }
      else if (opts.newFromGil) writes.push(fs.collection('prices').doc(o.id).set(strip(pr)));
      // offline: penulisan menunggu di antrean dan dikirim otomatis saat online
      await Promise.race([Promise.all(writes), new Promise(r => setTimeout(r, 1500))]);
    },
    async del(id) {
      for (const f of await files.byOrder(id)) await files.del(f.id);
      cache.orders.delete(id); cache.prices.delete(id);
      await Promise.race([Promise.all([fs.collection('orders').doc(id).delete(), fs.collection('prices').doc(id).delete()]), new Promise(r => setTimeout(r, 1500))]);
    }
  };

  /* ---------- berkas ---------- */
  const files = {
    async put(f) {
      if (f.kind === 'invoice') { await local.put(f); return; }
      const data = (await U.blobToDataURL(f.blob)).split(',')[1] || '';
      const parts = Math.max(1, Math.ceil(data.length / CHUNK));
      blobCache.set(f.id, f.blob);
      const batch = fs.batch();
      batch.set(fs.collection('files').doc(f.id), { orderId: f.orderId, kind: f.kind, name: f.name, type: f.type || 'application/octet-stream', t: f.t || Date.now(), parts, size: f.blob.size, by: role });
      for (let i = 0; i < parts; i++) batch.set(fs.collection('files').doc(`${f.id}__${i}`), { parent: f.id, i, data: data.slice(i * CHUNK, (i + 1) * CHUNK) });
      await Promise.race([batch.commit(), new Promise(r => setTimeout(r, 2500))]);
    },
    async get(id) {
      const l = await local.get(id); if (l) return l;
      const m = await fs.collection('files').doc(id).get();
      if (!m.exists) return null;
      return withBlob(id, m.data());
    },
    async del(id) {
      const l = await local.get(id); if (l) { await local.del(id); return; }
      const m = await fs.collection('files').doc(id).get();
      const parts = m.exists ? m.data().parts : 0;
      const batch = fs.batch();
      batch.delete(fs.collection('files').doc(id));
      for (let i = 0; i < parts; i++) batch.delete(fs.collection('files').doc(`${id}__${i}`));
      blobCache.delete(id);
      await Promise.race([batch.commit(), new Promise(r => setTimeout(r, 1500))]);
    },
    async byOrder(orderId) {
      const out = await local.byOrder(orderId);
      try {
        const q = await fs.collection('files').where('orderId', '==', orderId).get();
        for (const d of q.docs) out.push(await withBlob(d.id, d.data()));
      } catch (e) { console.warn('berkas', e); }
      return out.sort((a, b) => (a.t || 0) - (b.t || 0));
    },
    async all() {
      const out = await local.all();
      const q = await fs.collection('files').where('parts', '>=', 1).get();
      for (const d of q.docs) out.push(await withBlob(d.id, d.data()));
      return out;
    }
  };
  async function withBlob(id, meta) {
    if (!blobCache.has(id)) {
      let data = '';
      for (let i = 0; i < meta.parts; i++) { const c = await fs.collection('files').doc(`${id}__${i}`).get(); data += c.exists ? c.data().data : ''; }
      blobCache.set(id, await U.dataURLToBlob(`data:${meta.type};base64,${data}`));
    }
    return { id, ...meta, blob: blobCache.get(id) };
  }

  /* Nomor invoice sesuai template: 02/ERI/10/26. Dua invoice dapur sama di hari sama: 02/ERI/10/26-2 */
  async function nextInvoiceNo(dapur, tanggal, exceptId) {
    const { y, m, d } = U.ymd(tanggal);
    const base = `${String(d).padStart(2, '0')}/${dapur.kode}/${String(m).padStart(2, '0')}/${String(y).slice(2)}`;
    const used = new Set((await orders.all()).filter(o => o.id !== exceptId && o.invoice).map(o => o.invoice.no));
    let no = base, n = 1;
    while (used.has(no)) no = `${base}-${++n}`;
    return no;
  }

  /* Keluar dan hapus salinan di perangkat ini (data online tetap aman) */
  async function wipe() {
    await local.clear();
    try { await auth.signOut(); } catch (e) {}
    try { await fs.terminate(); await fs.clearPersistence(); } catch (e) {}
  }
  async function persist() { try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch (e) {} }

  return { init, onChange, auth: authApi, status, settings, saveSettings, nextInvoiceNo, orders, files, wipe, persist, DEFAULT_SETTINGS, XANDER_EMAIL };
})();
