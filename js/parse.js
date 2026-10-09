/* Membaca "Nota Pesanan Bahan Makanan" dari Excel atau teks hasil foto (OCR).
   Kolom dikenali dari judulnya, jadi urutan kolom tiap dapur boleh berbeda. */
const Parse = (() => {
  const COLS = {
    no: /^(no|nomor|no\.)$/,
    nama: /uraian|bahan|nama barang|nama bahan|item/,
    satuan: /satuan|unit/,
    qty: /qty|kuantitas|volume|banyak|jml barang|kwantitas/,
    harga: /harga/,
    jumlah: /jumlah|subtotal|total harga/
  };
  const SATUAN = 'kg|kilo|pcs|pc|ikat|liter|ltr|butir|btr|bks|bungkus|pack|pak|gram|gr|ons|sisir|buah|bh|papan|karung|sak|dus|krat|ekor|potong|ptg|kaleng|botol|tray|rak|lembar|batang|bal|biji|bonggol|siung|kotak|box';
  // salah baca OCR yang sering muncul pada foto layar: "pcs" → "pe", "kg" → "ke"
  const OCR_SAT = { pe: 'pcs', pes: 'pcs', pc5: 'pcs', pcs: 'pcs', pc: 'pcs', ke: 'kg', kq: 'kg', k9: 'kg', kgs: 'kg', ko: 'kg', kilo: 'kg' };
  const txt = v => String(v ?? '').replace(/\s+/g, ' ').trim();

  function detectDapur(text, dapurList) {
    const t = U.normName(text);
    for (const d of dapurList) {
      const keys = String(d.kenali || d.nama).toLowerCase().split('|').map(U.normName).filter(Boolean);
      if (keys.some(k => t.includes(k))) return d.id;
    }
    return '';
  }

  function cleanTime(s) {
    const m = String(s || '').match(/(\d{1,2})\s*[:.]\s*(\d{2})/);
    return m ? `${m[1].padStart(2, '0')}.${m[2]}` : '';
  }

  /* Satu baris judul tabel? Kembalikan peta kolom. */
  function headerMap(row, next) {
    const map = {};
    const width = Math.max(row.length, next ? next.length : 0);
    for (let c = 0; c < width; c++) {
      const label = U.normName(txt(row[c]) + ' ' + (next ? txt(next[c]) : ''));
      if (!label) continue;
      for (const [k, re] of Object.entries(COLS)) {
        if (map[k] !== undefined) continue;
        if (k === 'harga' && /jumlah/.test(label) && !/harga/.test(label.split(' ')[0])) continue;
        if (k === 'jumlah' && /harga/.test(label) && !/total harga/.test(label)) continue;
        if (re.test(label)) { map[k] = c; break; }
      }
    }
    if (map.nama === undefined || !COLS.nama.test(U.normName(row[map.nama]))) return null; // judul harus ada di baris ini sendiri
    return (map.qty !== undefined || map.jumlah !== undefined) && (map.satuan !== undefined || map.harga !== undefined) ? map : null;
  }

  /* Ambil angka di kolom; kalau sel itu berisi "Rp", angkanya ada di kolom sebelahnya. */
  function numAt(row, c, taken) {
    if (c === undefined) return null;
    for (const cc of [c, c + 1, c + 2]) {
      if (cc !== c && taken.has(cc)) break;
      const n = U.parseNum(row[cc]);
      if (n !== null) return n;
      if (cc !== c && txt(row[cc])) break;
    }
    return null;
  }

  function fromRows(rows, settings) {
    const notas = [];
    let blockStart = 0;
    for (let r = 0; r < rows.length; r++) {
      const map = headerMap(rows[r] || [], rows[r + 1]);
      if (!map) continue;
      const taken = new Set(Object.values(map));
      // baris judul kedua ("BAHAN MAKANAN") dilewati
      let start = r + 1;
      const nx = rows[r + 1] || [];
      if (/bahan|makanan/i.test(txt(nx[map.nama])) && U.parseNum(nx[map.qty]) === null) start = r + 2;

      const items = [];
      let totalNota = null, end = start, blank = 0;
      for (let i = start; i < rows.length; i++) {
        const row = rows[i] || [];
        end = i;
        if (row.some(c => /^(grand\s*)?total\s*:?$/i.test(txt(c)))) {
          for (let c = row.length - 1; c >= 0; c--) { const n = U.parseNum(row[c]); if (n !== null && n > 0) { totalNota = n; break; } }
          break;
        }
        const nama = txt(row[map.nama]);
        if (!nama) { if (++blank >= 3) break; continue; }
        blank = 0;
        if (headerMap(row, rows[i + 1])) { end = i - 1; break; }
        const qty = numAt(row, map.qty, taken);
        const harga = numAt(row, map.harga, taken);
        const jumlah = numAt(row, map.jumlah, taken);
        if (qty === null && harga === null && jumlah === null) continue;
        items.push({ nama, satuan: txt(row[map.satuan]).replace(/^'/, ''), qty: qty ?? (harga && jumlah ? jumlah / harga : 0), hargaNota: harga ?? (qty && jumlah ? jumlah / qty : 0), jumlahNota: jumlah });
      }

      // data kepala nota: di atas tabel
      const meta = { dari: '', kepada: '', alamat: '', waktu: '', noNota: '' };
      let blob = '';
      for (let i = blockStart; i < r; i++) {
        const row = (rows[i] || []).map(txt).filter(Boolean);
        if (!row.length) continue;
        blob += ' ' + row.join(' ');
        const label = row[0].toLowerCase().replace(/[:\s]+$/, '');
        const val = row.slice(1).join(' ').replace(/^:\s*/, '').trim() || row[0].replace(/^[^:]+:\s*/, '');
        if (/^dari\b/.test(label)) meta.dari = val;
        else if (/^kepada\b/.test(label)) meta.kepada = val;
        else if (/^alamat\b/.test(label)) meta.alamat = val;
        else if (/^waktu\b/.test(label)) meta.waktu = val;
        const no = row.join(' ').match(/^no\.?\s*[:.]?\s*(\d{1,5}\s*\/.+)$/i);
        if (no) meta.noNota = no[1].trim();
      }
      // tanggal: "Ambon, Kamis 01 Oktober 2026" di bawah tabel, atau dari baris Waktu
      let tanggal = null;
      for (let i = end; i < Math.min(rows.length, end + 10) && !tanggal; i++) tanggal = U.findDate((rows[i] || []).map(txt).join(' '));
      if (!tanggal) tanggal = U.findDate(meta.waktu) || U.findDate(blob);
      for (let i = end; i < Math.min(rows.length, end + 14); i++) blob += ' ' + (rows[i] || []).map(txt).join(' ');

      if (items.length) {
        notas.push({
          dapurId: detectDapur([meta.dari, meta.kepada, meta.alamat, blob].join(' '), settings.dapur),
          tanggal: tanggal || U.today(),
          jamAntar: cleanTime(meta.waktu),
          noNota: meta.noNota,
          dari: meta.dari, kepada: meta.kepada,
          items, totalNota
        });
      }
      blockStart = end + 1;
      r = end;
    }
    return notas;
  }

  async function excel(file, settings) {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    const out = [];
    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '', blankrows: true });
      out.push(...fromRows(rows, settings));
    }
    return out;
  }

  /* Teks OCR → satu nota. Hasilnya selalu ditinjau Xander sebelum disimpan. */
  function text(raw, settings) {
    const lines = String(raw).split(/\n+/).map(l => l.replace(/[|_—–]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const items = [];
    let totalNota = null, noNota = '', jamAntar = '';
    const satRe = new RegExp('(?:^|\\s)(' + SATUAN + '|' + Object.keys(OCR_SAT).join('|') + ')\\.?(?=\\s|$)', 'i');
    for (const l of lines) {
      const no = l.match(/no\.?\s*[:.]?\s*(\d{1,5}\s*\/\s*SPPG.+)$/i);
      if (no) { noNota = no[1].replace(/\s+/g, ' ').trim().replace(/\s+\S{1,2}$/, ''); continue; }
      if (/^\W*\d{0,4}\s*waktu/i.test(l)) { jamAntar = cleanTime(l); continue; }
      if (/\btotal\b/i.test(l)) {
        const ns = (l.match(/\d{1,3}(?:[.,]\d{3})+|\d{4,}/g) || []).map(U.parseNum).filter(n => n !== null);
        if (ns.length) totalNota = ns[ns.length - 1];
        continue;
      }
      if (/uraian|satuan|harga|qty|jumlah/i.test(l)) continue;
      const m = l.match(satRe);
      if (!m) continue;
      const idx = m.index + m[0].indexOf(m[1]);
      let nama = l.slice(0, idx).replace(/^[\s\d.,:;)(\]\['"`-]+/, '').replace(/[\s:;-]+$/, '').replace(/(\s+(\d+|\S))+$/, '').trim();
      if (!/[a-z]{2,}/i.test(nama)) continue;
      const rest = l.slice(idx + m[1].length);
      const tokens = [...rest.matchAll(/(rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+(?:,\d+)?|\d+(?:,\d+)?)/ig)].map(x => ({ n: U.parseNum(x[2]), rp: !!x[1] })).filter(t => t.n !== null);
      if (!tokens.length) continue; // baris tanpa angka bukan baris barang
      let qty = 0, harga = 0, jumlah = null;
      if (tokens.length >= 3) {
        let best = null;
        for (let a = 0; a < tokens.length; a++) for (let b = 0; b < tokens.length; b++) for (let c = 0; c < tokens.length; c++) {
          if (a === b || a === c || b === c) continue;
          const prod = tokens[a].n * tokens[b].n;
          if (prod && Math.abs(prod - tokens[c].n) / tokens[c].n < 0.01) { best = [a, b, c]; break; }
        }
        if (best) {
          let [a, b, c] = best;
          if (tokens[a].rp && !tokens[b].rp || (!tokens[b].rp && tokens[a].n > tokens[b].n)) [a, b] = [b, a];
          qty = tokens[a].n; harga = tokens[b].n; jumlah = qty * harga;
        } else {
          jumlah = Math.max(...tokens.map(t => t.n));
          const rest2 = tokens.filter(t => t.n !== jumlah);
          const h = rest2.find(t => t.rp) || rest2.reduce((p, t) => t.n > p.n ? t : p, rest2[0]);
          harga = h ? h.n : 0;
          const q = rest2.find(t => t !== h);
          qty = q ? q.n : 0;
          // garis tabel sering terbaca sebagai angka "1" (190 → 1190): hitung ulang qty dari jumlah ÷ harga
          const d = harga ? jumlah / harga : 0;
          if (d > 0 && Math.abs(d * 100 - Math.round(d * 100)) < 1e-6) qty = Math.round(d * 100) / 100;
        }
      } else if (tokens.length === 2) {
        const [x, y] = tokens;
        const h = x.rp ? x : y.rp ? y : (x.n > y.n ? x : y);
        harga = h.n; qty = (h === x ? y : x).n;
      } else if (tokens.length === 1) qty = tokens[0].n;
      if (qty > 50000) { jumlah = jumlah ?? qty; qty = 0; } // angka sebesar ini hampir pasti jumlah, bukan qty
      const raw = m[1].toLowerCase();
      const sat = OCR_SAT[raw] || raw;
      nama = nama.replace(/^[A-Z](?=[A-Z][a-z])/, ''); // "IKacang" → "Kacang"
      nama = nama.replace(/([a-z])([A-Z])/g, '$1 $2'); // "TunaLoin" → "Tuna Loin"
      items.push({ nama: nama.charAt(0).toUpperCase() + nama.slice(1), satuan: sat, qty, hargaNota: harga, jumlahNota: jumlah, cek: !qty || !harga || (jumlah && Math.abs(qty * harga - jumlah) / jumlah > 0.01) });
    }
    // satu barang tanpa qty: hitung dari total nota
    const kurang = items.filter(it => !it.qty && it.hargaNota);
    if (kurang.length === 1 && totalNota) {
      const lain = items.reduce((t, it) => t + (it === kurang[0] ? 0 : it.qty * it.hargaNota), 0);
      const q = (totalNota - lain) / kurang[0].hargaNota;
      if (q > 0 && Math.abs(q - Math.round(q)) < 1e-6) { kurang[0].qty = Math.round(q); kurang[0].cek = true; }
    }
    const whole = lines.join(' ');
    const ambonLine = lines.find(l => /ambon\s*,/i.test(l));
    return {
      dapurId: detectDapur(whole, settings.dapur),
      tanggal: U.findDate(ambonLine || '') || U.findDate(whole) || U.today(),
      jamAntar, noNota, items, totalNota
    };
  }

  return { excel, text, fromRows, detectDapur };
})();
