## First time setup
```bash
npm ci
cp .env.example .env          
npm run db:up                
npm run db:deploy            
npm run db:seed              
npm run dev                   
```

| role | email |
|---|---|
| ADMIN | `admin@unpad.ac.id` |
| LECTURER | `dosen@unpad.ac.id` |
| STUDENT | `budi@mail.unpad.ac.id`, `siti@mail.unpad.ac.id`, `andi@mail.unpad.ac.id` |
| STUDENT (belum verifikasi) | `belumverif@mail.unpad.ac.id` |

## db commands
| command | gunanya |
|---|---|
| `npm run db:up` | nyalakan postgres lokal |
| `npm run db:migrate -- --name <nama>` | buat migrasi baru setelah mengubah `schema.prisma` (**hanya ke DB lokal**) |
| `npm run db:deploy` | terapkan migrasi yang ada (dipakai juga di server) |
| `npm run db:seed` | buat akun contoh (upsert) + konten contoh kalau DB masih kosong |
| `npm run db:reset` | hapus semua data lokal, migrasi ulang, lalu seed |
| `npm run db:studio` | Prisma Studio (lihat isi tabel) |
| `docker compose stop db` | matikan Postgres (data tetap ada di volume `pgdata`) |

Setiap perubahan `schema.prisma` wajib lewat `npm run db:migrate` dan folder migrasinya ikut di-commit. CI menolak PR yang schema-nya tidak sinkron dengan migrasi (drift check).

## Test
```bash
npm run typecheck && npm run lint
npm test                    # unit test (prisma di-mock, tidak butuh DB)
npm run test:integration    # integration test ke Postgres asli (database *_test, dikosongkan tiap file)
```

## Coba image produksi di lokal
```bash
docker compose --profile app up --build   
```
