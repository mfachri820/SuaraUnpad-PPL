<img width="1920" height="1080" alt="Unpad" src="https://github.com/user-attachments/assets/7f08addb-9ec7-4ba8-b167-424f15bc76ec" />

# 🌆 Platform Partisipasi Publik – SDG 11

## 📌 Pendahuluan

Platform ini dibangun untuk mendukung partisipasi publik dalam pembangunan kota yang inklusif dan berkelanjutan, sejalan dengan:

- **SDG 11.3**: Meningkatkan urbanisasi yang inklusif dan berkelanjutan melalui sistem pemungutan suara (voting) kebijakan.
- **SDG 11.7**: Menyediakan akses universal ke ruang publik yang aman dan inklusif melalui pelaporan kerusakan fasilitas umum.

Aplikasi ini menghubungkan warga dan pihak berwenang dalam satu ekosistem digital yang transparan, real-time, dan akuntabel.

---

# 👥 User Personas

## Persona A – Budi (Warga / Mahasiswa Peduli)
- Ingin melaporkan jalan rusak dengan cepat.
- Tidak ingin melalui birokrasi berbelit.
- Ingin tahu progres perbaikan secara transparan.
- Peduli terhadap kebijakan publik.

## Persona B – Siti (Pejabat Publik / Dosen)
- Membutuhkan data real-time untuk menentukan prioritas anggaran.
- Ingin mendengar aspirasi warga secara transparan.
- Membutuhkan dashboard manajemen laporan yang efisien.

---

# 🗺️ User Journey Map

## 🛠️ Skenario Pelaporan
1. Melihat lampu jalan mati.
2. Membuka aplikasi.
3. Foto & kirim laporan.
4. Menerima notifikasi: *"Sedang Diperbaiki"*.
5. Menerima notifikasi: *"Selesai"*.

## 🗳️ Skenario Voting
1. Menerima push notification kebijakan baru.
2. Membaca ringkasan kebijakan.
3. Melihat diskusi warga.
4. Klik **"Setuju"**.
5. Melihat grafik dukungan meningkat secara real-time.

---

# 🧭 Peta Navigasi (Sitemap)

Aplikasi menggunakan **Bottom Navigation** dengan 4 pilar utama:

1. **Beranda (Home)**  
   Ringkasan aktivitas dan laporan di sekitar pengguna.

2. **Lapor (Report)**  
   Peta interaktif dan formulir pengaduan fasilitas publik.

3. **Kebijakan (Policy)**  
   Modul siaran kebijakan dan voting warga.

4. **Profil (Profile)**  
   Riwayat laporan, status verifikasi, dan pengaturan akun.

# 🎨 Prinsip Desain & UX

### 🎨 Warna
- Kuning SDG 11: `#F99D26` (CTA & elemen aksi) (Selebihnya diserahkan ke tim FE)

### ♿ Aksesibilitas
- Kontras tinggi
- Tombol besar
- Mudah digunakan semua kalangan usia

### 🔔 Feedback Loop
Setiap perubahan status laporan wajib mengirim **push notification** ke pengguna.

# 🎯 Outcome

Platform ini diharapkan mampu:

- Meningkatkan partisipasi warga dalam kebijakan publik.
- Mempercepat respons terhadap kerusakan fasilitas umum.
- Mewujudkan tata kelola kota yang transparan dan berbasis data.
- Mendukung SDG 11 secara konkret melalui teknologi digital.

---

# 🛠️ Dokumentasi Teknis

- [Development lokal (Postgres lokal, seeder, test)](docs/DEVELOPMENT.md)
- [API contract & arahan frontend (moderasi, pengumuman)](docs/API_CONTRACT_FE.md)
- [Setup AWS staging + CI/CD](docs/SETUP_AWS_CICD.md) (lama, sebelum pindah ke platform Unpad)

## Deploy ke platform Unpad (GitLab `git.unpad.dev`)

Deploy memakai pipeline bersama `unpad/devops/pipeline` (Auto DevOps). File terkait:

| File | Isi |
| :--- | :--- |
| `.gitlab-ci.yml` | Template pipeline, URL staging/production, `DB_MIGRATE` (Prisma) |
| `.gitlab/auto-deploy-values.yaml` | Port 3000, ingress, startup probe `/api/health`, resource, `DB_URL` dari `postgresql-creds` |
| `.gitlab/manifests/static.yaml` | Config non-rahasia bersama (endpoint MinIO, `APP_URL`) |
| `.gitlab/manifests/{staging,production}/config.yaml` | Client ID PAuS, redirect URI, bucket & URL publik MinIO, admin |

Secret diisi di **Settings > CI/CD > Variables** (Masked, scope per environment):
`K8S_SECRET_JWT_SECRET`, `K8S_SECRET_PAUS_CLIENT_SECRET`, `K8S_SECRET_AWS_ACCESS_KEY_ID`, `K8S_SECRET_AWS_SECRET_ACCESS_KEY`.

**Login** memakai PAuS (SSO Unpad): tombol *Masuk dengan PAuS* → `/api/auth/paus/redirect` → PAuS →
`/api/auth/paus/callback`. Mahasiswa FMIPA (NPM berawalan `14`) yang baru pertama login langsung dibuatkan akun; program studi
diambil dari 2 digit kode prodi setelah `14` (lihat `lib/fmipa.ts`). Email/NPM di `ADMIN_IDENTIFIERS` otomatis menjadi admin.

**Upload gambar** disimpan di MinIO (S3) lewat `@aws-sdk/client-s3`; URL publik dibentuk dari `AWS_URL`.

**Lokal**: `docker compose up -d db minio minio-init`, salin `.env.example` ke `.env`
(`PASSWORD_LOGIN_ENABLED=true` agar bisa login dengan akun seeder), lalu `npm run db:deploy && npm run db:seed && npm run dev`.
