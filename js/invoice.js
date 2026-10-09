/* Perhitungan nota/invoice dan pembuatan PDF + Excel invoice. */
const Calc = {
  qty: it => it.kosong ? 0 : (it.qtyBeli ?? it.qty ?? 0),
  jual: it => it.hargaJual ?? it.hargaNota ?? 0,
  lineJual: it => Calc.qty(it) * Calc.jual(it),
  lineBeli: it => it.hargaBeli != null ? Calc.qty(it) * it.hargaBeli : null,
  notaHitung: o => o.items.reduce((s, it) => s + (it.qty || 0) * (it.hargaNota || 0), 0),
  total: o => o.items.reduce((s, it) => s + Calc.lineJual(it), 0),
  modal: o => o.items.reduce((s, it) => s + (Calc.lineBeli(it) || 0), 0),
  untung: o => o.items.reduce((s, it) => it.hargaBeli != null && !it.kosong ? s + Calc.lineJual(it) - Calc.lineBeli(it) : s, 0),
  semuaDibeli: o => o.items.length > 0 && o.items.every(it => it.beli || it.kosong),
  dibeli: o => o.items.filter(it => it.beli || it.kosong).length,
  selisihNota: o => o.totalNota != null ? o.totalNota - Calc.notaHitung(o) : 0
};

/* Invoice mengikuti template CV: kop biru, kotak Tanggal/No Invoice, tabel Item–Satuan–Qty–Harga–Total,
   blok Pembayaran Melalui, garis tanda tangan, dan ucapan terima kasih. */
