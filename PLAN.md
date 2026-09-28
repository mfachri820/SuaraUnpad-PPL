# Rancangan: Rebrand Suara MIPA + Moderasi + Pengumuman

## Context
Aplikasi (Next.js 16 app router + Prisma/Postgres, auth JWT → header `x-user-id`/`x-user-role` dari `middleware.ts`) akan:
1. Di-rebrand dari **SuaraUnpad** ke **Suara MIPA** dan dikunci ke FMIPA.
2. Mendapat alur moderasi: admin bisa **menutup (close) postingan** dengan alasan wajib yang tampil di postingan, dan user bisa **melaporkan komentar/postingan** yang lalu ditinjau admin.
3. Mendapat fitur **pengumuman** dari admin.

Temuan penting dari eksplorasi:
- **Belum ada sistem lapor konten.** Model `Report` (`prisma/schema.prisma:135`) adalah laporan *kerusakan fasilitas* (POTHOLE/CRACK/SAMPAH). Sistem baru diberi nama **`ContentFlag`** supaya tidak tertukar.
- Admin sudah bisa soft-delete komentar lewat API (`services/commentService.ts:206`), tapi tombolnya hanya tampil untuk author (`CommentSection.tsx:169`).
- `/api/admin/*` sudah dijaga khusus ADMIN di `middleware.ts:117`, jadi semua endpoint moderasi ditaruh di sana.
- `Policy` = wacana yang di-voting AGREE/DISAGREE, sehingga **tidak cocok** untuk pengumuman. Keputusan: pengumuman = `Post` dengan `kind = ANNOUNCEMENT`.
- Bug: feed/detail hanya membaca `studentProfile.fullName`, sehingga post admin/dosen tampil sebagai "Anonim" (`HomeFeed.tsx:549`, `aspirasi/[id]/page.tsx:133`).

---

## 1. Rebrand → Suara MIPA (nama + kunci FMIPA)

**Teks/metadata** (ganti "SuaraUnpad"/"Unpad" → "Suara MIPA"/"MIPA"):
- `app/layout.tsx` (title, description), halaman `app/(auth)/{login,register,complete-profile,verify-notice}/page.tsx`
- `components/ui/Navbar.tsx:63-64` (span "Suara" + "MIPA"), `components/ui/Footer.tsx` (tagline, copyright)
- `components/features/auth/{LoginForm,RegisterForm,CompleteProfileForm}.tsx`, `app/(main)/profil/page.tsx:252` ("Mahasiswa MIPA")
- `services/authService.ts:95-101` (sender, subject, dan isi email verifikasi), `prisma/seed.ts` (nama admin/dosen)
- **Tidak diubah:** package name, docker/GHCR/CI (`deploy.yml`), folder Cloudinary `suara_unpad/` (supaya deploy dan gambar lama tidak rusak), label "Email Unpad" dan domain `@unpad.ac.id` (FMIPA tetap bagian dari Unpad), serta email kontak dan link sosmed di footer (dibiarkan sampai ada kontak resmi FMIPA).

**Kunci FMIPA:**
- File baru `lib/fmipa.ts`: `export const FMIPA_FACULTY = "FMIPA"` dan `export const FMIPA_MAJORS = [...]` (Matematika, Statistika, Aktuaria, Fisika, Geofisika, Kimia, Biologi, Teknik Informatika, Teknik Elektro; **daftar prodi perlu dicek ulang**).
- File baru `components/ui/AuthSelect.tsx` dengan styling sama seperti `AuthInput`, menerima `options` dan `register`.
- Di `RegisterForm`, `CompleteProfileForm`, dan `profil/page.tsx`: field Fakultas diganti teks read-only "FMIPA", dan Program Studi diganti `AuthSelect` berisi `FMIPA_MAJORS`.
- Server (`authService.register` dan `updateProfile`): nilai `faculty` selalu dipaksa `FMIPA_FACULTY`, dan untuk STUDENT `major` harus ada di `FMIPA_MAJORS` (kalau tidak, throw `'Program studi tidak valid'` → 400). Data user lama tidak dimigrasi.

---

## 2. Perubahan Schema (satu migrasi: `moderation_and_announcement`)

