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

Test komponen saat ini memakai React DOM langsung; belum memakai React Testing Library. Tidak ada suite E2E browser yang tersimpan di folder ini.

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
