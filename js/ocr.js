/* Membaca tulisan dari foto nota, sepenuhnya di perangkat (tanpa internet setelah pertama dipakai). */
const OCR = (() => {
  let workerP = null;

  function loadScript(src) {
    return new Promise((ok, no) => {
      if (window.Tesseract) return ok();
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => no(new Error('Mesin pembaca foto gagal dimuat'));
      document.head.appendChild(s);
    });
  }

  async function worker(onProgress) {
    if (!workerP) {
      workerP = (async () => {
        await loadScript('vendor/tesseract/tesseract.min.js');
        const base = new URL('vendor/tesseract/', location.href).href;
        const w = await Tesseract.createWorker('ind', 1, {
          workerPath: base + 'worker.min.js',
          corePath: base + 'core',
          langPath: base + 'lang',
          gzip: true,
          logger: m => OCR._progress && OCR._progress(m)
        });
        await w.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '6' });
        return w;
      })().catch(e => { workerP = null; throw e; });
    }
    OCR._progress = onProgress;
    return workerP;
  }

  /* Perbesar, abu-abukan, dan pertajam kontras supaya foto layar lebih mudah dibaca */
  async function prepare(file) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(2.2, Math.max(1, 2400 / Math.max(bmp.width, bmp.height)));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(bmp, 0, 0, c.width, c.height);
    const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) { const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = y; sum += y; }
    const mean = sum / (d.length / 4);
    for (let i = 0; i < d.length; i += 4) {
      let y = (d[i] - mean) * 1.6 + 150;
      y = y < 0 ? 0 : y > 255 ? 255 : y;
      d[i] = d[i + 1] = d[i + 2] = y;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  async function read(file, onProgress = () => {}) {
    onProgress({ status: 'Menyiapkan mesin pembaca', progress: 0 });
    const w = await worker(m => {
      const map = { 'loading tesseract core': 'Memuat mesin pembaca', 'loading language traineddata': 'Memuat kamus Bahasa Indonesia', 'initializing api': 'Menyiapkan', 'recognizing text': 'Membaca tulisan' };
      onProgress({ status: map[m.status] || 'Memproses', progress: m.progress || 0 });
    });
    onProgress({ status: 'Merapikan foto', progress: 0 });
    const canvas = await prepare(file);
    const { data } = await w.recognize(canvas);
    return data.text;
  }

  return { read, _progress: null };
})();