```prisma
enum PostKind   { ASPIRASI ANNOUNCEMENT }
enum FlagReason { SPAM UJARAN_KEBENCIAN PELECEHAN HOAKS TIDAK_RELEVAN LAINNYA }
enum FlagStatus { PENDING ACTIONED DISMISSED }
// NotificationType += POST_CLOSED, CONTENT_REMOVED, NEW_ANNOUNCEMENT

model Post {
  // ...field lama
  kind         PostKind  @default(ASPIRASI)
  pinnedUntil  DateTime? @map("pinned_until")        // hanya untuk ANNOUNCEMENT
  closedAt     DateTime? @map("closed_at")
  closedReason String?   @map("closed_reason") @db.Text
  closedById   String?   @map("closed_by_id") @db.Uuid
  author   User  @relation("PostAuthor", ...)          // relasi lama WAJIB diberi nama
  closedBy User? @relation("PostClosedBy", fields: [closedById], references: [id], onDelete: SetNull)
  flags    ContentFlag[]
}

model ContentFlag {
  id           String     @id @default(uuid()) @db.Uuid
  reporterId   String     @map("reporter_id") @db.Uuid
  postId       String?    @map("post_id") @db.Uuid      // tepat satu dari postId/commentId terisi
  commentId    String?    @map("comment_id") @db.Uuid
  reason       FlagReason
  note         String?    @db.Text
  status       FlagStatus @default(PENDING)
  reviewedById String?    @map("reviewed_by_id") @db.Uuid
  reviewedAt   DateTime?  @map("reviewed_at")
  createdAt    DateTime   @default(now()) @map("created_at")
  reporter   User     @relation("FlagReporter", ..., onDelete: Cascade)
  reviewedBy User?    @relation("FlagReviewer", ..., onDelete: SetNull)
  post       Post?    @relation(..., onDelete: Cascade)
  comment    Comment? @relation(..., onDelete: Cascade)
  @@unique([reporterId, postId])      // NULL di Postgres dianggap distinct, jadi aman
  @@unique([reporterId, commentId])
  @@index([status])
  @@map("content_flags")
}
```
Relasi balik juga ditambahkan: `User.posts @relation("PostAuthor")`, `User.closedPosts`, `User.flagsReported`, `User.flagsReviewed`, dan `Comment.flags`.

---

## 3. Close Postingan (admin, alasan wajib)

**Aturan:** postingan yang ditutup **tetap terlihat** tapi menjadi **read-only**: tidak bisa dikomentari/dibalas, di-upvote, atau diedit author. Banner alasan ditampilkan di atas konten. Admin bisa membuka kembali.

**Service baru `services/moderationService.ts`:**
- `closePost(postId, adminId, reason)`: reason di-trim dengan panjang 10–500 karakter; throw kalau post sudah ditutup. Set `closedAt/closedReason/closedById`, ubah flag PENDING pada post itu menjadi `ACTIONED` (`reviewedById/At`), lalu kirim notif `POST_CLOSED` ke author (kalau author ≠ admin). Semua dijalankan dalam `prisma.$transaction`.
- `reopenPost(postId)`: kosongkan ketiga field close.

**Penegakan di server (bukan hanya disembunyikan di UI):**
- `commentService.createComment`: kalau `postId` mengarah ke post yang `closedAt` terisi, throw `'Akses ditolak. Postingan ini sudah ditutup.'`. Di `app/api/comments/route.ts`, pesan `'Akses ditolak'` dipetakan ke 403.
- `postService.toggleUpvote` dan `updatePost`: tolak dengan pesan yang sama kalau post ditutup.
- `getPosts`/`getPostById`: include `closedBy: { select: { adminProfile: { select: { fullName } } } }` dan `role` pada author.

**API:** `POST /api/admin/posts/[id]/close` dengan body `{ reason }`, dan `DELETE` di route yang sama untuk membuka kembali.

**UI:**
- `app/(main)/aspirasi/[id]/page.tsx`: ikon `FiMoreHorizontal` (sekarang hanya dekorasi) dijadikan menu. Untuk admin: "Tutup postingan" (membuka `ClosePostModal` dengan textarea alasan wajib dan counter) atau "Buka kembali". Untuk user lain: "Laporkan". Kalau post ditutup, tampilkan banner 🔒 *"Ditutup oleh Admin · {tanggal}"* + *"Alasan: …"*, dan tombol upvote dinonaktifkan.
- `CommentSection`: prop baru `readOnly`. Kalau aktif, input komentar, tombol balas, dan tombol edit disembunyikan, diganti teks "Diskusi ditutup".
- `HomeFeed`: badge "DITUTUP" pada kartu post, dan upvote dinonaktifkan.

