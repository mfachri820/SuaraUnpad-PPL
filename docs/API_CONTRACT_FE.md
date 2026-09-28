# API Contract & Arahan Frontend: Moderasi, Pengumuman, dan Perubahan Backend

> Untuk tim frontend. Backend untuk semua endpoint di dokumen ini **sudah jadi dan sudah dites**:
> unit test, integration test ke Postgres asli, dan smoke test HTTP lewat image produksi.
> Contoh response di bawah diambil langsung dari database hasil seeder (`npm run db:seed`).
> Rancangan fitur: `PLAN.md` §2–§5. Cara menjalankan backend lokal: `docs/DEVELOPMENT.md`.

**Daftar isi**
1. [Konvensi umum](#1-konvensi-umum)
2. [Perubahan yang berdampak ke FE yang sudah ada](#2-perubahan-yang-berdampak-ke-fe-yang-sudah-ada) ← **baca dulu**
3. [Endpoint Postingan & Pengumuman](#3-postingan--pengumuman)
4. [Endpoint Komentar](#4-komentar)
5. [Endpoint Lapor Konten (user)](#5-lapor-konten-user)
6. [Endpoint Moderasi (admin)](#6-moderasi-admin)
7. [Notifikasi](#7-notifikasi)
8. [Upload gambar](#8-upload-gambar)
9. [Tipe TypeScript siap pakai](#9-tipe-typescript-siap-pakai)
10. [Checklist pekerjaan FE](#10-checklist-pekerjaan-fe)
11. [Akun untuk testing](#11-akun-untuk-testing)

---

## 1. Konvensi umum

### Auth
Tidak berubah: header `Authorization: Bearer <token>`, token diambil dari cookie `token` (auth nanti diganti SSO kampus). Semua `/api/*` wajib token **kecuali**: `/api/auth/login`, `/api/auth/register`, `/api/auth/verify`, `/api/auth/google`, `/api/webhooks/midtrans`, `/api/health`. Semua `/api/admin/*` hanya untuk role `ADMIN`; role lain mendapat 403.

### Envelope response
```jsonc
// sukses
{ "status": "success", "message": "…", "data": { … } }

// list berpaginasi: data.data = array, data.meta = info halaman
{ "status": "success", "message": "…", "data": { "data": [ … ], "meta": { "currentPage": 1, "itemsPerPage": 10, "totalItems": 23, "totalPages": 3 } } }

// error
{ "status": "error", "message": "Pesan untuk ditampilkan ke user", "code": "POST_CLOSED" }

// error validasi (400)
{ "status": "error", "message": "Judul pengumuman wajib diisi (minimal 5 karakter).", "code": "VALIDATION_ERROR",
  "errors": [ { "path": "title", "message": "Judul pengumuman wajib diisi (minimal 5 karakter)." } ] }
```
Aturan: **selalu tampilkan `message` ke user** (sudah bahasa Indonesia). Pakai `code` kalau perlu logika khusus. Jangan mencocokkan isi teks pesan.

### Status & `code` yang perlu ditangani

| HTTP | `code` | Arti / tindakan FE |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input tidak valid. `errors[]` berisi detail per field, tampilkan di form |
| 400 | *(tanpa code)* | Aturan bisnis ditolak (mis. lapor konten sendiri, upvote pengumuman) |
| 401 | `UNAUTHORIZED` / *(dari proxy)* | Token tidak ada atau kedaluwarsa. Arahkan ke `/login` |
| 403 | `POST_CLOSED` | Postingan sudah ditutup admin. Nonaktifkan aksi diskusi |
| 403 | `FORBIDDEN` | Tidak berhak (bukan pemilik atau bukan admin) |
| 404 | `NOT_FOUND` | Data tidak ada (termasuk ID yang bukan UUID) |
| 409 | `DUPLICATE_FLAG` | User sudah pernah melaporkan konten ini |
| 409 | `POST_ALREADY_CLOSED` / `POST_NOT_CLOSED` / `POST_NOT_PINNED` | Aksi admin tidak relevan dengan status sekarang. Muat ulang data |
| 500 | *(tanpa code)* | Pesan selalu generik "Terjadi kesalahan pada server." (detail hanya ada di log server) |

### Paginasi & batas input
- `page` ≥ 1, `limit` 1–**50** (default 10). Nilai di luar batas menghasilkan 400, bukan data kosong.
- Judul postingan maksimal 150 karakter, isi postingan maksimal 5000, isi komentar maksimal 1000, catatan laporan maksimal 300, alasan tutup postingan 10–500 karakter.
- ID di URL/query harus UUID. ID yang bukan UUID langsung dijawab 404 (path) atau 400 (query).

### Objek `author` (dipakai di post, komentar, antrean moderasi)
```json
{
  "id": "2f8c…",
  "role": "STUDENT",            // STUDENT | LECTURER | ADMIN  -> pakai untuk badge "Admin"
  "avatarUrl": null,
  "studentProfile": { "fullName": "Andi Pratama" },
  "lecturerProfile": null,
  "adminProfile": null,
  "displayName": "Andi Pratama" // BARU: nama siap tampil (student -> lecturer -> admin)
}
```
Pakai **`author.displayName`**. Ini sekaligus memperbaiki bug nama "Anonim" untuk post/komentar admin dan dosen (`HomeFeed.tsx:549`, `aspirasi/[id]/page.tsx:133`). `author.email` **tidak lagi dikirim** di post dan komentar.

---

## 2. Perubahan yang berdampak ke FE yang sudah ada

Tidak ada endpoint lama yang dihapus, dan FE yang sekarang **tetap jalan**. Poin-poin berikut perlu diperhatikan atau dimanfaatkan:

| # | Perubahan | Dampak ke FE sekarang | Yang perlu dilakukan |
|---|---|---|---|
| 1 | `GET /api/posts` default mengembalikan **aspirasi + pengumuman** | Pengumuman tampil seperti aspirasi biasa di feed, dan tombol upvote-nya menghasilkan 400 | Feed pakai `?excludePinned=true`, render `kind === 'ANNOUNCEMENT'` sebagai kartu pengumuman tanpa upvote (§3) |
| 2 | Post punya field `hasUpvoted`, `isClosed`, `isPinned`, `kind`, `imageUrl`, `closedReason`, `closedBy` | - | Pakai `hasUpvoted` untuk mewarnai tombol upvote (sebelumnya FE tidak tahu status upvote post) |
| 3 | Gambar post sekarang **field `imageUrl`** | Markdown `![image](url)` di `content` masih tersimpan dan tampil apa adanya | Kirim `imageUrl` di `POST /api/posts` dan berhenti menyisipkan markdown (`HomeFeed.tsx:213`). Tampilkan `post.imageUrl`. Parser regex boleh dipertahankan untuk data lama |
| 4 | Komentar: `commentUpvotes[]` (daftar semua upvoter) **dihapus** dan diganti `hasUpvoted` | `CommentSection` sudah mendukung `hasUpvoted`, jadi aman | Hapus fallback `commentUpvotes?.some(...)` di `CommentSection.tsx:57,345` |
| 5 | Komentar punya `isDeleted: boolean`. Konten komentar terhapus sudah disamarkan server menjadi `"[Komentar ini telah dihapus]"` | Perbandingan string yang sekarang masih jalan | Ganti `comment.content === "[Komentar…]"` menjadi `comment.isDeleted` (`CommentSection.tsx:52`) |
| 6 | Balas ke **balasan** ditolak 400 | UI sudah membatasi 1 level | - |
| 7 | Komentar, balasan, edit komentar, upvote post/komentar, dan edit post pada postingan tertutup → **403 `POST_CLOSED`** | Toast error muncul kalau user mencoba | Sembunyikan/nonaktifkan aksi-aksi itu kalau `post.isClosed` (§4) |
| 8 | Author **tidak bisa menghapus** postingan yang sudah ditutup admin (403 `POST_CLOSED`) | - | Sembunyikan tombol hapus untuk non-admin kalau `isClosed` |
| 9 | `PATCH /api/notifications/:id/read` sekarang **benar-benar menandai 1 notif** (dulu semua) | Perilaku FE jadi benar tanpa perubahan | - |
| 10 | Tipe notifikasi baru: `POST_CLOSED`, `CONTENT_REMOVED`, `NEW_ANNOUNCEMENT` | `notif/page.tsx` jatuh ke fallback "Pemberitahuan" | Tambahkan ke union type + `Record` (§7) |
| 11 | Upload: `folder` wajib salah satu dari allowlist | Kiriman yang ada (`avatars`, `campaigns`, tanpa folder) tetap valid | Kirim `posts` / `announcements` / `reports` sesuai konteks (§8) |
| 12 | `GET /api/users/:id` hanya untuk diri sendiri atau admin | Tidak dipakai FE | - |
| 13 | Input tidak valid sekarang dijawab **400 + `errors[]`**, bukan 500 | Pesan error jadi lebih jelas | Tampilkan `errors[i].message` di form (opsional) |
| 14 | `GET /api/health` publik: `{ status, database, version }` | - | Bisa dipakai untuk halaman status/footer versi (opsional) |

Endpoint auth, laporan fasilitas (`/api/reports`), kebijakan (`/api/policies`), donasi, dan kategori **tidak berubah**.

---

## 3. Postingan & Pengumuman

Pengumuman = `Post` dengan `kind: "ANNOUNCEMENT"`. Hanya admin yang bisa membuatnya. Pengumuman bisa di-pin di atas feed sampai `pinnedUntil`, dan tidak bisa di-upvote.

### `GET /api/posts`
| Query | Tipe | Keterangan |
|---|---|---|
| `page`, `limit` | number | default 1 / 10, `limit` maksimal 50 |
| `kind` | `ASPIRASI` \| `ANNOUNCEMENT` | filter jenis |
| `pinned` | `true` | hanya pengumuman yang **sedang** di-pin (untuk strip atas) |
| `excludePinned` | `true` | semua postingan **kecuali** pengumuman yang sedang di-pin (untuk tab "Semua", supaya tidak dobel) |
| `authorId`, `policyId` | uuid | filter pemilik / kebijakan terkait |

Pemakaian yang disarankan:

| Tempat | Query |
|---|---|
| Strip pengumuman di bawah carousel donasi | `/api/posts?kind=ANNOUNCEMENT&pinned=true` |
| Tab **Semua** | `/api/posts?excludePinned=true` |
| Tab **Aspirasi** | `/api/posts?kind=ASPIRASI` |
| Tab **Pengumuman** (baru) | `/api/posts?kind=ANNOUNCEMENT` |

Contoh item (dari seeder):
```json
{
  "id": "81787575-d3b1-49cf-b956-442d3765a1ea",
  "authorId": "81a617fc-…",
  "policyId": null,
  "kind": "ANNOUNCEMENT",
  "title": "Pemeliharaan Jaringan Kampus Sabtu Ini",
  "content": "Akan ada pemeliharaan jaringan internet …",
  "imageUrl": "https://res.cloudinary.com/demo/image/upload/samples/landscapes/architecture-signs.jpg",
  "pinnedUntil": "2026-10-05T17:33:45.664Z",
  "closedAt": null,
  "closedReason": null,
  "closedById": null,
  "createdAt": "2026-09-28T15:33:45.664Z",
  "updatedAt": "2026-09-28T17:33:45.682Z",
  "author": { "id": "81a6…", "role": "ADMIN", "displayName": "Admin Suara MIPA", "avatarUrl": null, "studentProfile": null, "lecturerProfile": null, "adminProfile": { "fullName": "Admin Suara MIPA" } },
  "closedBy": null,
  "policy": null,
  "_count": { "postUpvotes": 0, "comments": 1 },
  "isClosed": false,
  "isPinned": true,
  "hasUpvoted": false
}
```

### `GET /api/posts/:id`
Bentuknya sama dengan item di atas. Contoh postingan yang **ditutup**:
```json
{
  "kind": "ASPIRASI",
  "title": "Jual beli akun game murah",
  "isClosed": true,
  "closedAt": "2026-09-24T21:33:45.268Z",
  "closedReason": "Postingan ini tidak berkaitan dengan aspirasi kampus dan termasuk promosi/spam.",
  "closedBy": { "id": "81a6…", "role": "ADMIN", "displayName": "Admin Suara MIPA" }
}
```
Banner yang disarankan: 🔒 **Ditutup oleh {closedBy.displayName} · {tanggal closedAt}** lalu **Alasan: {closedReason}**.

### `POST /api/posts`
```jsonc
// Aspirasi (semua user login). title opsional: kalau kosong, server pakai 5 kata pertama.
{ "content": "WiFi Gedung D sering putus", "imageUrl": "https://res.cloudinary.com/<cloud>/…", "policyId": "<uuid, opsional>" }

// Pengumuman (hanya ADMIN)
{ "kind": "ANNOUNCEMENT", "title": "Pemeliharaan Jaringan", "content": "…", "imageUrl": "…(opsional)", "pinDays": 3 }
```
| Field | Aturan |
|---|---|
| `content` | wajib, kecuali ada `imageUrl` (khusus aspirasi); maksimal 5000 karakter |
| `title` | aspirasi: opsional; pengumuman: **wajib ≥ 5 karakter**; maksimal 150 |
| `imageUrl` | harus URL hasil `/api/uploads` (Cloudinary milik aplikasi), selain itu 400 |
| `pinDays` | hanya untuk pengumuman: `1`, `3`, `7`, atau `30`. Tanpa `pinDays` = tidak di-pin |
| `kind` | `ASPIRASI` (default) atau `ANNOUNCEMENT` |

Response 201: objek post lengkap. Pesannya "Pengumuman berhasil dibuat" atau "Postingan berhasil dibuat".
Error: 403 (non-admin membuat pengumuman), 400 (validasi, atau aspirasi memakai `pinDays`).
Efek samping: semua user terverifikasi (kecuali pembuat) menerima notifikasi `NEW_ANNOUNCEMENT`.

### `PATCH /api/posts/:id` · `DELETE /api/posts/:id` · `POST /api/posts/:id/upvote`
Sama seperti sebelumnya, dengan tambahan aturan:
- PATCH (author saja) → 403 `POST_CLOSED` kalau postingan ditutup.
- DELETE → author atau admin; author mendapat 403 `POST_CLOSED` kalau postingan ditutup.
- Upvote → 400 untuk pengumuman, 403 `POST_CLOSED` kalau ditutup. Response: `{ "action": "upvoted" | "unvoted" }`.

---

## 4. Komentar

### `GET /api/comments?postId=<uuid>` atau `?policyId=<uuid>`
`page`, `limit` (maksimal 50). Mengembalikan komentar utama (terbaru dulu) beserta `replies` (terlama dulu), **maksimal 1 level**.
```json
{
  "id": "f35d52a7-…",
  "authorId": "d729…",
  "postId": "0b0f…",
  "policyId": null,
  "parentId": null,
  "createdAt": "2026-09-25T21:33:45.739Z",
  "content": "Iya bener, di lantai 2 juga sama.",
  "isDeleted": false,
  "author": { "id": "d729…", "role": "STUDENT", "displayName": "Siti Rahmawati", "…": "…" },
  "_count": { "commentUpvotes": 1 },
  "hasUpvoted": true,
  "replies": [
    { "id": "f70f…", "parentId": "f35d52a7-…", "content": "Semoga cepat ditangani ya.", "isDeleted": false,
      "author": { "displayName": "Budi Santoso", "role": "STUDENT" }, "_count": { "commentUpvotes": 0 }, "hasUpvoted": false }
  ]
}
```
Komentar yang dihapus: `isDeleted: true` dan `content: "[Komentar ini telah dihapus]"`. Konten asli tidak pernah dikirim.

### `POST /api/comments`
`{ "content": "…", "postId": "<uuid>" }` atau `{ "content": "…", "policyId": "<uuid>" }` (tepat satu), plus `parentId` opsional untuk membalas.

| Kasus | Status |
|---|---|
| Post ditutup | 403 `POST_CLOSED` |
| Membalas sebuah balasan / parent di diskusi lain / parent sudah dihapus | 400 |
| `postId` dan `policyId` diisi dua-duanya, atau tidak ada | 400 |
| Post/kebijakan tidak ada | 404 |

### `PATCH /api/comments/:id` · `DELETE /api/comments/:id` · `POST /api/comments/:id/upvote`
- PATCH: author saja; 403 kalau komentar dihapus atau post ditutup.
- DELETE: author menghapus komentarnya sendiri. **Admin** yang memanggil DELETE pada komentar orang lain otomatis diproses sebagai moderasi (sama dengan endpoint remove di §6: laporan ditutup dan author mendapat notifikasi).
- Upvote: 400 kalau komentar dihapus, 403 `POST_CLOSED` kalau post ditutup.

---

## 5. Lapor konten (user)

### `POST /api/flags`
```json
{ "commentId": "<uuid>", "reason": "SPAM", "note": "Promosi joki tugas" }
```
atau `{ "postId": "<uuid>", "reason": "HOAKS" }`.

| Field | Nilai |
|---|---|
| `reason` | `SPAM` · `UJARAN_KEBENCIAN` · `PELECEHAN` · `HOAKS` · `TIDAK_RELEVAN` · `LAINNYA` |
| `note` | opsional, maksimal 300 karakter |

Label yang disarankan: Spam · Ujaran kebencian · Pelecehan · Hoaks / informasi palsu · Tidak relevan · Lainnya.

| Response | Arti | Tampilan FE |
|---|---|---|
| 201 | Laporan diterima | toast *"Laporan terkirim, akan ditinjau admin."* |
| 409 `DUPLICATE_FLAG` | Sudah pernah melapor | toast *"Kamu sudah melaporkan konten ini"* (dari `message`) |
| 400 | Konten milik sendiri / komentar sudah dihapus / post sudah ditutup / target tidak valid | tampilkan `message` |
| 404 | Konten tidak ada | tampilkan `message` |

Tombol "Laporkan" **disembunyikan** untuk konten milik sendiri dan komentar yang `isDeleted`. Identitas pelapor tidak pernah terlihat oleh author konten.

---

## 6. Moderasi (admin)

Semua endpoint di bawah hanya untuk ADMIN (403 untuk role lain).

### `GET /api/admin/stats`
```json
{ "totalPosts": 5, "totalAnnouncements": 2, "totalPolicies": 3, "totalReports": 2,
  "pendingFlags": { "posts": 1, "comments": 2, "total": 3 } }
```
Dipakai untuk kartu statistik admin, termasuk kartu **"Laporan konten menunggu" = `pendingFlags.total`**. Endpoint ini menggantikan cara lama yang menghitung dari `/api/posts?limit=1` dan `/api/reports?limit=100`.

### `GET /api/admin/flags?type=comment|post`
Antrean konten yang punya laporan PENDING, **dikelompokkan per konten**, diurutkan dari laporan terbanyak (maksimal 100).
```jsonc
// type=comment
{
  "type": "comment",
  "id": "3b1def96-…",                 // commentId
  "contentSnippet": "Promo joki tugas murah, hubungi 08xx-xxxx-xxxx",
  "isDeleted": false,
  "author": { "displayName": "Andi Pratama", "role": "STUDENT", "…": "…" },
  "postId": "581d4b9e-…",             // link ke /aspirasi/{postId}; null kalau komentar di kebijakan
  "policyId": null,                    // link ke /policies/{policyId}
  "contextTitle": "Parkiran motor penuh",
  "createdAt": "2026-09-27T07:33:45.878Z",
  "flagCount": 3,
  "reasons": { "SPAM": 3 },           // rincian jumlah per alasan
  "notes": [ { "note": "Promosi joki tugas", "createdAt": "…" } ],
  "latestFlagAt": "2026-09-28T17:33:46.120Z"
}
// type=post -> field sama, ditambah "kind", "title", "isClosed" (tanpa isDeleted/policyId/contextTitle)
```

### Aksi
| Aksi | Endpoint | Body | Hasil |
|---|---|---|---|
| Hapus komentar | `POST /api/admin/comments/:id/remove` | - | Soft delete, laporan → ACTIONED, author mendapat notif `CONTENT_REMOVED`. Bisa dipanggil ulang (idempoten) |
| Tutup postingan | `POST /api/admin/posts/:id/close` | `{ "reason": "10–500 karakter" }` | Post read-only, laporan → ACTIONED, author mendapat notif `POST_CLOSED`. 409 kalau sudah ditutup |
| Buka kembali | `DELETE /api/admin/posts/:id/close` | - | 409 kalau tidak sedang ditutup |
| Abaikan laporan | `POST /api/admin/flags/dismiss` | `{ "postId" }` atau `{ "commentId" }` | Laporan PENDING → DISMISSED. 404 kalau tidak ada yang menunggu |
| Lepas pin pengumuman | `DELETE /api/admin/posts/:id/pin` | - | 400 kalau bukan pengumuman, 409 kalau sedang tidak di-pin |

Admin juga bisa bertindak **langsung tanpa menunggu laporan**: tombol "Hapus (admin)" di komentar memanggil endpoint remove, dan menu "Tutup postingan" di detail aspirasi memanggil endpoint close.

---

## 7. Notifikasi

`GET /api/notifications?page&limit` → `data.data[]` + `data.meta.unreadCount`. Tiap item membawa `post: { title, kind }`, `policy: { title }` (**baru**), `report`, `comment: { content }` (sudah disamarkan kalau komentar dihapus), dan `actor`.

| Type (baru) | Field terisi | Teks yang disarankan | Klik → |
|---|---|---|---|
| `POST_CLOSED` | `postId`, `post.title` | "Aspirasi {post.title} ditutup oleh admin" | `/aspirasi/{postId}` (banner alasan tampil di sana) |
| `CONTENT_REMOVED` | `commentId`, `postId` atau `policyId` | "Komentarmu dihapus oleh admin karena melanggar aturan" | `/aspirasi/{postId}` atau `/policies/{policyId}` |
| `NEW_ANNOUNCEMENT` | `postId`, `post.title`, `post.kind = ANNOUNCEMENT` | "Pengumuman baru: {post.title}" | `/aspirasi/{postId}` |

Perbaikan lain: `COMMENT_ON_POST` dan `REPLY_ON_COMMENT` sekarang juga membawa `postId` (dan `commentId`), sehingga balasan komentar bisa diklik menuju postingannya. `COMMENT_ON_POLICY` membawa `policyId` + `policy.title`.

`PATCH /api/notifications/:id/read` menandai **satu** notifikasi (403 kalau bukan milik sendiri). `PATCH /api/notifications/read-all` tetap menandai semua.

---

## 8. Upload gambar

`POST /api/uploads` (multipart): `file` (JPG/PNG/WebP, maksimal 5 MB) + `folder`.

| `folder` | Dipakai untuk |
|---|---|
| `posts` | gambar aspirasi |
| `announcements` | gambar pengumuman |
| `reports` | laporan fasilitas |
| `avatars` | foto profil |
| `campaigns` | banner donasi |
| `general` | default kalau `folder` tidak dikirim |

Folder lain → 400. Response: `{ "url": "https://res.cloudinary.com/…" }`. Kirim `url` ini apa adanya sebagai `imageUrl` / `bannerUrl`.

---

## 9. Tipe TypeScript siap pakai

```ts
export type Role = 'STUDENT' | 'LECTURER' | 'ADMIN';
export type PostKind = 'ASPIRASI' | 'ANNOUNCEMENT';
export type FlagReason = 'SPAM' | 'UJARAN_KEBENCIAN' | 'PELECEHAN' | 'HOAKS' | 'TIDAK_RELEVAN' | 'LAINNYA';

export interface ApiSuccess<T> { status: 'success'; message: string; data: T }
export interface ApiError {
  status: 'error'; message: string; code?: string;
  errors?: { path: string; message: string }[];
}
export interface Paginated<T> {
  data: T[];
  meta: { currentPage: number; itemsPerPage: number; totalItems: number; totalPages: number };
}

export interface PublicAuthor {
  id: string; role: Role; avatarUrl: string | null; displayName: string;
  studentProfile: { fullName: string } | null;
  lecturerProfile: { fullName: string } | null;
  adminProfile: { fullName: string } | null;
}

export interface Post {
  id: string; authorId: string; policyId: string | null;
  kind: PostKind; title: string; content: string; imageUrl: string | null;
  pinnedUntil: string | null; closedAt: string | null; closedReason: string | null; closedById: string | null;
  createdAt: string; updatedAt: string;
  author: PublicAuthor; closedBy: PublicAuthor | null;
  policy: { id: string; title: string } | null;
  _count: { postUpvotes: number; comments: number };
  isClosed: boolean; isPinned: boolean; hasUpvoted: boolean;
}

export interface Comment {
  id: string; authorId: string; postId: string | null; policyId: string | null; parentId: string | null;
  createdAt: string; content: string; isDeleted: boolean;
  author: PublicAuthor; _count: { commentUpvotes: number }; hasUpvoted: boolean;
  replies?: Comment[];
}

interface FlagSummary {
  id: string; author: PublicAuthor; postId: string | null; createdAt: string; contentSnippet: string;
  flagCount: number; reasons: Partial<Record<FlagReason, number>>;
  notes: { note: string; createdAt: string }[]; latestFlagAt: string | null;
}
export type FlagQueueItem =
  | (FlagSummary & { type: 'comment'; isDeleted: boolean; policyId: string | null; contextTitle: string | null })
  | (FlagSummary & { type: 'post'; kind: PostKind; title: string; isClosed: boolean });

export interface AdminStats {
  totalPosts: number; totalAnnouncements: number; totalPolicies: number; totalReports: number;
  pendingFlags: { posts: number; comments: number; total: number };
}

export type NotificationType =
  | 'COMMENT_ON_POST' | 'COMMENT_ON_POLICY' | 'REPLY_ON_COMMENT'
  | 'UPVOTE_POST' | 'UPVOTE_REPORT' | 'UPVOTE_COMMENT' | 'REPORT_STATUS_CHANGED'
  | 'POST_CLOSED' | 'CONTENT_REMOVED' | 'NEW_ANNOUNCEMENT';
```

---

## 10. Checklist pekerjaan FE

Mengacu ke `PLAN.md` §3–§5. Backend untuk semua poin di bawah **sudah siap**.

**Umum**
- [ ] Nama author pakai `author.displayName`; badge "Admin" kalau `author.role === 'ADMIN'` (feed, detail, komentar).
- [ ] Buat satu helper fetch bersama (header auth + baca `message`/`code` error). Saat ini logika `getAuthHeaders` disalin di ±12 tempat.

**Feed (`HomeFeed.tsx`)**
- [ ] Strip pengumuman ter-pin di bawah carousel donasi (`?kind=ANNOUNCEMENT&pinned=true`).
- [ ] Tab baru **Pengumuman** (`?kind=ANNOUNCEMENT`). Tab Aspirasi `?kind=ASPIRASI`. Tab Semua `?excludePinned=true`.
- [ ] Kartu pengumuman (biru, label "PENGUMUMAN", judul tampil, **tanpa upvote**).
- [ ] Badge **"DITUTUP"** kalau `isClosed`; upvote dinonaktifkan.
- [ ] Upvote berwarna kalau `hasUpvoted`.
- [ ] Buat aspirasi: kirim `imageUrl` (upload dengan `folder=posts`), bukan markdown.

**Detail (`aspirasi/[id]/page.tsx`)**
- [ ] Ikon `FiMoreHorizontal` jadi menu. Admin: "Tutup postingan" (modal alasan wajib 10–500 karakter + counter) / "Buka kembali" / "Lepas pin" (pengumuman ter-pin). Bukan pemilik: "Laporkan".
- [ ] Banner 🔒 kalau `isClosed` (lihat §3), upvote dinonaktifkan.
- [ ] Pengumuman: header "PENGUMUMAN RESMI" + `title`, tanpa upvote.

**Komentar (`CommentSection.tsx`)**
- [ ] Prop `readOnly` (= `post.isClosed`): sembunyikan input, balas, dan edit, lalu tampilkan "Diskusi ditutup".
- [ ] Tombol "Laporkan" (bukan milik sendiri, belum dihapus) → modal alasan + catatan (maksimal 300).
- [ ] Admin: tombol "Hapus (admin)" pada komentar orang lain → `POST /api/admin/comments/:id/remove`.
- [ ] Gunakan `isDeleted`, bukan perbandingan string.

**Admin (`admin/page.tsx`)**
- [ ] Kartu statistik dari `GET /api/admin/stats` + kartu "Laporan konten menunggu".
- [ ] `ModerationQueue` (tab Komentar / Postingan) dengan aksi Hapus / Tutup / Abaikan.
- [ ] `AnnouncementForm` (judul, isi, gambar opsional `folder=announcements`, durasi pin 1/3/7/30 hari).

**Notifikasi (`notif/page.tsx`)**
- [ ] Tambah `POST_CLOSED`, `CONTENT_REMOVED`, `NEW_ANNOUNCEMENT` ke union + `Record` (wajib, supaya TypeScript tidak error) beserta teks dan navigasinya (§7).

---

## 11. Akun untuk testing

Jalankan backend lokal (`docs/DEVELOPMENT.md`) lalu `npm run db:seed`. Password semua akun lokal: **`Password123!`**. Di staging, password mengikuti `SEED_PASSWORD` (tanyakan ke tim backend).

| Role | Email | Catatan |
|---|---|---|
| ADMIN | `admin@unpad.ac.id` | Antrean moderasi sudah berisi 1 postingan + 2 komentar yang dilaporkan |
| LECTURER | `dosen@unpad.ac.id` | |
| STUDENT | `budi@mail.unpad.ac.id` | Punya aspirasi dengan komentar + notifikasi |
| STUDENT | `siti@mail.unpad.ac.id` | |
| STUDENT | `andi@mail.unpad.ac.id` | Punya postingan yang **ditutup** admin + komentar yang **dihapus** admin (cek notifikasinya) |
| STUDENT | `belumverif@mail.unpad.ac.id` | Belum terverifikasi → diarahkan ke `/verify-notice` |

Data contoh yang tersedia: 1 pengumuman ter-pin + 1 yang pin-nya sudah lewat, aspirasi dengan dan tanpa gambar, 1 postingan ditutup, komentar + balasan + komentar terhapus, laporan konten PENDING/ACTIONED, 3 kebijakan (DRAFT/ACTIVE/CLOSED) dengan vote, 2 laporan fasilitas, 2 kampanye donasi, dan notifikasi setiap tipe baru.
