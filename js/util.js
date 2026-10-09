/* Utilitas umum: format angka/tanggal, toast, berkas, dan berbagi. */
const U = (() => {
  const TZ = 'Asia/Jayapura'; // WIT — kedua dapur ada di Ambon
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const fmtNum = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('id-ID');
  const rp = n => 'Rp' + Math.round(+n || 0).toLocaleString('id-ID');
  const rpShort = n => {
    n = +n || 0;
    if (Math.abs(n) >= 1e9) return 'Rp' + (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M';
    if (Math.abs(n) >= 1e6) return 'Rp' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt';
    if (Math.abs(n) >= 1e3) return 'Rp' + (n / 1e3).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' rb';
    return rp(n);
  };

  /* "Rp 12.350.000" → 12350000, "2,5" → 2.5, 65000 → 65000 */
  function parseNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let s = String(v ?? '').replace(/rp\.?/ig, '').replace(/\s/g, '').trim();
    if (!s) return null;
    s = s.replace(/[^\d.,-]/g, '');
    if (!/\d/.test(s)) return null;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  /* Tanggal dalam zona WIT, format YYYY-MM-DD */
  function today(d = new Date()) {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
    const g = t => p.find(x => x.type === t).value;
    return `${g('year')}-${g('month')}-${g('day')}`;
  }
  function nowTime(d = new Date()) {
    return new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d).replace(':', '.');
  }
  const ymd = s => { const [y, m, d] = (s || today()).split('-').map(Number); return { y, m, d }; };
  const dow = s => { const { y, m, d } = ymd(s); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
  const fmtDate = s => { const { y, m, d } = ymd(s); return `${d} ${BULAN[m - 1]} ${y}`; };
  const fmtDateLong = s => `${HARI[dow(s)]}, ${fmtDate(s)}`;
  const fmtDateShort = s => { const { m, d } = ymd(s); return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`; };
  const addDays = (s, n) => { const { y, m, d } = ymd(s); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };

  /* "Ambon, Kamis 01 Oktober 2026" → 2026-10-01 */
  function findDate(text) {
    const re = new RegExp('(\\d{1,2})\\s*(' + BULAN.join('|') + '|' + BULAN.map(b => b.slice(0, 3)).join('|') + ')[a-z]*\\.?\\s*(\\d{4})', 'i');
    const m = String(text).match(re);
    if (!m) return null;
    const mi = BULAN.findIndex(b => b.toLowerCase().startsWith(m[2].toLowerCase().slice(0, 3)));
    if (mi < 0) return null;
    return `${m[3]}-${String(mi + 1).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
  }

  /* Terbilang Bahasa Indonesia untuk invoice */
  function terbilang(n) {
    n = Math.floor(Math.abs(+n || 0));
    const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    const f = x => {
      if (x < 12) return s[x];
      if (x < 20) return f(x - 10) + ' belas';
      if (x < 100) return f(Math.floor(x / 10)) + ' puluh ' + f(x % 10);
      if (x < 200) return 'seratus ' + f(x - 100);
      if (x < 1000) return f(Math.floor(x / 100)) + ' ratus ' + f(x % 100);
      if (x < 2000) return 'seribu ' + f(x - 1000);
      if (x < 1e6) return f(Math.floor(x / 1000)) + ' ribu ' + f(x % 1000);
      if (x < 1e9) return f(Math.floor(x / 1e6)) + ' juta ' + f(x % 1e6);
      if (x < 1e12) return f(Math.floor(x / 1e9)) + ' miliar ' + f(x % 1e9);
      return f(Math.floor(x / 1e12)) + ' triliun ' + f(x % 1e12);
    };
    const out = (n === 0 ? 'nol' : f(n)).replace(/\s+/g, ' ').trim();
    return out.charAt(0).toUpperCase() + out.slice(1) + ' rupiah';
  }

  const normName = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  /* ---------- Umpan balik ---------- */
  function toast(msg, type = 'info', ms = 2600) {
    const root = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 200); }, ms);
  }
  const buzz = (p = 12) => { try { if (localStorage.getItem('haptic') !== '0' && navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(p); } catch (e) {} };

  /* ---------- Berkas ---------- */
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  /* Bagikan file (Android: muncul pilihan WhatsApp, Gmail, Drive). Kembali false kalau tidak didukung. */
  async function shareFiles(files, text = '') {
    try {
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, text, title: files[0]?.name });
        return true;
      }
    } catch (e) {
      if (e.name === 'AbortError') return true;
    }
    return false;
  }
  const readAsArrayBuffer = f => f.arrayBuffer();
  const blobToDataURL = b => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(b); });
  const dataURLToBlob = async u => (await fetch(u)).blob();

  /* Perkecil foto supaya hemat penyimpanan (sisi terpanjang maks 1600px) */
  async function compressImage(file, max = 1600, q = 0.82) {
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) return file;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(ok => c.toBlob(b => ok(b || file), 'image/jpeg', q));
  }

  const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const slug = s => String(s || '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');

  return { TZ, BULAN, HARI, esc, uid, fmtNum, rp, rpShort, parseNum, today, nowTime, fmtDate, fmtDateLong, fmtDateShort, addDays, findDate, terbilang, normName, toast, buzz, download, shareFiles, readAsArrayBuffer, blobToDataURL, dataURLToBlob, compressImage, debounce, slug, ymd };
})();