---

## 4. Lapor Komentar & Postingan (ContentFlag)

**Alur user:**
1. Tombol "Laporkan" di komentar (bukan milik sendiri dan belum dihapus) dan di menu post, membuka `ReportContentModal` (pilihan alasan `FlagReason` + catatan opsional maks. 300 karakter).
2. `POST /api/flags` dengan body `{ postId | commentId, reason, note }`. Validasi: tepat satu target; target harus ada; tidak boleh melaporkan konten sendiri (400); laporan dobel dari user yang sama (P2002) → 409 *"Kamu sudah melaporkan konten ini"*.
3. Toast *"Laporan terkirim, akan ditinjau admin."* Identitas pelapor **tidak pernah** diperlihatkan ke author konten.

**Alur admin (antrean moderasi):**
- `GET /api/admin/flags?type=comment|post`: daftar konten yang punya flag PENDING, **dikelompokkan per konten** (cuplikan isi, author, link ke post, jumlah laporan, rincian alasan, catatan), diurutkan dari laporan terbanyak. Query: `prisma.comment.findMany({ where: { flags: { some: { status: 'PENDING' } } }, include: { flags: { where: { status: 'PENDING' } }, author, post } })`, begitu juga untuk post.
- Aksi untuk **komentar**: `POST /api/admin/comments/[id]/remove` → `moderationService.removeComment`, yang memakai soft delete yang sudah ada (placeholder `"[Komentar ini telah dihapus]"` dan sekarang juga mengisi `deletedAt`), mengubah flag menjadi `ACTIONED`, dan mengirim notif `CONTENT_REMOVED` ke author.
- Aksi untuk **postingan**: *Tutup* memakai `closePost` di atas (flag otomatis `ACTIONED`).
- Aksi *Abaikan* untuk keduanya: `POST /api/admin/flags/dismiss` dengan body `{ postId | commentId }` → flag PENDING menjadi `DISMISSED`.
- Admin juga bisa bertindak langsung tanpa menunggu laporan: di `CommentSection`, admin melihat tombol "Hapus (admin)" yang memanggil endpoint remove di atas, sehingga notifikasi dan pembersihan flag tetap konsisten.

**UI admin:** komponen baru `components/features/admin/ModerationQueue.tsx` dengan tab "Komentar" dan "Postingan", dipasang di `app/(main)/admin/page.tsx`, ditambah kartu statistik "Laporan konten menunggu". Halaman admin (566 baris) tidak ditambah logika langsung; semuanya lewat komponen.

---

## 5. Pengumuman (Post `kind = ANNOUNCEMENT`)

| | Admin memposting aspirasi | Admin membuat pengumuman |
|---|---|---|
| Tujuan | Ikut berdiskusi sebagai warga | Informasi resmi satu arah |
| Siapa | Semua role | Hanya ADMIN (dicek di server) |
| Posisi di feed | Kronologis | Di-pin di atas feed sampai `pinnedUntil`, lalu masuk tab Pengumuman |
| Tampilan | Kartu biasa + badge "Admin" | Kartu khusus biru "PENGUMUMAN", judul ditampilkan |
| Upvote | Ya | Tidak |
| Komentar | Ya | Ya (untuk tanya jawab), bisa ditutup |
| Notifikasi | Tidak | `NEW_ANNOUNCEMENT` ke semua user terverifikasi |

**Backend (`postService` + `app/api/posts/route.ts`):**
- `CreatePostPayload` ditambah `kind?` dan `pinDays?` (1/3/7/30). Route meneruskan `x-user-role`. Kalau `kind=ANNOUNCEMENT` dan role ≠ ADMIN, throw `'Akses ditolak…'` → 403. Pengumuman wajib punya judul asli (bukan judul otomatis dari 5 kata pertama). `pinnedUntil = now + pinDays`.
- Setelah pengumuman dibuat, kirim notif lewat `prisma.notification.createMany` untuk semua user `isVerified` kecuali author, dengan pola try/catch seperti `commentService.createComment`.
- `GetPostsFilter` ditambah `kind?` dan `pinned?` (`pinnedUntil > now`), yang dibaca dari query `?kind=&pinned=true`.
- `toggleUpvote` menolak post pengumuman.
- `DELETE /api/admin/posts/[id]/pin` untuk melepas pin lebih awal (`pinnedUntil = null`).

