# Aturan dan penyimpanan

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

Hasil pengujian dan batas verifikasi perangkat tersedia di [VALIDATION.md](../VALIDATION.md).
