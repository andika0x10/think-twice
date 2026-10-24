# Think Twice

Aplikasi keuangan pribadi Android offline. Catat pemasukan dan kebutuhan, bagi uang ke kantong, dan beri keinginan jeda 24 jam sebelum membeli.

## Menjalankan proyek

Gunakan Node.js 22.12+ dan npm.

```sh
npm ci
npm run dev
npm run format
npm run check
npm run test:e2e
```

Browser memakai IndexedDB; Android memakai SQLite. Data keduanya terpisah. Font Plus Jakarta Sans dibundel lokal bersama lisensi Fontsource. Pengujian browser memakai Google Chrome yang terpasang; screenshot tersedia di `test-results/`. `npm run check` mencakup format, lint, unit test, TypeScript, dan build web.

## Build Android

Prasyarat: **JDK 21**, Android SDK platform 36, build tools, dan lisensi SDK. Android Studio mungkin membundel Java yang lebih baru; gunakan Java 21 untuk Gradle proyek ini. Minimum Android API 24. Build pertama membutuhkan internet untuk dependency; aplikasi hasil build bekerja offline.

```powershell
$env:JAVA_HOME = 'C:/path/to/jdk-21'
$env:ANDROID_HOME = "$env:LOCALAPPDATA/Android/Sdk"
npm run android:build
```

Script juga mendeteksi JDK 21 di `%LOCALAPPDATA%/ThinkTwice/tools` jika `JAVA_HOME` belum diatur. APK disalin ke `artifacts/think-twice-debug.apk`. Ini APK debug untuk pengujian, belum ditandatangani dengan kunci rilis Play Store.

```sh
npm run android:sync
npx cap open android
```

Setelah perubahan web, build dan sync ulang sebelum menjalankan Android. Konfigurasi SDK lokal, kunci signing, dependency, serta APK tidak masuk Git.

## Aturan pencatatan

- Onboarding membagi saldo awal ke Harian, Keinginan, dan Tabungan. Jumlah alokasi harus sama dengan saldo awal; nol diperbolehkan.
- Saldo tersedia = saldo ledger dikurangi rencana yang dijeda. Transfer tidak mengubah saldo total.
- Keinginan wajib dijeda 24 jam. Kebutuhan boleh langsung dicatat atau dijeda. Dana dijeda menjadi cadangan, tanpa pengeluaran sampai pengguna mengonfirmasi **Beli** setelah waktunya habis.
- Pembatalan melepas cadangan. Konfirmasi hanya boleh sekali. Countdown dihitung dari timestamp tersimpan; aplikasi tidak perlu tetap berjalan. Waktu mengikuti jam perangkat karena aplikasi sepenuhnya offline.
- Transaksi dapat dikoreksi atau dihapus selama saldo tersedia tidak negatif. Mengubah kebutuhan langsung menjadi keinginan memerlukan rencana baru.
- Kantong dengan saldo/cadangan tidak bisa diarsipkan. Satu kantong dapat memiliki satu target; progres memakai saldo tersedia. Estimasi membutuhkan 28 hari riwayat dan pertumbuhan bersih positif.
- Review memakai minggu Senin–Minggu waktu lokal. Saldo awal dan transfer tidak dihitung sebagai pemasukan/pengeluaran.

## Penyimpanan dan backup

Model dan aturan keuangan berada di `src/core`, adapter di `src/data`, dan integrasi platform di `src/platform`. SQLite menyimpan snapshot state berversi dalam satu baris `app_state`, memakai transaksi SQLite untuk mengganti ledger, kantong, serta cadangan sekaligus. Saldo dihitung dari ledger. Versi skema/backup yang tidak dikenal ditolak tanpa menimpa data; migrasi berikutnya harus ditambahkan sebelum menaikkan versi.

Di **Pengaturan → Backup data**, gunakan password minimal 8 karakter dan simpan file `.thinktwice` melalui dialog file Android. Salin file ke lokasi di luar HP secara berkala. Backup memakai AES-256-GCM dan PBKDF2-SHA-256 dengan 600.000 iterasi, salt serta IV acak. Password tidak disimpan dan tidak dapat dipulihkan.

**Pulihkan backup** meminta password dan file. Data serta referensinya diperiksa sebelum konfirmasi penggantian. Password salah atau file rusak tidak mengubah data saat ini. Restore mengganti seluruh data, bukan menggabungkan. Batas ukuran 10 MB. PIN dan kredensial biometrik tidak ikut dipulihkan; atur ulang kunci setelah restore.

Ekspor CSV berisi ledger termasuk saldo awal dan transfer, menggunakan UTF-8 dan escaping formula spreadsheet.

## Kunci dan pengingat

PIN 6 digit opsional, dengan verifier bersalt dalam Android Keystore-backed secure storage. Lima kegagalan memulai jeda percobaan yang meningkat. Biometrik tersedia jika perangkat mendukung dan sudah didaftarkan. Kunci berlaku saat cold start dan setelah 30 detik di latar belakang. Screenshot/preview Android dilindungi dengan `FLAG_SECURE`. Database berada di sandbox aplikasi; kunci mengontrol akses UI, bukan mengenkripsi seluruh database.

Lupa PIN: pilih **Lupa PIN?**, konfirmasi penghapusan data lokal, lalu pulihkan backup. Kunci browser hanya untuk pengembangan dan memakai localStorage; biometrik serta Keystore hanya tersedia di Android.

Pengingat meminta izin saat diaktifkan: akhir jeda dan Minggu pukul 19.00 waktu perangkat. Android dapat menunda notifikasi karena penghematan baterai atau izin alarm; pembelian tetap dibatasi timestamp. Menolak izin tidak menghambat pencatatan. Jadwal dibuat ulang setelah restore; menonaktifkan pengingat membatalkan jadwal.

## Git

Commit per kelompok perubahan yang lolos pemeriksaan menggunakan trailer `Co-authored-by: GPT-6.1 Sol <noreply@openai.com>`. Tidak ada push otomatis. Versi pertama tidak mencakup cloud, akun, bank, transaksi berulang, atau publikasi Play Store.