**Frontend:**
- `components/features/admin/AnnouncementForm.tsx` (judul, isi, gambar opsional via `/api/uploads`, durasi pin) dipasang di halaman admin.
- `HomeFeed`: strip "Pengumuman" yang di-pin ditampilkan di bawah carousel donasi (`?kind=ANNOUNCEMENT&pinned=true`). Tab baru **PENGUMUMAN**. Tab Aspirasi memakai `kind=ASPIRASI`. Tab Semua tidak menampilkan ulang pengumuman yang sedang di-pin.
- Detail `aspirasi/[id]`: kalau pengumuman, tampilkan header "PENGUMUMAN RESMI" + judul, tanpa upvote.
- Perbaikan nama author: buat helper `getAuthorName` bersama (student → lecturer → admin → email) + badge "Admin" (`author.role === 'ADMIN'`), dipakai di feed dan detail.
- `app/(main)/notif/page.tsx`: tambahkan `POST_CLOSED`, `CONTENT_REMOVED`, `NEW_ANNOUNCEMENT` ke union type dan ke `Record<NotificationType, …>` (wajib, karena kalau tidak TypeScript error).

---

## File

**Baru:** `lib/fmipa.ts`, `components/ui/AuthSelect.tsx`, `services/moderationService.ts`, `app/api/flags/route.ts`, `app/api/admin/flags/route.ts`, `app/api/admin/flags/dismiss/route.ts`, `app/api/admin/posts/[id]/close/route.ts`, `app/api/admin/posts/[id]/pin/route.ts`, `app/api/admin/comments/[id]/remove/route.ts`, `components/features/moderation/{ReportContentModal,ClosePostModal}.tsx`, `components/features/admin/{ModerationQueue,AnnouncementForm}.tsx`, `tests/moderation.test.ts`, `tests/announcement.test.ts`.

**Diubah:** `prisma/schema.prisma`, `prisma/seed.ts`, `services/{postService,commentService,authService}.ts`, `app/api/posts/route.ts`, `app/api/comments/route.ts`, `app/(main)/aspirasi/[id]/page.tsx`, `app/(main)/admin/page.tsx`, `app/(main)/notif/page.tsx`, `components/features/home/HomeFeed.tsx`, `components/features/policies/CommentSection.tsx`, serta file branding di bagian 1.

Pola route handler mengikuti yang sudah ada: baca `x-user-id`/`x-user-role`, panggil service, lalu petakan pesan error ke status (`'tidak ditemukan'`→404, `'Akses ditolak'`→403), dan balas lewat `successResponse`/`errorResponse` dari `lib/apiResponse.ts`. Route admin tetap mengecek ulang `x-user-role === 'ADMIN'` (defense in depth).

## Urutan Pengerjaan
1. Schema + migrasi + `prisma generate`
2. Rebrand + kunci FMIPA
3. Close post (service → API → UI)
4. ContentFlag (lapor → antrean admin → aksi)
5. Pengumuman
6. Tes + perbaikan nama author

## Verifikasi
- `npx prisma migrate dev --name moderation_and_announcement`, lalu `npx tsc --noEmit`, `npm run lint`, `npm test`.
- Tes vitest baru (mock `@/lib/prisma` seperti tes yang sudah ada):
  - close menolak alasan di bawah 10 karakter;
  - komentar/upvote ke post tertutup ditolak (403);
  - laporan dobel → 409;
  - melaporkan diri sendiri → 400;
  - non-admin membuat pengumuman → 403;
  - remove comment mengubah flag menjadi ACTIONED.
- Manual (`npm run dev` + seed admin):
  1. Mahasiswa A membuat aspirasi + komentar, lalu mahasiswa B melaporkan komentar dan post. Antrean admin menampilkan keduanya dengan jumlah laporan.
  2. Admin menghapus komentar → muncul placeholder dan A menerima notif. Admin menutup post dengan alasan → banner tampil, input komentar hilang, `POST /api/comments` langsung ke post itu → 403. Buka kembali → normal lagi.
  3. Admin membuat pengumuman pin 3 hari → muncul di strip atas, tanpa upvote, semua user menerima notif. Mahasiswa mencoba `POST /api/posts` dengan `kind=ANNOUNCEMENT` → 403.
  4. Register memakai dropdown prodi FMIPA. Kirim `major` yang tidak valid via API → 400, dan `faculty` tersimpan "FMIPA".
  5. `grep -ri unpad app components` hanya menyisakan email, domain, dan folder Cloudinary yang memang sengaja dipertahankan.
