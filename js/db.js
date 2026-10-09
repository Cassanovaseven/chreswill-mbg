/* Penyimpanan lokal (IndexedDB) — semua data tetap ada walau tanpa internet. */
const DB = (() => {
  const NAME = 'chreswill-mbg', VER = 1;
  let dbp;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((ok, no) => {
      const r = indexedDB.open(NAME, VER);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('orders')) {
          const s = d.createObjectStore('orders', { keyPath: 'id' });
          s.createIndex('tanggal', 'tanggal');
        }
        if (!d.objectStoreNames.contains('files')) {
          const s = d.createObjectStore('files', { keyPath: 'id' });
          s.createIndex('orderId', 'orderId');
        }
      };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    });
    return dbp;
  }
  const req = r => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  async function tx(store, mode, fn) {
    const d = await open();
    const t = d.transaction(store, mode);
    const res = await fn(t.objectStore(store));
    await new Promise((ok, no) => { t.oncomplete = ok; t.onerror = () => no(t.error); t.onabort = () => no(t.error); });
    return res;
  }

  /* Sesuai template invoice CV. Data rekening sengaja tidak ditulis di sini (aplikasi online bisa dibuka
     siapa saja); Xander mengisinya sekali di menu Atur. */
  const DEFAULT_SETTINGS = {
    perusahaan: {
      nama: 'CV CHERSWILL PENTRA ABADI',
      badanHukum: 'AHU-01252.AH.02.01.TAHUN 2025',
      alamat: 'Jl Rijali Gang Vista 3, Kec Sirimau, Kota Ambon, Maluku 97123',
      telp: '',
      email: '',
      bank: '',
      rekening: '',
      atasNama: '',
      kota: 'Ambon',
      penandatangan: '',
      jabatan: ''
    },
    dapur: [
      { id: 'TM', kode: 'TM', nama: 'SPPG Taman Makmur', kepada: 'KA SPPG TAMAN MAKMUR', namaLengkap: 'Dapur BGN SPPG TAMAN MAKMUR', alamat: 'Jl. Dr Malihollo, Kec Nusaniwe, Kota Ambon', kenali: 'taman makmur', jamAntar: '05.00', wa: '' },
      { id: 'NSW', kode: 'ERI', nama: 'SPPG Nusaniwe', kepada: 'KA SPPG NUSANIWE', namaLengkap: 'Dapur BGN SPPG NUSANIWE', alamat: 'Jl. Amanhuse, Lorong Sipadore, Kec Nusaniwe, Kota Ambon, Maluku', kenali: 'amanhuse|sipadore|sppg nusaniwe', jamAntar: '05.00', wa: '' }
    ],
    kontak: { waXander: '', waGil: '' },
    counters: {}
  };

  const kv = {
    get: async k => tx('kv', 'readonly', s => req(s.get(k))),
    set: async (k, v) => tx('kv', 'readwrite', s => req(s.put(v, k)))
  };

  async function settings() {
    const s = await kv.get('settings');
    if (!s) { await kv.set('settings', structuredClone(DEFAULT_SETTINGS)); return structuredClone(DEFAULT_SETTINGS); }
    return { ...structuredClone(DEFAULT_SETTINGS), ...s, perusahaan: { ...DEFAULT_SETTINGS.perusahaan, ...s.perusahaan }, kontak: { ...DEFAULT_SETTINGS.kontak, ...s.kontak } };
  }
  const saveSettings = s => kv.set('settings', s);

  /* Nomor invoice sesuai template: 02/ERI/10/26 (tanggal/kode dapur/bulan/tahun).
     Bila ada dua invoice untuk dapur yang sama di hari yang sama: 02/ERI/10/26-2 */
  async function nextInvoiceNo(dapur, tanggal, exceptId) {
    const { y, m, d } = U.ymd(tanggal);
    const base = `${String(d).padStart(2, '0')}/${dapur.kode}/${String(m).padStart(2, '0')}/${String(y).slice(2)}`;
    const used = new Set((await orders.all()).filter(o => o.id !== exceptId && o.invoice).map(o => o.invoice.no));
    let no = base, n = 1;
    while (used.has(no)) no = `${base}-${++n}`;
    return no;
  }

  const orders = {
    all: async () => (await tx('orders', 'readonly', s => req(s.getAll()))).sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.createdAt || 0) - (a.createdAt || 0)),
    get: id => tx('orders', 'readonly', s => req(s.get(id))),
    put: o => { o.updatedAt = Date.now(); return tx('orders', 'readwrite', s => req(s.put(o))); },
    del: async id => {
      const fs = await files.byOrder(id);
      await tx('files', 'readwrite', s => Promise.all(fs.map(f => req(s.delete(f.id)))));
      return tx('orders', 'readwrite', s => req(s.delete(id)));
    }
  };
  const files = {
    put: f => tx('files', 'readwrite', s => req(s.put(f))),
    get: id => tx('files', 'readonly', s => req(s.get(id))),
    del: id => tx('files', 'readwrite', s => req(s.delete(id))),
    byOrder: id => tx('files', 'readonly', s => req(s.index('orderId').getAll(id))),
    all: () => tx('files', 'readonly', s => req(s.getAll()))
  };

  async function wipe() {
    for (const st of ['kv', 'orders', 'files']) await tx(st, 'readwrite', s => req(s.clear()));
  }

  /* Minta browser tidak menghapus data otomatis */
  async function persist() { try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch (e) {} }

  return { open, kv, settings, saveSettings, nextInvoiceNo, orders, files, wipe, persist, DEFAULT_SETTINGS };
})();