const Invoice = (() => {
  const BLUE = [46, 84, 150], NAVY = [31, 56, 120], RED = [150, 36, 52], BLACK = [20, 20, 20], WHITE = [255, 255, 255];
  // Angka mengikuti template: 5,000 dan Rp 1,425,000
  const num = n => Math.round(+n || 0).toLocaleString('en-US');
  const qtyStr = n => (+n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const rpx = n => 'Rp ' + num(n);
  const tgl = s => { const { y, m, d } = U.ymd(s); return `${d}/${m}/${y}`; };
  const hariTgl = s => { const { y, m, d } = U.ymd(s); return `${U.HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${String(d).padStart(2, '0')} ${U.BULAN[m - 1]} ${y}`; };
  const rows = o => o.items.filter(it => !it.kosong && Calc.qty(it) > 0);

  function bar(doc, x, y, w, label) {
    doc.setFillColor(...BLUE); doc.rect(x, y, w, 6.2, 'F');
    doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text(label, x + 1.5, y + 4.4);
  }

  function pdf(o, dapur, s) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const P = s.perusahaan, M = 16, R = 194;

    // kop
    doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(P.nama, M, 30);
    doc.setTextColor(...BLACK); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    if (P.badanHukum) doc.text('Badan Hukum : ' + P.badanHukum, M, 37);
    doc.text(doc.splitTextToSize(P.alamat || '', 110), M, P.badanHukum ? 43 : 37);
    doc.setTextColor(...RED); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
    doc.text('INVOICE', R, 29, { align: 'right' });

    // kepada & alamat
    let y = 52;
    bar(doc, M, y, 70, 'KEPADA YTH');
    doc.setTextColor(...BLACK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
    doc.text(dapur?.kepada || dapur?.namaLengkap || dapur?.nama || '-', M + 1, y + 11);
    bar(doc, M, y + 14, 70, 'ALAMAT');
    doc.setTextColor(...BLACK); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    // seperti template: jalan di baris pertama, "Kec ..." di baris kedua
    const al = String(dapur?.alamat || '').split(/,\s*(?=Kec)/i).flatMap(l => doc.splitTextToSize(l, 78));
    doc.text(al, M + 1, y + 25.5, { lineHeightFactor: 1.5 });

    // tanggal & nomor
    doc.setFillColor(...BLUE); doc.rect(118, y - 2, R - 118, 6.2, 'F');
    doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('TANGGAL', 137, y + 2.4, { align: 'center' }); doc.text('NO INVOICE', 175, y + 2.4, { align: 'center' });
    doc.setTextColor(...BLACK); doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
    doc.text(tgl(o.invoice.tanggal), 137, y + 9.5, { align: 'center' }); doc.text(o.invoice.no, 175, y + 9.5, { align: 'center' });

    // judul tabel
    y = Math.max(y + 25.5 + al.length * 5.2, 90) + 6;
    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(10);
    doc.text(`Kebutuhan Bahan Baku ${hariTgl(o.tanggal)}, ${dapur?.namaLengkap || dapur?.nama || ''}`, M, y);

    const total = Calc.total(o);
    doc.autoTable({
      startY: y + 1.5, margin: { left: M, right: 210 - R },
      head: [['ITEM', 'SATUAN', 'QTY', 'HARGA', 'TOTAL']],
      body: rows(o).map(it => [it.nama, it.satuan || '', qtyStr(Calc.qty(it)), num(Calc.jual(it)), rpx(Calc.lineJual(it))]),
      foot: [[{ content: 'TOTAL', colSpan: 4, styles: { halign: 'center', fillColor: BLUE, textColor: WHITE } }, { content: rpx(total), styles: { halign: 'right', fillColor: WHITE, textColor: BLACK } }]],
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 10, textColor: BLACK, lineColor: BLACK, lineWidth: 0.25, cellPadding: { top: 1.6, bottom: 1.6, left: 1.5, right: 1.5 } },
      headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', halign: 'center' },
      footStyles: { fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 26, halign: 'center' }, 2: { cellWidth: 22, halign: 'center' }, 3: { cellWidth: 32, halign: 'right' }, 4: { halign: 'right' } }
    });
    y = doc.lastAutoTable.finalY + 22;

    // pembayaran
    doc.setTextColor(...BLACK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('PEMBAYARAN MELALUI', M, y);
    doc.setFont('helvetica', 'normal');
    [['Bank', P.bank], ['No Rekening', P.rekening], ['Atas Nama', P.atasNama]].forEach(([k, v], i) => {
      doc.text(k, M, y + 6 + i * 5.6); doc.text(': ' + (v || '-'), 78, y + 6 + i * 5.6);
    });
    doc.setDrawColor(...BLACK); doc.setLineWidth(0.3); doc.line(128, y + 19, R, y + 19);
    if (P.penandatangan) { doc.setFontSize(9.5); doc.text(P.penandatangan, 161, y + 24, { align: 'center' }); }

    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(10);
    doc.text('Terima Kasih Atas Kepercayaannya !', M, y + 40);
    return doc.output('blob');
  }

  function xlsx(o, dapur, s) {
    const P = s.perusahaan;
    const aoa = [
      [P.nama, '', '', '', 'INVOICE'],
      [P.badanHukum ? 'Badan Hukum : ' + P.badanHukum : ''],
      [P.alamat], [],
      ['KEPADA YTH', '', '', 'TANGGAL', 'NO INVOICE'],
      [dapur?.kepada || dapur?.nama || '', '', '', tgl(o.invoice.tanggal), o.invoice.no],
      ['ALAMAT'], [dapur?.alamat || ''], [],
      [`Kebutuhan Bahan Baku ${hariTgl(o.tanggal)}, ${dapur?.namaLengkap || dapur?.nama || ''}`],
      ['ITEM', 'SATUAN', 'QTY', 'HARGA', 'TOTAL']
    ];
    const first = aoa.length + 1;
    rows(o).forEach(it => aoa.push([it.nama, it.satuan, Calc.qty(it), Calc.jual(it), null]));
    const last = aoa.length;
    aoa.push(['TOTAL', '', '', '', null], [], [], ['PEMBAYARAN MELALUI'], ['Bank', ': ' + (P.bank || '')], ['No Rekening', ': ' + (P.rekening || '')], ['Atas Nama', ': ' + (P.atasNama || '')], [], [], ['Terima Kasih Atas Kepercayaannya !']);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    for (let r = first; r <= last; r++) { ws['E' + r] = { t: 'n', f: `C${r}*D${r}`, v: aoa[r - 1][2] * aoa[r - 1][3], z: '"Rp "#,##0' }; ws['D' + r].z = '#,##0'; }
    ws['E' + (last + 1)] = { t: 'n', f: `SUM(E${first}:E${last})`, v: Calc.total(o), z: '"Rp "#,##0' };
    ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 20 }];
    ws['!merges'] = [{ s: { r: last, c: 0 }, e: { r: last, c: 3 } }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
    return new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  const fileName = (o, dapur, ext) => U.slug(`Invoice ${o.invoice.no.replace(/\//g, '-')} ${dapur?.nama || ''}`) + '.' + ext;

  return { pdf, xlsx, fileName };
})();
