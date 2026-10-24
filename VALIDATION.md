# Hasil verifikasi — 24 Oktober 2026

## Perbaikan biometrik 1.0.1

- Timestamp latar belakang dikonsumsi saat resume dan dibersihkan setelah unlock berhasil. Resume berulang serta urutan callback autentikasi sebelum/sesudah resume tidak lagi mengunci ulang aplikasi memakai timestamp lama. Pause berulang tetap memakai awal periode latar belakang.
- Permintaan biometrik bersamaan ditolak; PIN dan biometrik di layar kunci tidak berjalan bersamaan. Ketersediaan sensor diperiksa ulang pada setiap percobaan.
- Pembatalan kembali ke PIN tanpa pesan gagal; lockout Android, sensor tidak tersedia, enrollment kosong, serta interupsi sistem mendapat pesan yang sesuai.
- 23 unit test lulus, termasuk mock plugin native untuk perubahan ketersediaan, permintaan ganda, pembatalan, interupsi, dan percobaan ulang. Tes browser regresi mencakup kedua urutan callback unlock/resume, event berulang, dan penguncian setelah periode latar belakang berikutnya.
- Build APK/AAB release dengan R8 dan lint Android lulus. Tes sensor sidik jari/wajah fisik belum dilakukan karena tidak ada perangkat Android yang terhubung pada sesi ini.

Catatan berikut merekam verifikasi versi 1.0.0 sebelumnya.

Think Twice 1.0.0, application ID `com.andika.thinktwice`.

## Pemeriksaan otomatis

- Prettier, Oxlint, TypeScript, dan production build: lulus.
- 19 unit test: lulus. Mencakup saldo, transfer, cadangan, batas 24 jam, konfirmasi ganda, validasi referensi, pengarsipan, estimasi tujuan, enkripsi/pemulihan backup, escaping CSV, PIN, penundaan percobaan, dan jadwal notifikasi.
- 11 skenario browser Chrome: lulus. Mencakup onboarding, CRUD transaksi, persistensi, transfer/target, pencarian, PIN, pembelian setelah 24 jam, backup–restore, password salah, ekspor CSV, lebar layar 360 px dan desktop, animasi aktif, serta perubahan reduced motion saat animasi berjalan.
- Screenshot onboarding dan seluruh halaman utama diperiksa. Screenshot browser dan Android tersedia di `test-results/` setelah pengujian.

## Android

Build debug berhasil dengan JDK 21, SDK platform 36, dan Gradle wrapper. APK versi 1.0.0 tersedia di `artifacts/think-twice-debug.apk`.

Verifikasi dilakukan pada emulator Android API 37, melalui WebView aplikasi hasil build:

- Onboarding menulis saldo dan kantong ke SQLite native.
- Saldo dan cadangan tetap ada setelah proses aplikasi dihentikan dan dibuka kembali.
- Izin notifikasi diberikan dan dua jadwal native dibuat: akhir jeda serta review mingguan. Pengingat menggunakan alarm biasa tanpa membuka izin alarm tepat waktu.
- Dialog simpan file Android terbuka; pembatalan mengembalikan kendali dengan pesan yang jelas dan tidak mengubah data.
- PIN tersimpan melalui secure storage native; cold start terkunci, PIN salah ditolak, dan PIN benar membuka aplikasi.
- Kembali setelah lebih dari 30 detik waktu perangkat di latar belakang menampilkan layar kunci.
- APK terbaru dengan motion diverifikasi pada emulator API 37 dengan partisi data uji terpisah. Unlock, animasi beranda hingga keadaan akhir, navigasi tab, penutupan sheet melalui Back native, penyimpanan SQLite diikuti feedback sukses, serta reduced motion: lulus. Tidak ada runtime error WebView selama pemeriksaan motion.
- Pembatalan dialog file membutuhkan Back tambahan jika keyboard pemilih file masih terbuka; smoke script kini menunggu aplikasi kembali aktif. Screenshot akhir motion: `test-results/android-motion-home.png`.

Script pengujian native memakai emulator dengan data uji baru, bukan perangkat berisi data pribadi:

```sh
node scripts/smoke-android.mjs
```

Autentikasi sidik jari/wajah nyata masih perlu diverifikasi pada perangkat dengan biometrik terdaftar. Jadwal notifikasi telah diperiksa; waktu pengiriman tetap mengikuti kebijakan Android. Pemulihan terenkripsi diuji melalui browser dan unit test; pemeriksaan dialog file native mencakup pembukaan serta pembatalan.

SHA-256 APK:

```text
54FC36CC76861BB915CB33F9363581AC7B80F2E64BA67E2B6088FE4CB53D3D37
```

## Release dengan R8 — 24 Oktober 2026

- APK universal sebelum optimasi: 14.597.364 byte; sesudah optimasi: 9.977.146 byte (sekitar 32% lebih kecil). Semua ABI library native tetap disertakan.
- Build APK/AAB release, lint Android, dan verifikasi tanda tangan APK: lulus. Build memakai kunci release, R8, serta resource shrinking.
- Emulator API 37 dengan AVD uji terpisah: startup, onboarding, penulisan SQLite, saldo setelah restart proses, pemasangan update APK tanpa kehilangan data, penyimpanan PIN lewat Keystore, cold start terkunci, dan buka dengan PIN benar: lulus.
- Dialog ekspor file native dan callback pembatalan: lulus. Pengingat mingguan menghasilkan alarm native; waktu pengiriman notifikasi belum diuji.
- Bridge Capacitor dan implementasi pengingat dipertahankan dalam aturan R8 setelah pengujian menemukan panggilan pengingat yang tidak selesai pada konfigurasi awal.
