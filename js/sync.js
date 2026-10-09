/* Tukar data Xander ⇄ Gil lewat "paket" (file kecil yang dikirim lewat WhatsApp),
   cadangan lengkap, dan arsip ZIP per hari. Tanpa server, tanpa biaya. */
const Sync = (() => {
  const APP = 'chreswill-mbg';
  const GIL_FIELDS = ['qtyBeli', 'hargaBeli', 'beli', 'kosong', 'catatanGil', 'waktuBeli'];

  async function filesToJSON(list) {
    const out = [];
    for (const f of list) out.push({ ...f, blob: undefined, data: await U.blobToDataURL(f.blob) });
    return out;
  }
  async function jsonToFiles(list) {
    const out = [];
    for (const f of list || []) { const { data, ...rest } = f; out.push({ ...rest, blob: await U.dataURLToBlob(data) }); }
    return out;
  }

  /* Paket untuk Gil: tanpa harga jual, harga nota, dan keuntungan */
  function forGil(o) {
    const c = structuredClone(o);
    c.items = c.items.map(({ hargaJual, hargaNota, jumlahNota, ...it }) => it);
    delete c.totalNota; delete c.invoice;
    return c;
  }

  async function makePaket(role, orders) {
    const files = [];
    if (role === 'gil') for (const o of orders) files.push(...(await DB.files.byOrder(o.id)).filter(f => f.kind === 'bukti' || f.kind === 'ttd'));
    const pk = { app: APP, type: 'paket', from: role, createdAt: Date.now(), orders: role === 'xander' ? orders.map(forGil) : orders.map(o => ({ id: o.id, items: o.items.map(it => { const x = { id: it.id }; GIL_FIELDS.forEach(k => x[k] = it[k]); return x; }), antar: o.antar || null })), files: await filesToJSON(files) };
    const label = role === 'xander' ? 'untuk-Gil' : 'untuk-Xander';
    return new File([JSON.stringify(pk)], `Paket-${label}-${U.today()}-${U.nowTime().replace('.', '')}.chreswill.json`, { type: 'application/json' });
  }

  async function applyPaket(text, myRole) {
    let pk;
    try { pk = JSON.parse(text); } catch (e) { throw new Error('File ini bukan paket Chreswill.'); }
    if (pk.app !== APP) throw new Error('File ini bukan paket Chreswill.');
    if (pk.type === 'backup') return { backup: pk };
    let n = 0;
    if (pk.from === 'xander') {
      for (const inc of pk.orders) {
        const cur = await DB.orders.get(inc.id);
        if (cur) {
          // pertahankan isian Gil yang sudah ada
          inc.items = inc.items.map(it => {
            const old = cur.items.find(x => x.id === it.id);
            if (old && (old.beli || old.kosong)) GIL_FIELDS.forEach(k => it[k] = old[k]);
            return it;
          });
          inc.antar = cur.antar || inc.antar;
          if (myRole === 'xander') { // jaga data sendiri bila paket dibuka di HP Xander
            inc.items = inc.items.map(it => { const old = cur.items.find(x => x.id === it.id) || {}; return { ...it, hargaJual: old.hargaJual, hargaNota: old.hargaNota, jumlahNota: old.jumlahNota }; });
            inc.totalNota = cur.totalNota; inc.invoice = cur.invoice;
          }
        }
        await DB.orders.put(inc); n++;
      }
    } else if (pk.from === 'gil') {
      for (const inc of pk.orders) {
        const cur = await DB.orders.get(inc.id);
        if (!cur) continue;
        cur.items = cur.items.map(it => {
          const g = inc.items.find(x => x.id === it.id);
          if (!g) return it;
          const nx = { ...it };
          GIL_FIELDS.forEach(k => { if (g[k] !== undefined) nx[k] = g[k]; });
          return nx;
        });
        if (inc.antar) cur.antar = inc.antar;
        cur.log = [...(cur.log || []), { t: Date.now(), m: 'Data belanja dari Gil diterima' }];
        await DB.orders.put(cur); n++;
      }
    }
    for (const f of await jsonToFiles(pk.files)) await DB.files.put(f);
    return { count: n, from: pk.from };
  }

  async function backup() {
    const pk = { app: APP, type: 'backup', createdAt: Date.now(), settings: await DB.settings(), orders: await DB.orders.all(), files: await filesToJSON(await DB.files.all()) };
    return new File([JSON.stringify(pk)], `Cadangan-Chreswill-${U.today()}.chreswill.json`, { type: 'application/json' });
  }
  async function restore(pk) {
    await DB.wipe();
    await DB.saveSettings(pk.settings);
    for (const o of pk.orders) await DB.orders.put(o);
    for (const f of await jsonToFiles(pk.files)) await DB.files.put(f);
    return pk.orders.length;
  }

  /* Permintaan sebagai Excel (berguna kalau aslinya foto) */
  function permintaanXlsx(o, dapur) {
    const rows = [['NOTA PESANAN BAHAN MAKANAN'], ['No. ' + (o.noNota || '-')], [], ['Dari', ': ' + (dapur?.namaLengkap || '')], ['Tanggal', ': ' + U.fmtDate(o.tanggal)], ['Waktu', ': ' + (o.jamAntar || '') + ' WIT'], [], ['NO', 'URAIAN BAHAN MAKANAN', 'SATUAN', 'QTY', 'HARGA', 'JUMLAH']];
    o.items.forEach((it, i) => rows.push([i + 1, it.nama, it.satuan, it.qty, it.hargaNota, (it.qty || 0) * (it.hargaNota || 0)]));
    rows.push(['', 'TOTAL (hitung)', '', '', '', Calc.notaHitung(o)]);
    if (o.totalNota != null) rows.push(['', 'TOTAL (tertulis di nota)', '', '', '', o.totalNota]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 34 }, { wch: 10 }, { wch: 9 }, { wch: 14 }, { wch: 18 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Permintaan');
    return new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* ZIP arsip: Chreswill-Arsip/2026/10-Oktober/09/SPPG-Taman-Makmur/... */
  async function zipDay(tanggal, orders, settings) {
    const zip = new JSZip();
    const { y, m, d } = U.ymd(tanggal);
    const base = `Chreswill-Arsip/${y}/${String(m).padStart(2, '0')}-${U.BULAN[m - 1]}/${String(d).padStart(2, '0')}`;
    for (const o of orders) {
      const dapur = settings.dapur.find(x => x.id === o.dapurId);
      const dir = zip.folder(`${base}/${U.slug(dapur?.nama || 'Tanpa-dapur')}`);
      for (const f of await DB.files.byOrder(o.id)) {
        const pre = { nota: '1-Permintaan', invoice: '3-Invoice', bukti: '4-Bukti', ttd: '4-Tanda-tangan' }[f.kind] || 'Lain';
        dir.file(`${pre}-${U.slug(f.name)}`, f.blob);
      }
      dir.file('2-Permintaan-rapi.xlsx', permintaanXlsx(o, dapur));
      dir.file('ringkasan.json', JSON.stringify(o, null, 2));
    }
    return zip.generateAsync({ type: 'blob' });
  }

  return { makePaket, applyPaket, backup, restore, zipDay, permintaanXlsx, forGil };
})();
