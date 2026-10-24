# Think Twice

Aplikasi keuangan pribadi Android offline: catat pemasukan, atur kantong, dan beri keinginan jeda 24 jam sebelum membeli. Android 7.0+.

**Instal:** buka [Releases](https://github.com/andika0x10/think-twice/releases), unduh `think-twice-vX.Y.Z.apk`, lalu izinkan instalasi dari sumber tersebut di Android. Gunakan APK dari release berikutnya untuk update; simpan backup data secara berkala.

## Pengembangan

Node.js 22.12+ dan npm.

```sh
npm ci
npm run dev
npm run check
```

Build Android di Windows membutuhkan JDK 21 dan Android SDK 36:

```sh
npm run android:build
```

APK debug: `artifacts/think-twice-debug.apk`. Untuk tes browser: `npx playwright install chrome`, lalu `npm run test:e2e`.

## Distribusi

- **CI:** setiap push/PR menjalankan pemeriksaan, tes browser, dan build Android. APK debug tersedia di **Actions → CI → Artifacts**.
- **Release:** push tag `vX.Y.Z` yang sesuai versi `package.json` untuk menerbitkan APK signed, AAB, checksum, dan catatan perubahan otomatis.
- Setup signing sekali di GitHub Secrets: [panduan release](docs/RELEASING.md).

[Aturan aplikasi, backup, dan keamanan](docs/APP.md) · [Hasil validasi](VALIDATION.md)
