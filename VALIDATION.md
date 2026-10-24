# Hasil verifikasi — 24 Oktober 2026

Think Twice 1.0.0, application ID `com.andika.thinktwice`.

## Pemeriksaan otomatis

- Prettier, Oxlint, TypeScript, dan production build: lulus.
- 19 unit test: lulus. Mencakup saldo, transfer, cadangan, batas 24 jam, konfirmasi ganda, validasi referensi, pengarsipan, estimasi tujuan, enkripsi/pemulihan backup, escaping CSV, PIN, penundaan percobaan, dan jadwal notifikasi.
- 5 skenario browser Chrome: lulus. Mencakup onboarding, CRUD transaksi, persistensi, transfer/target, pencarian, PIN, pembelian setelah 24 jam, backup–restore, password salah, ekspor CSV, dan lebar layar 360 px.
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

Script pengujian native memakai emulator dengan data uji baru, bukan perangkat berisi data pribadi:

```sh
node scripts/smoke-android.mjs
```

Autentikasi sidik jari/wajah nyata masih perlu diverifikasi pada perangkat dengan biometrik terdaftar. Jadwal notifikasi telah diperiksa; waktu pengiriman tetap mengikuti kebijakan Android. Pemulihan terenkripsi diuji melalui browser dan unit test; pemeriksaan dialog file native mencakup pembukaan serta pembatalan.

SHA-256 APK:

```text
CDE712C18BDA728D207B57F7E5C0D3F4A6D4DD3E0C5C71AA59467B05C7F82FE5
```
