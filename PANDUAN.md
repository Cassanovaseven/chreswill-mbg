# Panduan Chreswill MBG — Versi 2.0 (real time)

Alamat: https://cassanovaseven.github.io/chreswill-mbg/

## Masuk
- **Xander:** pilih Xander, lalu ketik kata kunci. Hanya akun ini yang bisa melihat harga, invoice, keuntungan, dan rekening.
- **Gilbert:** cukup pilih Gilbert, tanpa kata kunci.
- Pasang di HP lewat Chrome, menu **⋮ → Tambahkan ke layar utama**.

## Alur harian
1. **Gilbert → Nota:** seret file atau foto nota ke **peti di atas truk** (area 3D), atau tekan "Pilih Excel atau foto" / "Foto nota".
   - Peti terbuka, file masuk, lalu peti bercahaya selama nota dibaca.
   - Setelah terbaca, cahaya memancar dan truk membawa nota ke Xander.
   - Harga **tidak** tampil di HP Gilbert.
2. **HP Xander (otomatis, ±1–2 detik):** invoice PDF sesuai template langsung jadi, disertai bunyi dan notifikasi. Nomornya contohnya `02/ERI/10/26`.
3. **Gilbert → Belanja:** centang barang dan isi harga beli. Kalau qty yang dibeli berubah atau ada barang kosong, **invoice di HP Xander ikut diperbarui otomatis** (selama belum ditandai lunas).
4. **Gilbert → Antar:** ambil foto bukti, isi nama penerima, minta tanda tangan, lalu tekan Selesai. Semuanya langsung tersimpan di HP Xander.
5. **Xander → Invoice:** tekan Bagikan untuk mengirim ke WhatsApp atau Gmail. Tandai Lunas setelah dibayar.
6. **Xander → Arsip:** unduh ZIP per hari, lalu simpan di Google Drive.

## Offline
Tanpa sinyal, aplikasi tetap bisa dipakai. Status di pojok berubah menjadi "Offline", dan data otomatis terkirim begitu ada sinyal. **Masuk pertama kali** butuh internet.

## Pertama kali di HP Xander
- Buka **Atur**, isi Bank, No Rekening, dan Atas Nama, lalu Simpan. Data ini terkunci, hanya akun Xander yang bisa membacanya.
- Di Beranda, tekan **Aktifkan notifikasi**.
- Ganti kata kunci kapan saja di **Atur → Ganti kata kunci Xander**.

## Server
Firebase proyek `chreswill-mbg` (akun Google apocryphaf1@gmail.com, paket gratis Spark, server Jakarta).
