/* Aplikasi Chreswill MBG — tampilan dan alur kerja Xander (admin) dan Gil (lapangan). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = U.esc;

  /* ---------- Ikon ---------- */
  const P = {
    home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
    inbox: '<path d="M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5"/>',
    cart: '<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    archive: '<path d="M3 5h18v4H3zM5 9v10h14V9M10 13h4"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    send: '<path d="M4 12l16-8-6 16-2-7z"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-3.8M8.2 13l7.6 3.8"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17v.5"/>',
    pkg: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    basket: '<path d="M3 10h18l-2 10H5z"/><path d="M8 10l4-6 4 6"/>'
  };
  const ic = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

  /* ---------- Keadaan ---------- */
  const S = { role: null, settings: null, orders: [], drafts: [], editOrderId: null };
  try { S.role = localStorage.getItem('role'); } catch (e) {}

  const STATUS = { baru: 'Baru', belanja: 'Sedang belanja', dibeli: 'Sudah dibeli', diantar: 'Diantar', selesai: 'Selesai' };
  const status = o => o.antar?.selesai ? 'selesai' : o.antar?.mulai ? 'diantar' : Calc.semuaDibeli(o) ? 'dibeli' : Calc.dibeli(o) ? 'belanja' : 'baru';
  const badge = o => { const s = status(o); return `<span class="badge b-${s}">${STATUS[s]}</span>`; };
  const dapurOf = o => S.settings.dapur.find(d => d.id === o.dapurId);
  const dapurName = o => dapurOf(o)?.nama || 'Dapur belum dipilih';
  const isX = () => S.role === 'xander';
  const aktif = o => status(o) !== 'selesai' || o.tanggal >= U.today();

  async function load() {
    S.settings = await DB.settings();
    S.orders = await DB.orders.all();
  }

  /* ---------- Lembar (modal) ---------- */
  function sheet(html, mount) {
    const root = $('#sheet-root');
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    root.appendChild(scrim);
    const prevFocus = document.activeElement;
    const close = () => {
      if (!scrim.isConnected) return;
      scrim.classList.add('out');
      setTimeout(() => { scrim.remove(); prevFocus?.focus?.(); }, 180);
      document.removeEventListener('keydown', onKey);
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    scrim.addEventListener('click', e => { if (e.target === scrim) close(); });
    $$('[data-close]', scrim).forEach(b => b.onclick = close);
    mount && mount(scrim, close);
    setTimeout(() => ($('[autofocus]', scrim) || $('.sheet', scrim)).focus?.(), 60);
    return close;
  }
  function confirmSheet({ title, body = '', ok = 'Lanjutkan', danger = false, cancel = 'Batal' }) {
    return new Promise(res => {
      let done = false;
      sheet(`<h2>${E(title)}</h2>${body ? `<p class="mute" style="margin:8px 0 18px">${body}</p>` : '<div style="height:16px"></div>'}
        <div class="stack"><button class="btn block ${danger ? 'danger' : 'primary'}" data-ok>${E(ok)}</button><button class="btn block ghost" data-close>${E(cancel)}</button></div>`,
        (el, close) => {
          $('[data-ok]', el).onclick = () => { done = true; close(); res(true); };
          const obs = new MutationObserver(() => { if (!el.isConnected) { obs.disconnect(); if (!done) res(false); } });
          obs.observe($('#sheet-root'), { childList: true });
        });
    });
  }

  /* ---------- Input uang: tampil 12.350.000 saat diketik ---------- */
  function moneyInput(el) {
    const fmt = () => {
      const n = U.parseNum(el.value);
      const atEnd = el.selectionStart === el.value.length;
      el.value = n === null ? '' : Math.round(n).toLocaleString('id-ID');
      if (atEnd) el.setSelectionRange(el.value.length, el.value.length);
    };
    el.addEventListener('input', fmt);
    el.addEventListener('focus', () => setTimeout(() => el.select(), 0));
  }

  /* ---------- Navigasi ---------- */
  const NAV = {
    xander: [['beranda', 'Beranda', 'home'], ['permintaan', 'Permintaan', 'inbox'], ['invoice', 'Invoice', 'receipt'], ['arsip', 'Arsip', 'archive'], ['pengaturan', 'Atur', 'gear']],
    gil: [['beranda', 'Beranda', 'home'], ['belanja', 'Belanja', 'cart'], ['antar', 'Antar', 'truck'], ['pengaturan', 'Atur', 'gear']]
  };
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [name = 'beranda', id] = h.split('/');
    return { name: name || 'beranda', id };
  }
  const go = h => { if (location.hash === h) render(); else location.hash = h; };

  function applyTheme() {
    let t = 'auto';
    try { t = localStorage.getItem('theme') || 'auto'; } catch (e) {}
    const dark = t === 'dark' || (t === 'auto' && S.role === 'xander');
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('meta[name=theme-color]').content = dark ? '#1B1236' : '#EEF6E2';
  }

  function renderNav(cur) {
    const nav = $('#nav');
    if (!S.role) { nav.innerHTML = ''; nav.hidden = true; return; }
    nav.hidden = false;
    const counts = {
      belanja: S.orders.filter(o => aktif(o) && !Calc.semuaDibeli(o)).reduce((s, o) => s + o.items.length - Calc.dibeli(o), 0),
      antar: S.orders.filter(o => Calc.semuaDibeli(o) && !o.antar?.selesai).length,
      invoice: S.orders.filter(o => Calc.semuaDibeli(o) && !o.invoice).length,
      permintaan: S.orders.filter(o => Calc.selisihNota(o) && !o.selisihOk).length
    };
    nav.innerHTML = `<div class="brand">Chreswill MBG<small>${E(S.settings.perusahaan.nama)}</small></div>` +
      NAV[S.role].map(([k, l, i]) => `<a href="#/${k}" ${cur === k ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${counts[k] ? `<span class="dot">${counts[k] > 99 ? '99+' : counts[k]}</span>` : ''}</a>`).join('') +
      `<div class="who">Masuk sebagai <b>${isX() ? 'Xander' : 'Gil'}</b></div>`;
  }

  async function render() {
    await load();
    applyTheme();
    const r = route();
    const view = $('#view');
    if (!S.role) { renderNav(); view.innerHTML = welcome(); mountWelcome(view); return; }
    const allowed = NAV[S.role].map(n => n[0]).concat(isX() ? ['tinjau', 'antar'] : []);
    const name = allowed.includes(r.name) ? r.name : 'beranda';
    renderNav(name);
    const V = isX() ? XV : GV;
    const fn = V[name] || V.beranda;
    const res = await fn(r.id);
    view.innerHTML = res.html;
    res.mount && res.mount(view);
    view.focus({ preventScroll: true });
  }

  /* ---------- Masuk ---------- */
  function welcome() {
    return `<div class="welcome"><div class="box fade-in">
      <p class="mute small">${E(S.settings.perusahaan.nama)}</p>
      <h1 style="margin:4px 0 6px">Selamat datang</h1>
      <p class="mute">Pilih siapa yang memakai perangkat ini. Bisa diganti kapan saja di menu Atur.</p>
      <button class="card tap role-card" data-role="xander"><span class="av" style="background:#1B1236;color:var(--tosca)">X</span><span><b>Xander</b><br><span class="mute small">Admin: permintaan, invoice, arsip</span></span></button>
      <button class="card tap role-card" data-role="gil"><span class="av" style="background:var(--tosca);color:#1B1236">G</span><span><b>Gil</b><br><span class="mute small">Lapangan: belanja dan antar</span></span></button>
    </div></div>`;
  }
  function mountWelcome(v) {
    $$('[data-role]', v).forEach(b => b.onclick = () => { S.role = b.dataset.role; try { localStorage.setItem('role', S.role); } catch (e) {} U.buzz(); go('#/beranda'); });
  }

  /* ---------- Terima paket / cadangan ---------- */
  function pickFile(accept, multiple = false) {
    return new Promise(res => {
      const i = document.createElement('input');
      i.type = 'file'; i.accept = accept; i.multiple = multiple;
      i.onchange = () => res([...i.files]);
      i.click();
    });
  }
  async function receivePaket(fileList) {
    const files = fileList || await pickFile('.json,application/json');
    for (const f of files) {
      try {
        const res = await Sync.applyPaket(await f.text(), S.role);
        if (res.backup) {
          const ok = await confirmSheet({ title: 'Pulihkan dari cadangan?', body: `Cadangan tanggal ${U.fmtDate(U.today(new Date(res.backup.createdAt)))} berisi ${res.backup.orders.length} permintaan. Data di perangkat ini akan diganti.`, ok: 'Pulihkan', danger: true });
          if (!ok) continue;
          const n = await Sync.restore(res.backup);
          U.toast(`${n} permintaan dipulihkan`, 'ok');
        } else {
          U.toast(res.from === 'xander' ? `Daftar belanja diterima: ${res.count} permintaan` : `Hasil belanja Gil diterima: ${res.count} permintaan`, 'ok');
          U.buzz([10, 40, 10]);
        }
      } catch (e) { U.toast(e.message, 'error', 4000); }
    }
    render();
  }
  async function sendPaket(orders) {
    if (!orders.length) { U.toast('Belum ada permintaan untuk dikirim', 'warn'); return; }
    const file = await Sync.makePaket(S.role, orders);
    const to = isX() ? 'Gil' : 'Xander';
    const text = isX()
      ? `Daftar belanja ${orders.map(o => dapurName(o) + ' ' + U.fmtDateShort(o.tanggal)).join(', ')}. Buka file ini di aplikasi Chreswill > Terima paket.`
      : `Hasil belanja dan antar. Buka file ini di aplikasi Chreswill > Terima paket.`;
    const shared = await U.shareFiles([file], text);
    if (!shared) {
      U.download(file, file.name);
      const wa = (isX() ? S.settings.kontak.waGil : S.settings.kontak.waXander || '').replace(/\D/g, '').replace(/^0/, '62');
      sheet(`<h2>Paket untuk ${to} sudah diunduh</h2><p class="mute" style="margin:8px 0 16px">Kirim file <b>${E(file.name)}</b> ke ${to} lewat WhatsApp. ${to} membukanya di menu <b>Terima paket</b>.</p>
        <div class="stack">${wa ? `<a class="btn primary block" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${encodeURIComponent(text)}">${ic('send')} Buka WhatsApp ${to}</a>` : `<p class="small mute">Isi nomor WhatsApp ${to} di menu Atur supaya tombol WhatsApp muncul di sini.</p>`}
        <button class="btn block ghost" data-close>Tutup</button></div>`);
    }
    orders.forEach(o => { o.log = [...(o.log || []), { t: Date.now(), m: `Paket dikirim ke ${to}` }]; DB.orders.put(o); });
  }

  /* ---------- Harga terakhir (untuk saran) ---------- */
  function lastPrice(nama, field, exceptOrderId) {
    const k = U.normName(nama);
    let best = null;
    for (const o of S.orders) {
      if (o.id === exceptOrderId) continue;
      for (const it of o.items) if (U.normName(it.nama) === k && it[field] != null && !it.kosong) {
        if (!best || o.tanggal > best.tanggal) best = { tanggal: o.tanggal, harga: it[field] };
      }
    }
    return best;
  }

  /* ---------- Grafik garis kecil ---------- */
  function spark(values, label) {
    const max = Math.max(...values, 1), n = values.length;
    const pts = values.map((v, i) => `${(i / (n - 1)) * 300},${58 - (v / max) * 50}`).join(' ');
    const last = values[n - 1];
    return `<svg class="spark" viewBox="0 0 300 64" preserveAspectRatio="none" role="img" aria-label="${E(label)}">
      <polyline points="${pts}" fill="none" stroke="var(--acc)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      <circle cx="300" cy="${58 - (last / max) * 50}" r="4" fill="var(--acc)"/></svg>`;
  }

  /* ============================================================
     XANDER
     ============================================================ */
  const XV = {};

  XV.beranda = async () => {
    const t = U.today(), month = t.slice(0, 7);
    const hariIni = S.orders.filter(o => o.tanggal === t);
    const bulan = S.orders.filter(o => o.tanggal.startsWith(month));
    const invBulan = bulan.filter(o => o.invoice);
    const nilai = invBulan.reduce((s, o) => s + Calc.total(o), 0);
    const untung = bulan.reduce((s, o) => s + Calc.untung(o), 0);
    const belumBayar = S.orders.filter(o => o.invoice && !o.invoice.lunas);
    const siapInvoice = S.orders.filter(o => Calc.semuaDibeli(o) && !o.invoice);
    const selisih = S.orders.filter(o => Calc.selisihNota(o) && !o.selisihOk);
    const belumArsip = S.orders.filter(o => o.antar?.selesai && !o.arsipAt);
    const days = [...Array(14)].map((_, i) => U.addDays(t, i - 13));
    const series = days.map(d => S.orders.filter(o => o.tanggal === d).reduce((s, o) => s + Calc.total(o), 0));
    const totItems = hariIni.reduce((s, o) => s + o.items.length, 0), totDone = hariIni.reduce((s, o) => s + Calc.dibeli(o), 0);

    const alerts = [
      ...(!S.settings.perusahaan.rekening ? [`<a class="card warn tap row" href="#/pengaturan"><span class="grow"><b>Isi data rekening untuk invoice</b><br><span class="small">Bank, nomor rekening, dan atas nama di menu Atur</span></span></a>`] : []),
      ...selisih.map(o => `<a class="card warn tap row" href="#/permintaan/${o.id}">${ic('alert').replace('<svg', '<svg style="width:22px;height:22px;flex:none;stroke:currentColor;fill:none;stroke-width:2"')}<span class="grow"><b>Total nota ${E(dapurName(o))} ${U.fmtDateShort(o.tanggal)} tidak cocok</b><br><span class="small">Tertulis ${U.rp(o.totalNota)}, hasil hitung ${U.rp(Calc.notaHitung(o))} (selisih ${U.rp(Math.abs(Calc.selisihNota(o)))})</span></span></a>`),
      ...siapInvoice.map(o => `<a class="card ok tap row" href="#/permintaan/${o.id}"><span class="grow"><b>Siap dibuat invoice</b><br><span class="small">${E(dapurName(o))} · ${U.fmtDateLong(o.tanggal)}</span></span><span class="badge b-dibeli">Buat</span></a>`),
      ...(belumArsip.length ? [`<a class="card tap row" href="#/arsip"><span class="grow"><b>${belumArsip.length} permintaan selesai belum diarsip</b><br><span class="small mute">Unduh ZIP arsip hari ini</span></span>${ic('archive').replace('<svg', '<svg style="width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2"')}</a>`] : [])
    ];

    return {
      html: `<div class="top fade-in"><div><h1>Halo, Xander</h1><p class="mute sub">${U.fmtDateLong(t)} · ${U.nowTime()} WIT</p></div>
        <button class="btn sm" data-act="paket">${ic('pkg')} Terima paket</button></div>

        <div class="card hero fade-in"><div class="small">Hari ini · ${hariIni.length} permintaan</div>
          <div class="big">${totDone}<span style="font-size:.5em"> / ${totItems} barang dibeli</span></div>
          <div class="bar"><i style="transform:scaleX(${totItems ? totDone / totItems : 0})"></i></div></div>

        ${alerts.length ? `<div class="section stack">${alerts.join('')}</div>` : ''}

        <div class="section"><h2>${U.BULAN[+month.slice(5) - 1]} ${month.slice(0, 4)}</h2>
        <div class="grid2 grid4">
          <div class="card kpi"><div class="label">Nilai invoice</div><div class="big num">${U.rpShort(nilai)}</div></div>
          <div class="card kpi"><div class="label">Keuntungan tercatat</div><div class="big num">${U.rpShort(untung)}</div></div>
          <div class="card kpi"><div class="label">Permintaan</div><div class="big num">${bulan.length}</div></div>
          <a class="card kpi tap" href="#/invoice" style="text-decoration:none"><div class="label">Belum dibayar</div><div class="big num">${belumBayar.length}</div></a>
        </div>
        <div class="card" style="margin-top:10px"><div class="row between"><b>Nilai pesanan 14 hari</b><span class="mute small num">${U.rpShort(series.reduce((a, b) => a + b, 0))}</span></div>${spark(series, 'Nilai pesanan 14 hari terakhir')}
          <div class="row between tiny mute"><span>${U.fmtDateShort(days[0])}</span><span>Hari ini</span></div></div>
        ${S.settings.dapur.map(d => { const os = bulan.filter(o => o.dapurId === d.id); return `<div class="card flat row" style="margin-top:8px"><span class="grow"><b>${E(d.nama)}</b><br><span class="small mute">${os.length} permintaan bulan ini</span></span><span class="num" style="font-weight:800">${U.rpShort(os.reduce((s, o) => s + Calc.total(o), 0))}</span></div>`; }).join('')}
        </div>
        <div class="section"><a class="btn primary block" href="#/permintaan">${ic('plus')} Tambah permintaan</a></div>`,
      mount: v => { $('[data-act=paket]', v).onclick = () => receivePaket(); }
    };
  };

  /* ---------- Permintaan: daftar + impor ---------- */
  let filterPerm = 'aktif';
  XV.permintaan = async id => {
    if (id) return detailX(id);
    const list = S.orders.filter(o => filterPerm === 'semua' || aktif(o));
    let lastDate = '';
    const items = list.map(o => {
      const sep = o.tanggal !== lastDate ? `<div class="list-sep"><span>${U.fmtDateLong(o.tanggal)}</span></div>` : '';
      lastDate = o.tanggal;
      const sel = Calc.selisihNota(o) && !o.selisihOk;
      return sep + `<a class="card tap row fade-in" href="#/permintaan/${o.id}" style="text-decoration:none;margin-bottom:8px">
        <span class="grow"><b>${E(dapurName(o))}</b><br><span class="small mute">${o.items.length} barang · ${E(o.items.slice(0, 3).map(i => i.nama).join(', '))}${o.items.length > 3 ? '…' : ''}</span></span>
        <span style="text-align:right"><span class="num" style="font-weight:800">${U.rpShort(Calc.total(o))}</span><br>${sel ? '<span class="badge b-warn">Cek total</span>' : badge(o)}</span></a>`;
    }).join('');
    return {
      html: `<div class="top"><div><h1>Permintaan</h1><p class="mute sub">Nota pesanan dari dapur MBG</p></div></div>
        <div class="drop" tabindex="0" role="button" aria-label="Pilih file Excel atau foto nota">${ic('upload')}
          <div><b>Tarik file Excel atau foto nota ke sini</b></div><div class="small mute">Atau ketuk untuk memilih. Excel paling akurat.</div></div>
        <div class="row wrap" style="margin-top:10px">
          <button class="btn sm grow" data-act="excel">${ic('file')} Excel</button>
          <button class="btn sm grow" data-act="foto">${ic('camera')} Foto nota</button>
          <button class="btn sm grow" data-act="manual">${ic('edit')} Ketik manual</button>
        </div>
        <div class="row between section"><div class="seg" style="width:220px"><button data-f="aktif" aria-pressed="${filterPerm === 'aktif'}">Aktif</button><button data-f="semua" aria-pressed="${filterPerm === 'semua'}">Semua</button></div>
          ${list.length ? `<button class="btn sm" data-act="kirim">${ic('send')} Kirim ke Gil</button>` : ''}</div>
        <div style="margin-top:12px">${items || `<div class="empty">${ic('basket')}<h3>Belum ada permintaan</h3><p>Masukkan nota pesanan dari dapur: file Excel, foto, atau ketik sendiri.</p></div>`}</div>`,
      mount: v => {
        const drop = $('.drop', v);
        const handle = files => importFiles(files);
        drop.onclick = async () => handle(await pickFile('.xlsx,.xls,.csv,image/*', true));
        drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop.click(); } };
        drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
        drop.ondragleave = () => drop.classList.remove('over');
        drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); handle([...e.dataTransfer.files]); };
        $('[data-act=excel]', v).onclick = async () => handle(await pickFile('.xlsx,.xls,.csv', true));
        $('[data-act=foto]', v).onclick = async () => handle(await pickFile('image/*', true));
        $('[data-act=manual]', v).onclick = () => { S.drafts = [{ key: U.uid(), dapurId: S.settings.dapur[0]?.id || '', tanggal: U.today(), jamAntar: S.settings.dapur[0]?.jamAntar || '', noNota: '', items: [{ nama: '', satuan: 'kg', qty: 0, hargaNota: 0 }], totalNota: null, sumber: 'manual', file: null }]; S.editOrderId = null; go('#/tinjau'); };
        $$('[data-f]', v).forEach(b => b.onclick = () => { filterPerm = b.dataset.f; render(); });
        const k = $('[data-act=kirim]', v);
        if (k) k.onclick = () => pilihKirim();
      }
    };
  };

  function pilihKirim() {
    const list = S.orders.filter(o => status(o) !== 'selesai');
    if (!list.length) { U.toast('Tidak ada permintaan aktif', 'warn'); return; }
    sheet(`<h2>Kirim daftar belanja ke Gil</h2><p class="mute small" style="margin:6px 0 12px">Harga jual dan harga nota tidak ikut terkirim.</p>
      <div class="stack">${list.map(o => `<label class="card flat row" style="cursor:pointer"><input type="checkbox" value="${o.id}" checked style="width:22px;height:22px;accent-color:var(--acc)"><span class="grow"><b>${E(dapurName(o))}</b><br><span class="small mute">${U.fmtDateLong(o.tanggal)} · ${o.items.length} barang</span></span>${badge(o)}</label>`).join('')}</div>
      <div class="stack" style="margin-top:16px"><button class="btn primary block" data-go>${ic('send')} Kirim paket</button><button class="btn ghost block" data-close>Batal</button></div>`,
      (el, close) => { $('[data-go]', el).onclick = async () => { const ids = $$('input:checked', el).map(i => i.value); close(); await sendPaket(S.orders.filter(o => ids.includes(o.id))); }; });
  }

  async function importFiles(files) {
    if (!files.length) return;
    const drafts = [];
    for (const f of files) {
      const isImg = /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name);
      try {
        if (isImg) {
          const d = await ocrFlow(f);
          if (d) drafts.push(d);
        } else {
          const notas = await Parse.excel(f, S.settings);
          if (!notas.length) { U.toast(`Tidak menemukan tabel nota di ${f.name}. Pastikan ada kolom Uraian, Satuan, Qty.`, 'error', 5000); continue; }
          notas.forEach(n => drafts.push({ ...n, key: U.uid(), sumber: 'excel', file: f }));
          U.toast(`${notas.length} nota terbaca dari ${f.name}`, 'ok');
        }
      } catch (e) {
        console.error(e);
        U.toast(`Gagal membaca ${f.name}: ${e.message}`, 'error', 5000);
      }
    }
    if (drafts.length) { S.drafts = drafts; S.editOrderId = null; go('#/tinjau'); }
  }

  function ocrFlow(file) {
    return new Promise(res => {
      let cancelled = false;
      const url = URL.createObjectURL(file);
      sheet(`<h2>Membaca foto nota</h2><p class="mute small" style="margin:6px 0 12px">Semua diproses di perangkat ini. Pertama kali butuh beberapa detik untuk memuat.</p>
        <img src="${url}" alt="Foto nota" style="width:100%;max-height:220px;object-fit:contain;border-radius:12px;border:var(--bw) solid var(--line);background:#fff">
        <p class="small" style="margin:12px 0 6px" data-st>Menyiapkan…</p><div class="progress"><i style="transform:scaleX(0)"></i></div>
        <button class="btn ghost block" style="margin-top:12px" data-cancel>Batal</button>`,
        async (el, close) => {
          $('[data-cancel]', el).onclick = () => { cancelled = true; close(); res(null); };
          try {
            const text = await OCR.read(file, p => { $('[data-st]', el).textContent = `${p.status} ${p.progress ? Math.round(p.progress * 100) + '%' : ''}`; $('.progress i', el).style.transform = `scaleX(${p.progress || 0})`; });
            if (cancelled) return;
            const d = Parse.text(text, S.settings);
            close();
            if (!d.items.length) U.toast('Tulisan terbaca tapi baris barang belum dikenali. Lengkapi di tabel.', 'warn', 4500);
            else U.toast(`${d.items.length} barang terbaca dari foto. Cek ulang angkanya.`, 'ok', 3500);
            if (!d.items.length) d.items.push({ nama: '', satuan: 'kg', qty: 0, hargaNota: 0 });
            res({ ...d, key: U.uid(), sumber: 'foto', file, ocrText: text });
          } catch (e) {
            console.error(e);
            close();
            U.toast('Foto belum bisa dibaca: ' + e.message, 'error', 5000);
            res({ key: U.uid(), dapurId: '', tanggal: U.today(), jamAntar: '', noNota: '', items: [{ nama: '', satuan: 'kg', qty: 0, hargaNota: 0 }], totalNota: null, sumber: 'foto', file });
          }
        });
    });
  }

  /* ---------- Tinjau nota sebelum disimpan ---------- */
  XV.tinjau = async () => {
    if (!S.drafts.length) { setTimeout(() => go('#/permintaan'), 0); return { html: '' }; }
    const dapurOpts = sel => `<option value="">Pilih dapur…</option>` + S.settings.dapur.map(d => `<option value="${d.id}" ${d.id === sel ? 'selected' : ''}>${E(d.nama)}</option>`).join('');
    const body = S.drafts.map((d, di) => `
      <section class="card flat fade-in" data-d="${di}" style="margin-bottom:16px">
        <div class="row between" style="margin-bottom:12px"><h2>Nota ${S.drafts.length > 1 ? di + 1 : ''}</h2><span class="badge b-baru">${d.sumber === 'excel' ? 'Dari Excel' : d.sumber === 'foto' ? 'Dari foto' : 'Manual'}</span></div>
        ${d.items.some(it => it.cek) ? '<div class="card warn small" style="margin-bottom:10px">Baris berwarna oranye kurang jelas terbaca dari foto. Cocokkan dengan foto asli lalu perbaiki angkanya.</div>' : ''}
        ${d.file && d.sumber === 'foto' ? `<details style="margin-bottom:10px"><summary>Lihat foto asli</summary><img src="${URL.createObjectURL(d.file)}" alt="Foto nota asli" style="width:100%;border-radius:12px;margin-top:8px"></details>` : ''}
        <div class="grid2">
          <div class="field"><label class="lbl" for="dp${di}">Dapur</label><select class="input" id="dp${di}" data-k="dapurId">${dapurOpts(d.dapurId)}</select>${!d.dapurId ? '<p class="err">Dapur belum dikenali. Pilih dulu.</p>' : ''}</div>
          <div class="field"><label class="lbl" for="tg${di}">Tanggal antar</label><input class="input" type="date" id="tg${di}" data-k="tanggal" value="${E(d.tanggal)}"></div>
          <div class="field"><label class="lbl" for="jm${di}">Jam antar (WIT)</label><input class="input" id="jm${di}" data-k="jamAntar" value="${E(d.jamAntar || '')}" placeholder="05.00" inputmode="decimal"></div>
          <div class="field"><label class="lbl" for="nn${di}">No. nota</label><input class="input" id="nn${di}" data-k="noNota" value="${E(d.noNota || '')}" placeholder="001/SPPG.KOTA AMBON NUSANIWE/X/2026"></div>
        </div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36%">Uraian bahan</th><th>Satuan</th><th class="r">Qty</th><th class="r">Harga</th><th class="r">Jumlah</th><th></th></tr></thead>
          <tbody>${d.items.map((it, ii) => `<tr data-i="${ii}" ${it.cek ? 'class="cek" title="Perlu dicek"' : ''}>
            <td><input data-f="nama" value="${E(it.nama)}" aria-label="Uraian bahan" placeholder="Nama bahan"></td>
            <td><input data-f="satuan" value="${E(it.satuan || '')}" aria-label="Satuan" style="width:70px" placeholder="kg"></td>
            <td><input class="r" data-f="qty" value="${it.qty ? U.fmtNum(it.qty) : ''}" inputmode="decimal" aria-label="Qty" style="width:80px"></td>
            <td><input class="r" data-f="hargaNota" data-money value="${it.hargaNota ? Math.round(it.hargaNota).toLocaleString('id-ID') : ''}" inputmode="numeric" aria-label="Harga" style="width:110px"></td>
            <td class="r" data-j>${U.rp((it.qty || 0) * (it.hargaNota || 0))}</td>
            <td><button class="btn ghost icon" data-del aria-label="Hapus baris">${ic('trash')}</button></td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="4">Total hitung</td><td class="r" data-sum>${U.rp(Calc.notaHitung(d))}</td><td></td></tr></tfoot></table></div>
        <button class="btn sm" data-add style="margin-top:10px">${ic('plus')} Tambah baris</button>
        <div class="field" style="margin-top:14px"><label class="lbl" for="tn${di}">Total tertulis di nota</label><p class="help">Diisi otomatis dari nota. Dipakai untuk mengecek salah hitung.</p>
          <div class="money"><span>Rp</span><input id="tn${di}" data-k="totalNota" data-money inputmode="numeric" value="${d.totalNota != null ? Math.round(d.totalNota).toLocaleString('id-ID') : ''}"></div></div>
        <div data-check></div>
      </section>`).join('');
    return {
      html: `<div class="top"><div><button class="btn ghost sm" data-back style="margin-left:-10px">${ic('back')} Kembali</button><h1>Cek nota</h1><p class="mute sub">Periksa hasil bacaan sebelum disimpan. Angka bisa diubah langsung.</p></div></div>
        ${body}
        <div class="stack sticky-act"><button class="btn primary block" data-save>${ic('check')} Simpan ${S.drafts.length > 1 ? S.drafts.length + ' permintaan' : 'permintaan'}</button></div>`,
      mount: v => {
        $('[data-back]', v).onclick = () => { S.drafts = []; history.back(); };
        $$('[data-money]', v).forEach(moneyInput);
        $$('section[data-d]', v).forEach(sec => {
          const d = S.drafts[+sec.dataset.d];
          const check = () => {
            const hit = Calc.notaHitung(d);
            $('[data-sum]', sec).textContent = U.rp(hit);
            const box = $('[data-check]', sec);
            if (d.totalNota == null || !d.items.length) box.innerHTML = '';
            else if (Math.abs(d.totalNota - hit) < 1) box.innerHTML = `<div class="card ok small">${ic('check').replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px;stroke:currentColor;fill:none;stroke-width:3"')} Total nota cocok dengan hitungan: ${U.rp(hit)}</div>`;
            else box.innerHTML = `<div class="card warn small"><b>Total nota tidak cocok.</b> Tertulis ${U.rp(d.totalNota)}, hasil hitung ${U.rp(hit)}. Selisih ${U.rp(Math.abs(d.totalNota - hit))}. Invoice akan memakai hasil hitung. Sebaiknya konfirmasi ke dapur.</div>`;
          };
          $$('[data-k]', sec).forEach(inp => inp.addEventListener('input', () => {
            const k = inp.dataset.k;
            d[k] = k === 'totalNota' ? U.parseNum(inp.value) : inp.value;
            if (k === 'dapurId') { const dp = S.settings.dapur.find(x => x.id === inp.value); if (dp && !d.jamAntar) { d.jamAntar = dp.jamAntar; $('[data-k=jamAntar]', sec).value = dp.jamAntar; } const er = inp.parentElement.querySelector('.err'); if (er) er.remove(); }
            check();
          }));
          $$('tbody tr', sec).forEach(tr => {
            const it = d.items[+tr.dataset.i];
            $$('input', tr).forEach(inp => inp.addEventListener('input', () => {
              const f = inp.dataset.f;
              it[f] = f === 'nama' || f === 'satuan' ? inp.value : (U.parseNum(inp.value) ?? 0);
              if (it.cek) { it.cek = false; tr.classList.remove('cek'); }
              $('[data-j]', tr).textContent = U.rp((it.qty || 0) * (it.hargaNota || 0));
              check();
            }));
            $('[data-del]', tr).onclick = () => { d.items.splice(+tr.dataset.i, 1); render(); };
          });
          $('[data-add]', sec).onclick = () => { d.items.push({ nama: '', satuan: 'kg', qty: 0, hargaNota: 0 }); render().then(() => { const rows = $$(`section[data-d="${sec.dataset.d}"] tbody tr`); rows[rows.length - 1]?.querySelector('input')?.focus(); }); };
          check();
        });
        $('[data-save]', v).onclick = saveDrafts;
      }
    };
  };

  async function saveDrafts() {
    for (const [i, d] of S.drafts.entries()) {
      d.items = d.items.filter(it => String(it.nama).trim());
      if (!d.dapurId) { U.toast(`Pilih dapur untuk nota ${S.drafts.length > 1 ? i + 1 : ''}`, 'error'); return; }
      if (!d.items.length) { U.toast('Isi minimal satu barang', 'error'); return; }
      if (!d.tanggal) { U.toast('Isi tanggal antar', 'error'); return; }
    }
    let saved = 0, lastId = null;
    for (const d of S.drafts) {
      const existing = S.editOrderId ? await DB.orders.get(S.editOrderId) : null;
      const dup = !existing && S.orders.find(o => o.dapurId === d.dapurId && o.tanggal === d.tanggal && o.items.map(i => U.normName(i.nama)).sort().join() === d.items.map(i => U.normName(i.nama)).sort().join());
      if (dup) {
        const ok = await confirmSheet({ title: 'Nota ini sepertinya sudah ada', body: `${E(dapurName(dup))}, ${U.fmtDateLong(dup.tanggal)} dengan barang yang sama sudah tersimpan. Tetap simpan sebagai permintaan baru?`, ok: 'Tetap simpan', cancel: 'Lewati nota ini' });
        if (!ok) continue;
      }
      const o = existing || { id: U.uid('o'), createdAt: Date.now(), log: [] };
      Object.assign(o, { dapurId: d.dapurId, tanggal: d.tanggal, jamAntar: d.jamAntar, noNota: d.noNota, totalNota: d.totalNota ?? null, sumber: o.sumber || d.sumber });
      o.items = d.items.map(it => {
        const old = existing?.items.find(x => x.id === it.id);
        return { ...(old || {}), id: it.id || U.uid('i'), nama: String(it.nama).trim(), satuan: String(it.satuan || '').trim(), qty: +it.qty || 0, hargaNota: +it.hargaNota || 0 };
      });
      if (Calc.selisihNota(o)) o.selisihOk = false;
      o.log.push({ t: Date.now(), m: existing ? 'Nota diubah' : `Permintaan masuk (${d.sumber})` });
      await DB.orders.put(o);
      if (d.file) await DB.files.put({ id: U.uid('f'), orderId: o.id, kind: 'nota', name: d.file.name || 'nota', type: d.file.type, blob: d.sumber === 'foto' ? await U.compressImage(d.file, 2000) : d.file, t: Date.now() });
      saved++; lastId = o.id;
    }
    S.drafts = []; S.editOrderId = null;
    U.toast(saved ? `${saved} permintaan disimpan` : 'Tidak ada yang disimpan', saved ? 'ok' : 'warn');
    U.buzz();
    go(saved === 1 ? `#/permintaan/${lastId}` : '#/permintaan');
  }

  /* ---------- Detail permintaan (Xander) ---------- */
  async function detailX(id) {
    const o = await DB.orders.get(id);
    if (!o) return { html: `<div class="empty"><h3>Permintaan tidak ditemukan</h3><p>Mungkin sudah dihapus.</p><a class="btn" href="#/permintaan">Ke daftar permintaan</a></div>` };
    const files = await DB.files.byOrder(id);
    const d = dapurOf(o);
    const sel = Calc.selisihNota(o);
    const tot = Calc.total(o), modal = Calc.modal(o), untung = Calc.untung(o);
    const lengkapBeli = o.items.every(it => it.kosong || it.hargaBeli != null);
    const rows = o.items.map((it, i) => {
      const u = it.hargaBeli != null && !it.kosong ? Calc.lineJual(it) - Calc.lineBeli(it) : null;
      return `<tr data-i="${i}" style="${it.kosong ? 'opacity:.55' : ''}">
        <td><b>${E(it.nama)}</b><br><span class="tiny mute">${it.kosong ? 'Kosong di pasar' : it.beli ? 'Dibeli' + (it.waktuBeli ? ' ' + E(it.waktuBeli) : '') : 'Belum dibeli'}${it.catatanGil ? ' · ' + E(it.catatanGil) : ''}</span></td>
        <td>${E(it.satuan)}</td>
        <td class="r">${U.fmtNum(it.qty)}</td>
        <td><input class="r" data-f="qtyBeli" value="${it.qtyBeli != null ? U.fmtNum(it.qtyBeli) : ''}" placeholder="${U.fmtNum(it.qty)}" inputmode="decimal" aria-label="Qty dikirim ${E(it.nama)}" style="width:76px"></td>
        <td><input class="r" data-f="hargaBeli" data-money value="${it.hargaBeli != null ? Math.round(it.hargaBeli).toLocaleString('id-ID') : ''}" placeholder="–" inputmode="numeric" aria-label="Harga beli ${E(it.nama)}" style="width:100px"></td>
        <td><input class="r" data-f="hargaJual" data-money value="${Math.round(Calc.jual(it)).toLocaleString('id-ID')}" inputmode="numeric" aria-label="Harga jual ${E(it.nama)}" style="width:104px"></td>
        <td class="r" data-j>${U.rp(Calc.lineJual(it))}</td>
        <td class="r" data-u style="color:${u == null ? 'var(--mute)' : u < 0 ? 'var(--bad)' : 'var(--ok)'}">${u == null ? '–' : U.rp(u)}</td></tr>`;
    }).join('');
    const kindName = { nota: 'Nota asli', invoice: 'Invoice', bukti: 'Foto bukti', ttd: 'Tanda tangan' };
    return {
      html: `<div class="top"><div><a class="btn ghost sm" href="#/permintaan" style="margin-left:-10px">${ic('back')} Permintaan</a>
          <h1>${E(d?.nama || 'Dapur?')}</h1><p class="mute sub">${U.fmtDateLong(o.tanggal)}${o.jamAntar ? ' · antar ' + E(o.jamAntar) + ' WIT' : ''}${o.noNota ? '<br>No. ' + E(o.noNota) : ''}</p></div>${badge(o)}</div>

        ${sel && !o.selisihOk ? `<div class="card warn" style="margin-bottom:12px"><b>Total di nota tidak cocok dengan hitungan.</b><br>Tertulis ${U.rp(o.totalNota)}, hasil hitung ${U.rp(Calc.notaHitung(o))}, selisih ${U.rp(Math.abs(sel))}. Invoice memakai hasil hitung.
          <div class="row wrap" style="margin-top:10px"><button class="btn sm" data-act="selisihok">Sudah dikonfirmasi</button>${d?.wa ? `<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${d.wa.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(`Selamat pagi. Nota pesanan ${U.fmtDate(o.tanggal)}${o.noNota ? ' No. ' + o.noNota : ''}: total tertulis ${U.rp(o.totalNota)}, tetapi jumlah per barang ${U.rp(Calc.notaHitung(o))} (selisih ${U.rp(Math.abs(sel))}). Mohon dicek. Terima kasih. - ${S.settings.perusahaan.nama}`)}">${ic('send')} Tanya dapur</a>` : ''}</div></div>` : ''}

        <div class="grid2 grid4">
          <div class="card kpi"><div class="label">Total invoice</div><div class="big num" data-tot>${U.rpShort(tot)}</div></div>
          <div class="card kpi"><div class="label">Modal belanja</div><div class="big num" data-modal>${U.rpShort(modal)}</div></div>
          <div class="card kpi"><div class="label">Keuntungan${lengkapBeli ? '' : ' (sementara)'}</div><div class="big num" data-untung>${U.rpShort(untung)}</div></div>
          <div class="card kpi"><div class="label">Dibeli Gil</div><div class="big num">${Calc.dibeli(o)}/${o.items.length}</div></div>
        </div>

        <div class="section"><div class="row between" style="margin-bottom:10px"><h2>Rincian</h2><button class="btn sm" data-act="ubah">${ic('edit')} Ubah nota</button></div>
        <p class="help">Qty dikirim dan harga beli diisi Gil (atau Xander). Harga jual awalnya sama dengan harga nota.</p>
        <div class="tbl-wrap"><table class="tbl" style="min-width:760px"><thead><tr><th>Uraian</th><th>Satuan</th><th class="r">Qty nota</th><th class="r">Qty kirim</th><th class="r">Harga beli</th><th class="r">Harga jual</th><th class="r">Jumlah</th><th class="r">Untung</th></tr></thead>
        <tbody>${rows}</tbody><tfoot><tr><td colspan="6">Total</td><td class="r" data-tot2>${U.rp(tot)}</td><td class="r" data-untung2>${U.rp(untung)}</td></tr></tfoot></table></div></div>

        <div class="section stack">
          <button class="btn primary block" data-act="invoice">${ic('receipt')} ${o.invoice ? 'Buat ulang invoice ' + E(o.invoice.no) : 'Buat invoice'}</button>
          <div class="row wrap"><button class="btn grow" data-act="kirim">${ic('send')} Kirim ke Gil</button><a class="btn grow" href="#/antar/${o.id}">${ic('truck')} Pengantaran</a></div>
        </div>

        <div class="section"><h2>Lampiran</h2>
          ${files.length ? `<div class="stack">${files.map(f => `<div class="card flat row"><span class="grow"><b>${kindName[f.kind] || 'Berkas'}</b><br><span class="tiny mute">${E(f.name)}</span></span><button class="btn sm" data-open="${f.id}">${ic('eye')} Buka</button><button class="btn sm icon" data-dl="${f.id}" aria-label="Unduh ${E(f.name)}">${ic('download')}</button></div>`).join('')}</div>` : '<p class="mute small">Belum ada lampiran.</p>'}
          ${o.antar?.selesai ? `<p class="small" style="margin-top:10px">Diterima ${E(o.antar.penerima || '')} pukul ${E(o.antar.selesai)} WIT.</p>` : ''}
        </div>

        <details class="section"><summary>Riwayat</summary><div class="stack small mute" style="margin-top:8px">${(o.log || []).slice().reverse().map(l => `<div>${new Date(l.t).toLocaleString('id-ID', { timeZone: U.TZ, dateStyle: 'medium', timeStyle: 'short' })} · ${E(l.m)}</div>`).join('')}</div></details>
        <div class="section"><button class="btn danger block" data-act="hapus">${ic('trash')} Hapus permintaan</button></div>`,
      mount: v => {
        $$('[data-money]', v).forEach(moneyInput);
        const save = U.debounce(() => DB.orders.put(o), 400);
        const refresh = () => {
          const t2 = Calc.total(o), u2 = Calc.untung(o);
          $('[data-tot]', v).textContent = U.rpShort(t2); $('[data-tot2]', v).textContent = U.rp(t2);
          $('[data-modal]', v).textContent = U.rpShort(Calc.modal(o));
          $('[data-untung]', v).textContent = U.rpShort(u2); $('[data-untung2]', v).textContent = U.rp(u2);
        };
        $$('tbody tr', v).forEach(tr => {
          const it = o.items[+tr.dataset.i];
          $$('input', tr).forEach(inp => inp.addEventListener('input', () => {
            const n = U.parseNum(inp.value);
            it[inp.dataset.f] = n;
            if (inp.dataset.f === 'hargaJual' && n == null) it.hargaJual = undefined;
            $('[data-j]', tr).textContent = U.rp(Calc.lineJual(it));
            const u = it.hargaBeli != null && !it.kosong ? Calc.lineJual(it) - Calc.lineBeli(it) : null;
            const ue = $('[data-u]', tr); ue.textContent = u == null ? '–' : U.rp(u); ue.style.color = u == null ? 'var(--mute)' : u < 0 ? 'var(--bad)' : 'var(--ok)';
            refresh(); save();
          }));
        });
        const a = n => $(`[data-act=${n}]`, v);
        if (a('selisihok')) a('selisihok').onclick = async () => { o.selisihOk = true; o.log.push({ t: Date.now(), m: 'Selisih total nota dikonfirmasi' }); await DB.orders.put(o); render(); };
        a('ubah').onclick = () => { S.drafts = [{ key: U.uid(), dapurId: o.dapurId, tanggal: o.tanggal, jamAntar: o.jamAntar, noNota: o.noNota, items: structuredClone(o.items), totalNota: o.totalNota, sumber: o.sumber, file: null }]; S.editOrderId = o.id; go('#/tinjau'); };
        a('invoice').onclick = () => buatInvoice(o);
        a('kirim').onclick = () => sendPaket([o]);
        a('hapus').onclick = async () => { if (await confirmSheet({ title: 'Hapus permintaan ini?', body: 'Nota, invoice, dan foto bukti di perangkat ini ikut terhapus. Tidak bisa dibatalkan.', ok: 'Hapus', danger: true })) { await DB.orders.del(o.id); U.toast('Permintaan dihapus'); go('#/permintaan'); } };
        $$('[data-open]', v).forEach(b => b.onclick = async () => { const f = await DB.files.get(b.dataset.open); window.open(URL.createObjectURL(f.blob), '_blank'); });
        $$('[data-dl]', v).forEach(b => b.onclick = async () => { const f = await DB.files.get(b.dataset.dl); U.download(f.blob, f.name); });
      }
    };
  }

  async function buatInvoice(o) {
    if (!Calc.semuaDibeli(o)) {
      const ok = await confirmSheet({ title: 'Belum semua barang dicentang Gil', body: `${Calc.dibeli(o)} dari ${o.items.length} barang sudah dibeli. Barang yang belum dicentang dihitung sesuai qty nota.`, ok: 'Tetap buat invoice' });
      if (!ok) return;
    }
    const d = dapurOf(o);
    // tanggal invoice = tanggal antar (sesuai template); nomor diperbarui bila tanggal/dapur nota berubah
    const no = await DB.nextInvoiceNo(d, o.tanggal, o.id);
    if (!o.invoice) o.invoice = { no, tanggal: o.tanggal, lunas: false };
    else { if (!o.invoice.no.startsWith(no.split('-')[0])) o.invoice.no = no; o.invoice.tanggal = o.tanggal; }
    o.invoice.total = Calc.total(o);
    S.settings = await DB.settings();
    const pdf = Invoice.pdf(o, d, S.settings);
    const name = Invoice.fileName(o, d, 'pdf');
    for (const f of await DB.files.byOrder(o.id)) if (f.kind === 'invoice') await DB.files.del(f.id);
    await DB.files.put({ id: U.uid('f'), orderId: o.id, kind: 'invoice', name, type: 'application/pdf', blob: pdf, t: Date.now() });
    o.log.push({ t: Date.now(), m: `Invoice ${o.invoice.no} dibuat (${U.rp(o.invoice.total)})` });
    await DB.orders.put(o);
    U.buzz([10, 30, 10]);
    invoiceSheet(o, pdf, name);
    render();
  }

  function invoiceSheet(o, pdf, name) {
    const d = dapurOf(o);
    const file = new File([pdf], name, { type: 'application/pdf' });
    const text = `Invoice ${o.invoice.no} untuk ${d?.nama} tanggal ${U.fmtDate(o.tanggal)}: ${U.rp(o.invoice.total)}. ${S.settings.perusahaan.nama}`;
    sheet(`<div class="row" style="gap:12px;margin-bottom:12px"><span class="ck" style="background:var(--acc);border-color:#1B1236">${ic('check').replace('<svg', '<svg style="stroke-dashoffset:0"')}</span><div><h2>Invoice siap</h2><p class="mute small num">${E(o.invoice.no)} · ${U.rp(o.invoice.total)}</p></div></div>
      <div class="stack">
        <button class="btn primary block" data-a="share">${ic('share')} Bagikan (WhatsApp, Gmail, Drive)</button>
        <div class="row"><button class="btn grow" data-a="open">${ic('eye')} Lihat PDF</button><button class="btn grow" data-a="dl">${ic('download')} Unduh PDF</button></div>
        <button class="btn block" data-a="xlsx">${ic('file')} Unduh versi Excel</button>
        <button class="btn ghost block" data-close>Selesai</button>
      </div>`,
      el => {
        $('[data-a=share]', el).onclick = async () => { if (!(await U.shareFiles([file], text))) { U.download(pdf, name); U.toast('Perangkat ini belum bisa berbagi langsung. PDF sudah diunduh, kirim lewat WhatsApp.', 'warn', 4500); } };
        $('[data-a=open]', el).onclick = () => window.open(URL.createObjectURL(pdf), '_blank');
        $('[data-a=dl]', el).onclick = () => U.download(pdf, name);
        $('[data-a=xlsx]', el).onclick = () => U.download(Invoice.xlsx(o, d, S.settings), Invoice.fileName(o, d, 'xlsx'));
      });
  }

  /* ---------- Invoice ---------- */
  let invMonth = null;
  XV.invoice = async () => {
    invMonth = invMonth || U.today().slice(0, 7);
    const months = [...new Set(S.orders.filter(o => o.invoice).map(o => o.tanggal.slice(0, 7)).concat(U.today().slice(0, 7)))].sort().reverse();
    const list = S.orders.filter(o => o.invoice && o.tanggal.startsWith(invMonth));
    const siap = S.orders.filter(o => !o.invoice && Calc.semuaDibeli(o));
    const belum = S.orders.filter(o => o.invoice && !o.invoice.lunas);
    return {
      html: `<div class="top"><div><h1>Invoice</h1><p class="mute sub">Belum dibayar: <b class="num">${U.rp(belum.reduce((s, o) => s + Calc.total(o), 0))}</b> (${belum.length})</p></div>
        <select class="input" style="width:auto;min-height:40px" data-month aria-label="Pilih bulan">${months.map(m => `<option value="${m}" ${m === invMonth ? 'selected' : ''}>${U.BULAN[+m.slice(5) - 1]} ${m.slice(0, 4)}</option>`).join('')}</select></div>
        ${siap.length ? `<div class="stack" style="margin-bottom:16px">${siap.map(o => `<a class="card ok tap row" href="#/permintaan/${o.id}"><span class="grow"><b>Siap dibuat: ${E(dapurName(o))}</b><br><span class="small">${U.fmtDateLong(o.tanggal)} · ${U.rp(Calc.total(o))}</span></span><span class="badge b-dibeli">Buat</span></a>`).join('')}</div>` : ''}
        ${list.length ? `<div class="stack">${list.map(o => `<div class="card row fade-in" data-id="${o.id}">
          <a class="grow" href="#/permintaan/${o.id}" style="text-decoration:none"><b class="num">${E(o.invoice.no)}</b><br><span class="small mute">${E(dapurName(o))} · ${U.fmtDateShort(o.tanggal)}</span><br><b class="num">${U.rp(Calc.total(o))}</b></a>
          <div class="stack" style="align-items:flex-end;gap:6px"><button class="badge ${o.invoice.lunas ? 'b-selesai' : 'b-warn'}" data-lunas style="border:0;cursor:pointer;min-height:30px">${o.invoice.lunas ? 'Lunas' : 'Belum dibayar'}</button>
          <button class="btn sm" data-share aria-label="Bagikan invoice ${E(o.invoice.no)}">${ic('share')}</button></div></div>`).join('')}</div>`
        : `<div class="empty">${ic('receipt')}<h3>Belum ada invoice bulan ini</h3><p>Invoice dibuat dari halaman permintaan setelah Gil selesai belanja.</p><a class="btn" href="#/permintaan">Lihat permintaan</a></div>`}`,
      mount: v => {
        $('[data-month]', v).onchange = e => { invMonth = e.target.value; render(); };
        $$('[data-id]', v).forEach(card => {
          const o = S.orders.find(x => x.id === card.dataset.id);
          $('[data-lunas]', card).onclick = async () => { o.invoice.lunas = !o.invoice.lunas; o.log.push({ t: Date.now(), m: o.invoice.lunas ? 'Invoice ditandai lunas' : 'Tanda lunas dibatalkan' }); await DB.orders.put(o); U.buzz(); render(); };
          $('[data-share]', card).onclick = async () => {
            const f = (await DB.files.byOrder(o.id)).find(x => x.kind === 'invoice');
            if (!f) { U.toast('File invoice belum ada. Buat ulang dari halaman permintaan.', 'warn'); return; }
            invoiceSheet(o, f.blob, f.name);
          };
        });
      }
    };
  };

  /* ---------- Arsip ---------- */
  XV.arsip = async () => {
    const byDate = {};
    S.orders.forEach(o => (byDate[o.tanggal] ||= []).push(o));
    const dates = Object.keys(byDate).sort().reverse();
    const est = navigator.storage?.estimate ? await navigator.storage.estimate().catch(() => null) : null;
    return {
      html: `<div class="top"><div><h1>Arsip</h1><p class="mute sub">Nota, invoice, dan bukti per hari. Tersusun per tahun / bulan / tanggal / dapur.</p></div></div>
        <div class="card hero"><b>Cadangan otomatis ke Google Drive</b><p class="small" style="margin-top:4px">Masuk tahap 2. Untuk sekarang, unduh ZIP harian lalu unggah ke folder Drive, atau simpan cadangan lengkap.</p></div>
        <div class="row wrap section"><button class="btn grow" data-act="backup">${ic('download')} Cadangan lengkap</button><button class="btn grow" data-act="restore">${ic('upload')} Pulihkan</button></div>
        <div class="section stack">${dates.length ? dates.map(t => {
          const os = byDate[t], done = os.every(o => o.arsipAt);
          return `<div class="card row"><span class="grow"><b>${U.fmtDateLong(t)}</b><br><span class="small mute">${os.map(o => E(dapurName(o))).join(', ')}</span><br><span class="tiny ${done ? '' : 'mute'}">${done ? 'Sudah diarsip ' + new Date(Math.max(...os.map(o => o.arsipAt))).toLocaleDateString('id-ID', { timeZone: U.TZ }) : os.every(o => o.antar?.selesai) ? 'Siap diarsip' : 'Masih berjalan'}</span></span>
            <button class="btn sm" data-zip="${t}">${ic('download')} ZIP</button></div>`;
        }).join('') : `<div class="empty">${ic('archive')}<h3>Arsip masih kosong</h3><p>Setiap permintaan yang disimpan otomatis masuk ke sini.</p></div>`}</div>
        ${est ? `<p class="tiny mute section">Terpakai ${(est.usage / 1048576).toFixed(1)} MB di perangkat ini.</p>` : ''}`,
      mount: v => {
        $('[data-act=backup]', v).onclick = async e => { e.currentTarget.setAttribute('aria-busy', 'true'); const f = await Sync.backup(); U.download(f, f.name); e.target.removeAttribute?.('aria-busy'); U.toast('Cadangan diunduh. Simpan di Google Drive.', 'ok'); render(); };
        $('[data-act=restore]', v).onclick = () => receivePaket();
        $$('[data-zip]', v).forEach(b => b.onclick = async () => {
          b.setAttribute('aria-busy', 'true');
          const os = byDate[b.dataset.zip];
          const blob = await Sync.zipDay(b.dataset.zip, os, S.settings);
          U.download(blob, `Arsip-Chreswill-${b.dataset.zip}.zip`);
          for (const o of os) { o.arsipAt = Date.now(); o.log.push({ t: Date.now(), m: 'Diarsip (ZIP)' }); await DB.orders.put(o); }
          U.toast('ZIP arsip diunduh', 'ok');
          render();
        });
      }
    };
  };

  /* ============================================================
     GIL
     ============================================================ */
  const GV = {};
  const gilOrders = () => S.orders.filter(o => !o.antar?.selesai).sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  GV.beranda = async () => {
    const list = gilOrders();
    const tot = list.reduce((s, o) => s + o.items.length, 0), done = list.reduce((s, o) => s + Calc.dibeli(o), 0);
    const selesaiHariIni = S.orders.filter(o => o.antar?.selesai && o.tanggal === U.today());
    return {
      html: `<div class="top fade-in"><div><h1>Halo, Gil</h1><p class="mute sub">${U.fmtDateLong(U.today())} · ${U.nowTime()} WIT</p></div><span class="badge b-diantar">Mode pasar</span></div>
        ${list.length ? `<a class="card hero tap fade-in" href="#/belanja" style="display:block;text-decoration:none"><div class="small">${list.length} permintaan aktif</div><div class="big">${done}<span style="font-size:.5em"> / ${tot} barang</span></div><div class="bar"><i style="transform:scaleX(${tot ? done / tot : 0})"></i></div></a>
          <div class="section stack">${list.map(o => `<a class="card tap row" href="#/${Calc.semuaDibeli(o) ? 'antar/' + o.id : 'belanja'}" style="text-decoration:none"><span class="grow"><span class="small mute">${E(dapurName(o))} · ${U.fmtDateShort(o.tanggal)}${o.jamAntar ? ' · ' + E(o.jamAntar) + ' WIT' : ''}</span><br><b>${E(o.items.map(i => i.nama).join(', '))}</b></span>${badge(o)}</a>`).join('')}</div>
          <div class="section stack"><a class="btn primary block" href="#/belanja">${ic('cart')} Mulai belanja</a>
          <div class="row"><button class="btn grow" data-act="terima">${ic('pkg')} Terima paket</button><button class="btn grow" data-act="kirim">${ic('send')} Kirim hasil</button></div></div>`
        : `<div class="empty fade-in">${ic('basket')}<h3>Belum ada daftar belanja</h3><p>Xander mengirim paket daftar belanja lewat WhatsApp. Buka file itu di sini.</p><button class="btn primary" data-act="terima">${ic('pkg')} Terima paket</button></div>`}
        ${selesaiHariIni.length ? `<div class="section"><div class="card ok"><b>${selesaiHariIni.length} pengantaran selesai hari ini</b><p class="small">Kerja bagus. Jangan lupa kirim hasil ke Xander.</p></div></div>` : ''}`,
      mount: v => {
        $$('[data-act=terima]', v).forEach(b => b.onclick = () => receivePaket());
        const k = $('[data-act=kirim]', v); if (k) k.onclick = () => sendPaket(S.orders.filter(o => Calc.dibeli(o) || o.antar));
      }
    };
  };

  GV.belanja = async () => {
    const list = gilOrders().filter(o => !o.antar?.mulai);
    const tot = list.reduce((s, o) => s + o.items.length, 0), done = list.reduce((s, o) => s + Calc.dibeli(o), 0);
    const speech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    return {
      html: `<div class="top"><div><h1>Belanja</h1><p class="mute sub">Ketuk barang untuk isi harga beli. Ketuk kotak untuk centang cepat.</p></div><span class="big num" style="font-size:22px">${done}/${tot}</span></div>
        ${list.length ? list.map(o => `<div class="list-sep"><span>${E(dapurName(o))} · ${U.fmtDateShort(o.tanggal)}</span><span>${Calc.dibeli(o)}/${o.items.length}</span></div>` +
          o.items.map((it, i) => `<div class="card item ${it.beli ? 'done' : ''} ${it.kosong ? 'kosong' : ''}" data-o="${o.id}" data-i="${i}" role="button" tabindex="0" style="margin-bottom:8px">
            <span class="ck" data-quick role="checkbox" aria-checked="${!!(it.beli || it.kosong)}" aria-label="Centang ${E(it.nama)}">${ic('check')}</span>
            <span class="grow"><span class="nm">${E(it.nama)}</span><br><span class="meta">${U.fmtNum(it.qty)} ${E(it.satuan)}${it.qtyBeli != null && it.qtyBeli !== it.qty ? ` · dibeli ${U.fmtNum(it.qtyBeli)}` : ''}${it.kosong ? ' · kosong' : ''}</span></span>
            <span class="pr">${it.hargaBeli != null ? U.rp(it.hargaBeli) + '<br><span class="tiny mute">/' + E(it.satuan) + '</span>' : '<span class="mute small">isi harga</span>'}</span></div>`).join('')).join('')
          + (done === tot ? `<div class="card ok section"><b>Semua barang sudah dibeli.</b><p class="small">Kirim hasil ke Xander supaya invoice bisa dibuat, lalu mulai antar.</p><div class="row wrap" style="margin-top:10px"><button class="btn primary grow" data-act="kirim">${ic('send')} Kirim ke Xander</button><a class="btn grow" href="#/antar">${ic('truck')} Antar</a></div></div>` : '')
          + (speech ? `<div class="sticky-act" style="margin-top:16px"><button class="btn primary block" data-act="voice">${ic('mic')} Ucapkan belanjaan</button></div>` : '')
        : `<div class="empty">${ic('cart')}<h3>Tidak ada yang perlu dibeli</h3><p>Terima paket dari Xander untuk mendapatkan daftar belanja baru.</p><button class="btn primary" data-act="terima">${ic('pkg')} Terima paket</button></div>`}`,
      mount: v => {
        $$('.item', v).forEach(el => {
          const o = S.orders.find(x => x.id === el.dataset.o), it = o.items[+el.dataset.i];
          $('[data-quick]', el).onclick = async e => {
            e.stopPropagation();
            if (it.beli || it.kosong) { it.beli = false; it.kosong = false; }
            else { it.beli = true; it.waktuBeli = U.nowTime(); if (it.qtyBeli == null) it.qtyBeli = it.qty; }
            U.buzz();
            el.classList.toggle('done', !!it.beli); el.classList.remove('kosong');
            await DB.orders.put(o);
            setTimeout(render, 260);
          };
          el.onclick = () => itemSheet(o, it);
          el.onkeydown = e => { if (e.key === 'Enter') itemSheet(o, it); if (e.key === ' ') { e.preventDefault(); $('[data-quick]', el).click(); } };
        });
        const k = $('[data-act=kirim]', v); if (k) k.onclick = () => sendPaket(list);
        const t = $('[data-act=terima]', v); if (t) t.onclick = () => receivePaket();
        const vo = $('[data-act=voice]', v); if (vo) vo.onclick = () => voice(list);
      }
    };
  };

  function itemSheet(o, it, pre = {}) {
    const last = lastPrice(it.nama, 'hargaBeli', o.id);
    const qty = pre.qty ?? it.qtyBeli ?? it.qty;
    const harga = pre.harga ?? it.hargaBeli;
    sheet(`<p class="small mute">${E(dapurName(o))} · diminta ${U.fmtNum(it.qty)} ${E(it.satuan)}</p><h2 style="margin:2px 0 14px">${E(it.nama)}</h2>
      <div class="field"><label class="lbl" for="sq">Jumlah dibeli (${E(it.satuan)})</label>
        <div class="row"><button class="btn icon" data-step="-1" aria-label="Kurangi">−</button><input class="input num" id="sq" inputmode="decimal" value="${U.fmtNum(qty)}" style="text-align:center;font-size:20px;font-weight:800"><button class="btn icon" data-step="1" aria-label="Tambah">+</button></div></div>
      <div class="field"><label class="lbl" for="sh">Harga beli per ${E(it.satuan || 'satuan')}</label>
        <p class="help">${last ? `Terakhir ${U.rp(last.harga)} (${U.fmtDateShort(last.tanggal)})` : 'Harga di pasar hari ini'}</p>
        <div class="money"><span>Rp</span><input id="sh" inputmode="numeric" value="${harga != null ? Math.round(harga).toLocaleString('id-ID') : ''}" autofocus></div>
        <p class="small" data-warn style="margin-top:6px"></p><p class="small mute num" data-sub></p></div>
      <div class="field"><label class="lbl" for="sc">Catatan <span class="mute">(opsional)</span></label><input class="input" id="sc" value="${E(it.catatanGil || '')}" placeholder="Beli di Pasar Mardika"></div>
      <div class="stack"><button class="btn primary block" data-ok>${ic('check')} Simpan, sudah dibeli</button>
        <div class="row"><button class="btn grow" data-kosong>Barang kosong</button>${it.beli || it.kosong ? '<button class="btn grow ghost" data-undo>Batal centang</button>' : '<button class="btn grow ghost" data-close>Batal</button>'}</div></div>`,
      (el, close) => {
        const q = $('#sq', el), h = $('#sh', el);
        moneyInput(h);
        const upd = () => {
          const hv = U.parseNum(h.value), qv = U.parseNum(q.value) || 0;
          const w = $('[data-warn]', el);
          if (last && hv) {
            const ch = (hv - last.harga) / last.harga;
            w.innerHTML = Math.abs(ch) >= 0.1 ? `<span class="badge ${ch > 0 ? 'b-warn' : 'b-selesai'}">${ch > 0 ? 'Naik' : 'Turun'} ${Math.round(Math.abs(ch) * 100)}% dari biasanya</span>` : '';
          } else w.innerHTML = '';
          $('[data-sub]', el).textContent = hv ? `Subtotal belanja ${U.rp(hv * qv)}` : '';
        };
        q.oninput = upd; h.addEventListener('input', upd); upd();
        $$('[data-step]', el).forEach(b => b.onclick = () => { q.value = U.fmtNum(Math.max(0, (U.parseNum(q.value) || 0) + +b.dataset.step)); upd(); });
        const commit = async patch => { Object.assign(it, patch); await DB.orders.put(o); U.buzz(); close(); render(); };
        $('[data-ok]', el).onclick = () => {
          const hv = U.parseNum(h.value);
          if (hv == null || hv <= 0) { $('[data-warn]', el).innerHTML = '<span class="err">Isi harga beli dulu.</span>'; h.focus(); return; }
          commit({ beli: true, kosong: false, qtyBeli: U.parseNum(q.value) ?? it.qty, hargaBeli: hv, catatanGil: $('#sc', el).value.trim(), waktuBeli: U.nowTime() });
        };
        $('[data-kosong]', el).onclick = () => commit({ kosong: true, beli: false, qtyBeli: 0, catatanGil: $('#sc', el).value.trim() || 'Kosong di pasar', waktuBeli: U.nowTime() });
        const un = $('[data-undo]', el); if (un) un.onclick = () => commit({ beli: false, kosong: false });
      });
  }

  /* Suara: "ayam filet dada 185 kilo 58 ribu" → isi barang yang cocok */
  function voice(list) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'id-ID'; rec.interimResults = true; rec.maxAlternatives = 1;
    const close = sheet(`<h2>Silakan bicara</h2><p class="mute small" style="margin:6px 0 14px">Contoh: "Tahu 425 biji dua ribu". Butuh internet.</p><div class="card flat" style="min-height:64px" data-tr><span class="mute">Mendengarkan…</span></div><button class="btn ghost block" style="margin-top:12px" data-close>Batal</button>`,
      el => { el.addEventListener('click', e => { if (e.target.closest('[data-close]')) rec.abort(); }); });
    rec.onresult = e => {
      const t = [...e.results].map(r => r[0].transcript).join(' ');
      const box = $('#sheet-root [data-tr]'); if (box) box.textContent = t;
      if (e.results[e.results.length - 1].isFinal) {
        close();
        const r = parseSpeech(t, list);
        if (!r) { U.toast(`Barang tidak ditemukan: "${t}"`, 'warn', 4000); return; }
        setTimeout(() => itemSheet(r.o, r.it, { qty: r.qty, harga: r.harga }), 220);
      }
    };
    rec.onerror = e => { close(); U.toast(e.error === 'network' ? 'Input suara butuh internet' : e.error === 'not-allowed' ? 'Izinkan mikrofon di browser' : 'Suara tidak terdengar, coba lagi', 'warn'); };
    rec.start();
  }
  function parseSpeech(t, list) {
    let s = t.toLowerCase().replace(/(\d)[.,](\d{3})/g, '$1$2');
    s = s.replace(/(\d+(?:[.,]\d+)?)\s*(ribu|rb)/g, (_, n) => String(parseFloat(n.replace(',', '.')) * 1000)).replace(/(\d+(?:[.,]\d+)?)\s*juta/g, (_, n) => String(parseFloat(n.replace(',', '.')) * 1e6));
    const words = U.normName(s).split(' ');
    let best = null;
    for (const o of list) for (const it of o.items) {
      const iw = U.normName(it.nama).split(' ');
      const score = iw.filter(w => words.includes(w)).length / iw.length;
      if (score > 0 && (!best || score > best.score)) best = { o, it, score };
    }
    if (!best) return null;
    const nums = (s.match(/\d+(?:[.,]\d+)?/g) || []).map(U.parseNum);
    let qty, harga;
    if (nums.length >= 2) { qty = nums[0]; harga = nums[nums.length - 1]; }
    else if (nums.length === 1) { if (nums[0] >= 500) harga = nums[0]; else qty = nums[0]; }
    return { ...best, qty, harga };
  }

  /* ---------- Antar ---------- */
  GV.antar = async id => {
    if (id) return antarDetail(id);
    const list = gilOrders();
    return {
      html: `<div class="top"><div><h1>Antar</h1><p class="mute sub">Foto bukti dan tanda tangan penerima di dapur</p></div></div>
        ${list.length ? `<div class="stack">${list.map(o => `<a class="card tap row" href="#/antar/${o.id}" style="text-decoration:none"><span class="grow"><b>${E(dapurName(o))}</b><br><span class="small mute">${U.fmtDateLong(o.tanggal)}${o.jamAntar ? ' · ' + E(o.jamAntar) + ' WIT' : ''} · ${Calc.dibeli(o)}/${o.items.length} dibeli</span></span>${badge(o)}</a>`).join('')}</div>`
        : `<div class="empty">${ic('truck')}<h3>Tidak ada pengantaran</h3><p>Pengantaran muncul di sini setelah ada daftar belanja.</p></div>`}`
    };
  };
  XV.antar = GV.antar;

  async function antarDetail(id) {
    const o = await DB.orders.get(id);
    if (!o) return { html: '<div class="empty"><h3>Tidak ditemukan</h3></div>' };
    const files = await DB.files.byOrder(id);
    const bukti = files.filter(f => f.kind === 'bukti'), ttd = files.find(f => f.kind === 'ttd');
    const a = o.antar || {};
    const step = a.selesai ? 4 : a.mulai ? (bukti.length ? 3 : 2) : 1;
    const urls = bukti.map(f => URL.createObjectURL(f.blob));
    const n = (k, t) => `<span class="badge ${step > k ? 'b-selesai' : step === k ? 'b-dibeli' : 'b-baru'}" style="min-width:26px;justify-content:center">${step > k ? '✓' : k}</span> <b>${t}</b>`;
    return {
      html: `<div class="top"><div><a class="btn ghost sm" href="#/${isX() ? 'permintaan/' + o.id : 'antar'}" style="margin-left:-10px">${ic('back')} Kembali</a><h1>${E(dapurName(o))}</h1>
        <p class="mute sub">${U.fmtDateLong(o.tanggal)}${o.jamAntar ? ' · ' + E(o.jamAntar) + ' WIT' : ''}<br>${E(dapurOf(o)?.alamat || '')}</p></div>${badge(o)}</div>
        ${!Calc.semuaDibeli(o) ? `<div class="card warn" style="margin-bottom:12px">Baru ${Calc.dibeli(o)} dari ${o.items.length} barang dicentang. <a href="#/belanja">Lanjut belanja</a></div>` : ''}
        <div class="stack">
          <div class="card">${n(1, 'Berangkat')}<p class="small mute" style="margin:6px 0 10px">${a.mulai ? 'Berangkat pukul ' + E(a.mulai) + ' WIT' : 'Tekan saat mulai jalan ke dapur.'}</p>${!a.mulai ? `<button class="btn primary block" data-act="mulai">${ic('truck')} Mulai antar</button>` : ''}</div>
          <div class="card">${n(2, 'Foto bukti barang')}<p class="small mute" style="margin:6px 0 10px">Foto barang di dapur, terlihat jelas.</p>
            ${urls.length ? `<div class="thumbs" style="margin-bottom:10px">${urls.map((u, i) => `<img src="${u}" alt="Foto bukti ${i + 1}">`).join('')}</div>` : ''}
            ${!a.selesai ? `<button class="btn block ${a.mulai && !bukti.length ? 'primary' : ''}" data-act="foto">${ic('camera')} ${bukti.length ? 'Tambah foto' : 'Ambil foto'}</button>` : ''}</div>
          <div class="card">${n(3, 'Tanda tangan penerima')}
            ${a.selesai ? `<p class="small" style="margin-top:6px">Diterima <b>${E(a.penerima || '-')}</b> pukul ${E(a.selesai)} WIT</p>${ttd ? `<img src="${URL.createObjectURL(ttd.blob)}" alt="Tanda tangan" style="width:100%;max-width:320px;background:#fff;border-radius:12px;margin-top:8px">` : ''}`
            : `<div class="field" style="margin-top:10px"><label class="lbl" for="pn">Nama penerima</label><input class="input" id="pn" value="${E(a.penerima || '')}" placeholder="Nama petugas dapur" autocomplete="name"></div>
              <canvas class="sign" aria-label="Area tanda tangan"></canvas><div class="row between" style="margin-top:6px"><span class="tiny mute">Tanda tangan di kotak</span><button class="btn ghost sm" data-act="clear">Hapus</button></div>`}</div>
          ${!a.selesai ? `<button class="btn primary block" data-act="selesai">${ic('check')} Selesai, sudah sampai</button>` : `<div class="card ok"><b>Pengantaran selesai.</b><p class="small">Kirim hasil ke Xander supaya arsip lengkap.</p></div><button class="btn primary block" data-act="kirim">${ic('send')} Kirim hasil ke Xander</button>`}
        </div>`,
      mount: v => {
        const save = async () => { o.antar = a; await DB.orders.put(o); };
        const b = k => $(`[data-act=${k}]`, v);
        if (b('mulai')) b('mulai').onclick = async () => { a.mulai = U.nowTime(); o.log = [...(o.log || []), { t: Date.now(), m: 'Mulai antar' }]; await save(); U.buzz(); render(); };
        if (b('foto')) b('foto').onclick = async () => {
          const fs = await new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.capture = 'environment'; i.multiple = true; i.onchange = () => res([...i.files]); i.click(); });
          for (const f of fs) await DB.files.put({ id: U.uid('f'), orderId: o.id, kind: 'bukti', name: `Bukti-${U.slug(dapurName(o))}-${o.tanggal}-${Date.now().toString(36)}.jpg`, type: 'image/jpeg', blob: await U.compressImage(f), t: Date.now() });
          if (fs.length) { if (!a.mulai) a.mulai = U.nowTime(); await save(); U.toast(`${fs.length} foto disimpan`, 'ok'); render(); }
        };
        const cv = $('canvas.sign', v);
        let signed = false;
        if (cv) {
          const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
          cv.width = r.width * dpr; cv.height = r.height * dpr;
          const g = cv.getContext('2d'); g.scale(dpr, dpr); g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1B1236';
          let drawing = false, pid = null;
          const pos = e => { const b2 = cv.getBoundingClientRect(); return [e.clientX - b2.left, e.clientY - b2.top]; };
          cv.onpointerdown = e => { if (pid !== null) return; pid = e.pointerId; drawing = true; cv.setPointerCapture(e.pointerId); g.beginPath(); g.moveTo(...pos(e)); };
          cv.onpointermove = e => { if (!drawing || e.pointerId !== pid) return; g.lineTo(...pos(e)); g.stroke(); signed = true; };
          cv.onpointerup = cv.onpointercancel = e => { if (e.pointerId === pid) { drawing = false; pid = null; } };
          b('clear').onclick = () => { g.clearRect(0, 0, cv.width, cv.height); signed = false; };
        }
        if (b('selesai')) b('selesai').onclick = async () => {
          const pn = $('#pn', v).value.trim();
          if (!bukti.length) { const ok = await confirmSheet({ title: 'Belum ada foto bukti', body: 'Foto bukti membantu kalau ada pertanyaan dari dapur. Tetap selesaikan tanpa foto?', ok: 'Tetap selesai' }); if (!ok) return; }
          if (!pn) { U.toast('Isi nama penerima', 'error'); $('#pn', v).focus(); return; }
          if (signed) {
            const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
            await DB.files.put({ id: U.uid('f'), orderId: o.id, kind: 'ttd', name: `TTD-${U.slug(pn)}-${o.tanggal}.png`, type: 'image/png', blob, t: Date.now() });
          }
          a.penerima = pn; a.selesai = U.nowTime(); if (!a.mulai) a.mulai = a.selesai;
          o.log = [...(o.log || []), { t: Date.now(), m: `Diterima ${pn} di dapur` }];
          await save(); U.buzz([12, 50, 12]); U.toast('Pengantaran selesai', 'ok'); render();
        };
        if (b('kirim')) b('kirim').onclick = () => sendPaket([o]);
      }
    };
  }

  /* ============================================================
     PENGATURAN (dua peran)
     ============================================================ */
  const settingsView = async () => {
    const s = S.settings, p = s.perusahaan;
    let theme = 'auto', hap = '1';
    try { theme = localStorage.getItem('theme') || 'auto'; hap = localStorage.getItem('haptic') ?? '1'; } catch (e) {}
    const f = (id, label, val, extra = '') => `<div class="field"><label class="lbl" for="${id}">${label}</label><input class="input" id="${id}" value="${E(val || '')}" ${extra}></div>`;
    return {
      html: `<div class="top"><div><h1>Atur</h1><p class="mute sub">Perangkat ini dipakai oleh <b>${isX() ? 'Xander' : 'Gil'}</b></p></div></div>
        <div class="card stack">
          <div><span class="lbl">Pengguna perangkat ini</span><div class="seg" data-seg="role"><button data-v="xander" aria-pressed="${isX()}">Xander</button><button data-v="gil" aria-pressed="${!isX()}">Gil</button></div></div>
          <div><span class="lbl">Tampilan</span><div class="seg" data-seg="theme"><button data-v="auto" aria-pressed="${theme === 'auto'}">Otomatis</button><button data-v="light" aria-pressed="${theme === 'light'}">Terang</button><button data-v="dark" aria-pressed="${theme === 'dark'}">Gelap</button></div><p class="help" style="margin-top:6px">Otomatis: terang untuk Gil di pasar, gelap untuk Xander.</p></div>
          <label class="row between"><span class="lbl" style="margin:0">Getar saat mencentang</span><input type="checkbox" data-hap ${hap !== '0' ? 'checked' : ''} style="width:24px;height:24px;accent-color:var(--acc)"></label>
          <button class="btn block" data-install hidden>${ic('download')} Pasang aplikasi di perangkat ini</button>
        </div>

        ${isX() ? `<form class="section" data-form><h2>Perusahaan (tampil di invoice)</h2><div class="card">
          ${f('p-nama', 'Nama perusahaan', p.nama)}${f('p-badanHukum', 'Badan hukum', p.badanHukum)}${f('p-alamat', 'Alamat', p.alamat)}
          <div class="grid2">${f('p-telp', 'Telepon', p.telp, 'inputmode="tel"')}${f('p-email', 'Email', p.email, 'type="email"')}</div>
          <div class="grid2">${f('p-bank', 'Bank', p.bank, 'placeholder="Mandiri"')}${f('p-rekening', 'No. rekening', p.rekening, 'inputmode="numeric"')}</div>
          ${f('p-atasNama', 'Atas nama rekening', p.atasNama)}<p class="help">Data rekening hanya tersimpan di perangkat ini, tidak ikut online.</p>
          <div class="grid2">${f('p-penandatangan', 'Penanda tangan', p.penandatangan)}${f('p-jabatan', 'Jabatan', p.jabatan)}</div>
          ${f('p-kota', 'Kota (untuk tanggal invoice)', p.kota)}
        </div>
        <h2 class="section">Dapur MBG</h2>
        ${s.dapur.map((d, i) => `<details class="card" style="margin-bottom:10px" ${i === 0 ? '' : ''}><summary>${E(d.nama)} <span class="mute small">· kode ${E(d.kode)}</span></summary><div style="margin-top:12px">
          ${f(`d${i}-nama`, 'Nama singkat', d.nama)}${f(`d${i}-kepada`, 'Kepada Yth (di invoice)', d.kepada)}${f(`d${i}-namaLengkap`, 'Nama dapur di judul tabel', d.namaLengkap)}${f(`d${i}-alamat`, 'Alamat (di invoice)', d.alamat)}
          <div class="grid2">${f(`d${i}-kode`, 'Kode invoice', d.kode, 'maxlength="5" style="text-transform:uppercase"')}${f(`d${i}-jamAntar`, 'Jam antar biasa', d.jamAntar)}</div>
          ${f(`d${i}-wa`, 'WhatsApp dapur', d.wa, 'inputmode="tel" placeholder="0812…"')}
          ${f(`d${i}-kenali`, 'Kata kunci pengenal di nota', d.kenali)}<p class="help">Pisahkan dengan |. Dipakai untuk mengenali dapur otomatis dari nota.</p></div></details>`).join('')}
        <h2 class="section">Kontak tim</h2><div class="card"><div class="grid2">${f('k-waXander', 'WhatsApp Xander', s.kontak.waXander, 'inputmode="tel"')}${f('k-waGil', 'WhatsApp Gil', s.kontak.waGil, 'inputmode="tel"')}</div></div>
        <button class="btn primary block section" type="submit">${ic('check')} Simpan pengaturan</button></form>`
        : `<div class="section card"><div class="grid2">${f('k-waXander', 'WhatsApp Xander', s.kontak.waXander, 'inputmode="tel"')}</div><button class="btn block" data-savewa>Simpan</button></div>`}

        <div class="section"><h2>Data</h2><div class="stack">
          <button class="btn block" data-act="terima">${ic('pkg')} Terima paket atau pulihkan cadangan</button>
          <button class="btn block" data-act="backup">${ic('download')} Unduh cadangan lengkap</button>
          <button class="btn danger block" data-act="wipe">${ic('trash')} Hapus semua data di perangkat ini</button>
        </div><p class="tiny mute" style="margin-top:12px">Chreswill MBG versi 1.1 · data tersimpan di perangkat ini dan tetap bisa dipakai tanpa internet.</p></div>`,
      mount: v => {
        $$('[data-seg=role] button', v).forEach(b => b.onclick = () => { S.role = b.dataset.v; try { localStorage.setItem('role', S.role); } catch (e) {} go('#/beranda'); });
        $$('[data-seg=theme] button', v).forEach(b => b.onclick = () => { try { localStorage.setItem('theme', b.dataset.v); } catch (e) {} render(); });
        $('[data-hap]', v).onchange = e => { try { localStorage.setItem('haptic', e.target.checked ? '1' : '0'); } catch (er) {} U.buzz(); };
        const ins = $('[data-install]', v);
        if (window.__installPrompt) { ins.hidden = false; ins.onclick = async () => { window.__installPrompt.prompt(); await window.__installPrompt.userChoice; window.__installPrompt = null; ins.hidden = true; }; }
        const form = $('[data-form]', v);
        if (form) form.onsubmit = async e => {
          e.preventDefault();
          const val = id => $('#' + id, v)?.value.trim() ?? '';
          Object.keys(s.perusahaan).forEach(k => { if ($('#p-' + k, v)) s.perusahaan[k] = val('p-' + k); });
          s.dapur.forEach((d, i) => ['nama', 'kepada', 'namaLengkap', 'alamat', 'kode', 'jamAntar', 'wa', 'kenali'].forEach(k => { d[k] = k === 'kode' ? val(`d${i}-${k}`).toUpperCase() || d.kode : val(`d${i}-${k}`); }));
          s.kontak.waXander = val('k-waXander'); s.kontak.waGil = val('k-waGil');
          await DB.saveSettings(s); U.toast('Pengaturan disimpan', 'ok'); U.buzz(); render();
        };
        const sw = $('[data-savewa]', v);
        if (sw) sw.onclick = async () => { s.kontak.waXander = $('#k-waXander', v).value.trim(); await DB.saveSettings(s); U.toast('Disimpan', 'ok'); };
        $('[data-act=terima]', v).onclick = () => receivePaket();
        $('[data-act=backup]', v).onclick = async () => { const f2 = await Sync.backup(); U.download(f2, f2.name); U.toast('Cadangan diunduh', 'ok'); };
        $('[data-act=wipe]', v).onclick = async () => {
          if (!(await confirmSheet({ title: 'Hapus semua data?', body: 'Semua permintaan, invoice, foto, dan pengaturan di perangkat ini terhapus. Unduh cadangan dulu kalau perlu.', ok: 'Hapus semua', danger: true }))) return;
          await DB.wipe(); try { localStorage.removeItem('role'); } catch (e) {} S.role = null; U.toast('Semua data dihapus'); go('#/');
        };
      }
    };
  };
  XV.pengaturan = settingsView; GV.pengaturan = settingsView;

  /* ---------- Mulai ---------- */
  window.addEventListener('hashchange', render);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; });
  window.addEventListener('online', () => U.toast('Kembali online', 'ok'));
  window.addEventListener('offline', () => U.toast('Offline. Aplikasi tetap bisa dipakai.', 'warn'));
  // file yang dibuka lewat "Buka dengan" (Android, bila didukung)
  if ('launchQueue' in window) window.launchQueue.setConsumer(async p => { if (p.files?.length) receivePaket(await Promise.all(p.files.map(h => h.getFile()))); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e));
  DB.persist();
  render().catch(e => { console.error(e); $('#view').innerHTML = `<div class="empty"><h3>Aplikasi gagal dimuat</h3><p>${E(e.message)}</p></div>`; });
  window.ChreswillApp = { render, S, importFiles };
})();
