# Kota Karya

Pengingat tugas dengan kota 3D (Three.js) yang tumbuh setiap Anda menyelesaikan tugas.

- **Kota 3D**: setiap tugas selesai menambah satu lantai pada menara. Pada poin tertentu muncul gedung baru, pohon, mobil, drone, helikopter, balon udara, dan roket. Siang, senja, dan malam mengikuti jam perangkat.
- **Tugas**: tenggat, prioritas, pengulangan, dan pengingat lewat notifikasi Android.
- **Ide (brainstorming 3D)**: peta ide berbentuk bola yang bisa diputar, cabang ide, kartu pemicu ide, dan tombol "Jadikan tugas".
- **Fokus**: timer 15/25/50 menit; sesi selesai memberi efek lembur di kota dan poin bonus.
- **Streak, grafik 7 hari, dan pencapaian.**

## Menjalankan di browser
```
npm install
npm run dev
```

## Membuat APK
Cara termudah: buka tab **Actions** di GitHub, jalankan workflow **Build APK Kota Karya**, lalu unduh artifact `KotaKarya-apk`. Workflow juga jalan otomatis setiap ada push ke folder `task-reminder/`.

Secara lokal (butuh JDK 21 dan Android SDK):
```
npm install
npm run sync
cd android && ./gradlew assembleDebug
```
Hasil: `android/app/build/outputs/apk/debug/app-debug.apk`.

Pasang di HP: izinkan "instal dari sumber tidak dikenal", lalu buka file APK. Saat pertama kali menyimpan tugas dengan tenggat, izinkan notifikasi (dan alarm tepat waktu di Android 12+).
