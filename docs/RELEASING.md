# Release Android

## Setup sekali

Push proyek ke repository GitHub. CI memakai GitHub-hosted runner, Node.js 22, JDK 21, dan Android SDK 36. Workflow release memakai `GITHUB_TOKEN` bawaan; tidak perlu personal access token. Kebijakan organisasi/repository harus mengizinkan workflow menulis contents untuk membuat release.

Buat kunci signing **sekali**, di luar repository, menggunakan `keytool` dari JDK 21. Contoh PowerShell:

```powershell
keytool -genkeypair -v -keystore "$env:USERPROFILE/think-twice-release.jks" -alias think-twice -keyalg RSA -keysize 4096 -validity 10000
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE/think-twice-release.jks")) | Set-Clipboard
```

Isi password saat diminta. Base64 bukan enkripsi; perlakukan isi clipboard sebagai rahasia, lalu bersihkan setelah disimpan ke GitHub Secrets. Jika sudah punya kunci distribusi untuk aplikasi ini, gunakan kunci tersebut.

Tambahkan **Settings → Secrets and variables → Actions → New repository secret**:

| Secret                      | Nilai                                                               |
| --------------------------- | ------------------------------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | Isi clipboard dari perintah di atas                                 |
| `ANDROID_KEYSTORE_PASSWORD` | Password keystore                                                   |
| `ANDROID_KEY_ALIAS`         | `think-twice` atau alias kunci yang dipakai                         |
| `ANDROID_KEY_PASSWORD`      | Password kunci; untuk PKCS12 biasanya sama dengan password keystore |

Simpan keystore dan password di backup aman. Semua release harus memakai kunci yang sama agar Android bisa memperbarui instalasi lama. APK debug CI memakai kunci berbeda: backup data sebelum menghapus instalasi debug dan beralih ke release. Penghapusan aplikasi menghapus data lokal.

## Menerbitkan versi

Naikkan versi `package.json` dan lockfile, commit perubahan, lalu push branch serta tag. Contoh PowerShell untuk rilis pertama:

```powershell
# Untuk versi berikutnya, jalankan npm version patch --no-git-tag-version dahulu.
git add package.json package-lock.json
git commit -m "chore: release 1.0.0" -m "Co-authored-by: GPT-6.1 Sol <noreply@openai.com>"
git push origin HEAD
git tag v1.0.0
git push origin v1.0.0
```

Lewati commit jika versi tersebut sudah di-commit. Tag harus persis `v` + versi `package.json`, berupa `MAJOR.MINOR.PATCH` tanpa prerelease, setiap bagian 0–999 dan minimum `0.0.1`. Android mengambil `versionName` dari `package.json` dan menghitung `versionCode = major × 1.000.000 + minor × 1.000 + patch`; gunakan versi yang selalu meningkat.

Workflow **Release Android** menjalankan format, lint, unit test, build web, tes browser, build APK/AAB signed, dan Android lint sebelum membuat GitHub Release. Berkas yang tersedia:

- `think-twice-vX.Y.Z.apk`: bisa langsung dipasang di Android 7.0+.
- `think-twice-vX.Y.Z.aab`: untuk distribusi melalui Play Console, tidak bisa dipasang langsung.
- `SHA256SUMS.txt`: checksum SHA-256 kedua berkas.

APK diverifikasi dengan `apksigner`; AAB diverifikasi dengan `jarsigner`. Keystore sementara dihapus setelah job selesai. Release memakai catatan perubahan otomatis GitHub.

Jika gagal sebelum publish, perbaiki penyebabnya lalu **Re-run failed jobs**, atau jalankan **Actions → Release Android → Run workflow** dan isi tag yang sudah ada. Pilih branch utama yang memuat workflow ini. Release yang sudah diterbitkan tidak ditimpa otomatis; buat versi baru untuk perubahan berikutnya.

CI di branch/PR tetap berjalan tanpa secrets dan menyimpan APK debug selama 14 hari. Release artifacts di Actions juga disimpan 14 hari; berkas di GitHub Releases tetap tersedia sampai release dihapus. Untuk membagikan unduhan secara publik, repository harus publik atau penerima memiliki akses repository.

Referensi: [GitHub CLI release](https://cli.github.com/manual/gh_release_create), [signing Android](https://developer.android.com/studio/publish/app-signing).
