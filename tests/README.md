# Pengujian Suara MIPA

## Struktur

```text
tests/
├── unit/          # Logika, service, dan route API dengan dependensi yang di-mock
├── components/    # Komponen React dalam lingkungan jsdom
├── integration/   # Route API dan Prisma dengan database PostgreSQL khusus test
│   ├── globalSetup.ts
│   ├── helpers.ts
│   └── *.int.test.ts
├── e2e/
│   ├── specs/         # Alur pengumuman, moderasi, dan pemeriksaan akses HTTP
│   ├── support/       # Akun fixture, server QA, dan helper screenshot
│   └── playwright.config.ts
├── qa/                # Runner Sprint 4, database test, dan renderer bukti hasil
├── results/sprint-4/   # Output otomatis; diabaikan Git
└── README.md
```

## Tech stack

| Teknologi | Pemakaian |
| --- | --- |
| Vitest | Menjalankan test, assertion (`expect`), hook, spy, dan mock (`vi`) |
| TypeScript | Bahasa test `.test.ts` dan `.test.tsx` |
| Node.js | Lingkungan default untuk test logika, service, dan route API |
| jsdom + React DOM | Render komponen dan simulasi interaksi DOM pada test navigasi |
| Prisma + PostgreSQL | Akses database nyata pada integration test |
| dotenv | Membaca konfigurasi environment untuk integration test |
| Playwright Test + Microsoft Edge | Alur browser nyata, pemeriksaan HTTP, screenshot, dan laporan HTML |

Test komponen saat ini memakai React DOM langsung; belum memakai React Testing Library. Suite E2E Sprint 4 tersedia di `e2e/specs/`.

## Menjalankan test

Jalankan perintah dari root proyek dengan Node.js 24 dan dependensi terpasang.

| Perintah | Cakupan |
| --- | --- |
| `npm test` | Seluruh unit dan component test; integration test dikecualikan |
| `npm run test:watch` | Unit dan component test dalam mode watch |
| `npm test -- tests/unit` | Unit test saja |
| `npm test -- tests/components` | Component test saja |
| `npm test -- tests/unit/fmipa-lock.test.ts` | Satu file tertentu |
| `npm run test:integration` | Integration test dengan database khusus test |
| `npm run test:integration:sprint4` | Integration test pengumuman/moderasi dan bukti hasil |
| `npm run test:e2e` | Build aplikasi, E2E/HTTP Playwright, dan bukti hasil |
| `npm run test:qa:sprint4` | Seluruh QA otomatis Sprint 4 dan screenshot hasil |

### QA Sprint 4 dan file untuk laporan

Gunakan Node.js 24 dan Microsoft Edge. Untuk memakai Node 24 sementara tanpa mengganti instalasi global:

```bash
npm exec --yes --package=node@24 -- node tests/qa/run.cjs
```

Runner menyiapkan database lokal khusus test, menerapkan migrasi, menjalankan Vitest, membuat production build, lalu menjalankan server QA terpisah di `127.0.0.1:3100`. Server development di port 3000 tidak dipakai untuk E2E. Port 3100 harus tersedia.

`TEST_DATABASE_URL` dapat mengatur koneksi database test. Nama database harus berakhiran `_test`, `_e2e`, atau `_qa`, berada di localhost, dan berbeda dari database development. Default-nya `suara_mipa_test` memakai host/kredensial lokal dari `.env`. Runner dan fixture mengosongkan database khusus test tersebut.

```text
results/sprint-4/
├── index.html                     # Indeks bukti yang bisa dibuka di browser
├── run.json                       # Commit, versi runtime, scope, dan waktu eksekusi
├── summary.json                    # Hitungan aktual hasil test
├── vitest-integration/
│   ├── summary.png                # Ringkasan hasil untuk disalin ke laporan
│   ├── console-summary.png        # Cuplikan log console asli dalam bentuk gambar
│   ├── cases-*.png                # Detail kasus, dibagi agar tetap terbaca
│   ├── results.json / junit.xml
│   ├── test-cases.csv
│   └── console.log
└── playwright/
    ├── summary.png / cases-*.png
    ├── screenshots/               # Bukti tampilan aplikasi per langkah
    ├── report/index.html          # Laporan HTML resmi Playwright
    ├── artifacts/                 # Trace dan screenshot ketika gagal
    ├── results.json / junit.xml
    ├── test-cases.csv
    ├── fixtures.json              # Identitas akun test, tanpa token/password
    ├── build.log
    └── console.log
```

Gambar ringkasan dibuat dari JSON hasil runner yang sebenarnya. Status gagal/skipped tetap ditampilkan; screenshot UI sendiri bukan bukti bahwa seluruh test lulus. Output pada path yang sama diperbarui saat rerun.

Scope mengikuti REQ-03 dan REQ-04 pada laporan FGD. Acuan teknis sementara: pengumuman boleh dikomentari dan moderasi dilakukan setelah publikasi, sesuai implementasi saat ini. AI, SSO Unpad, dan deployment DPSI tidak divalidasi oleh suite ini. Login akun test melewati endpoint aplikasi; API fitur dan database pada alur utama tidak di-mock. Widget login Google/pembayaran pihak ketiga diblokir karena di luar scope.

Keberhasilan upload ke Cloudinary tidak diklaim sebagai cakupan E2E. Test HTTP menguji penolakan file tidak valid/terlalu besar; integration test menguji URL gambar. Akun/kredensial Cloudinary nyata tidak dipakai untuk mengunggah file.

### Integration test

- Pastikan PostgreSQL aktif dan database khusus test sudah tersedia.
- Konfigurasi menggunakan `TEST_DATABASE_URL`; jika kosong, database default-nya `suara_mipa_test` di `localhost:5432`.
- Gunakan database khusus test yang berbeda dari database pengembangan dan produksi. Setup menjalankan migrasi, dan helper test mengosongkan tabel saat penyiapan dan pembersihan suite.
- Test dijalankan berurutan untuk menghindari bentrok data antarfile.
- Test memanggil handler API secara langsung; tidak perlu menjalankan server Next.js.

## Cakupan dan batas hasil

- Unit: hashing password, pembatasan FMIPA, profil/proxy, validasi HTTP, komentar, moderasi, voting, pembayaran/webhook, upload, laporan AI, dan health check.
- Komponen: kontrol navigasi mobile dan logout.
- Integrasi: moderasi, pengumuman, serta perbaikan inti komentar, notifikasi, user, health check, dan webhook.
- Test performa, concurrent voting, dan laporan AI pada `unit/` menggunakan mock. Hasilnya tidak mengukur kapasitas database, latensi layanan eksternal, atau akurasi model AI nyata.
- QA manual tetap diperlukan untuk memeriksa tampilan, alur lengkap pengguna, serta layanan eksternal.

## Menambahkan test

- Tempatkan test terisolasi di `unit/`, test render React di `components/`, dan test database nyata di `integration/`.
- Gunakan nama `*.test.ts` / `*.test.tsx`; untuk integrasi gunakan `*.int.test.ts`.
- Gunakan alias `@/` untuk import kode aplikasi agar tidak bergantung pada kedalaman folder test.
- Untuk component test, cantumkan `/** @vitest-environment jsdom */` di awal file.
- Manfaatkan `integration/helpers.ts` untuk request, user, dan reset database pada integration test.
