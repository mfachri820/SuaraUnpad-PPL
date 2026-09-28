import "dotenv/config";
import bcrypt from "bcryptjs";
import type { FlagReason, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_PASSWORD = "Password123!";
const DAY = 24 * 60 * 60 * 1000;

const IMG = {
  campus: "https://res.cloudinary.com/demo/image/upload/samples/landscapes/architecture-signs.jpg",
  sample: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  sample2: "https://res.cloudinary.com/demo/image/upload/cld-sample-2.jpg",
  sample3: "https://res.cloudinary.com/demo/image/upload/cld-sample-3.jpg",
  sample4: "https://res.cloudinary.com/demo/image/upload/cld-sample-4.jpg",
  sample5: "https://res.cloudinary.com/demo/image/upload/cld-sample-5.jpg"
};

type SeedAccount = {
  key: string;
  email: string;
  role: "ADMIN" | "LECTURER" | "STUDENT";
  isVerified: boolean;
  fullName: string;
  studentId?: string;
  major?: string;
  employeeId?: string;
  department?: string;
};

const SEED_ACCOUNTS: SeedAccount[] = [
  { key: "admin", email: "admin@unpad.ac.id", role: "ADMIN", isVerified: true, fullName: "Admin Suara MIPA", department: "Kemahasiswaan FMIPA" },
  { key: "dosen", email: "dosen@unpad.ac.id", role: "LECTURER", isVerified: true, fullName: "Dr. Rina Kartika", employeeId: "NIP-198501012010", department: "FMIPA" },
  { key: "budi", email: "budi@mail.unpad.ac.id", role: "STUDENT", isVerified: true, fullName: "Budi Santoso", studentId: "1408102201", major: "Teknik Informatika" },
  { key: "siti", email: "siti@mail.unpad.ac.id", role: "STUDENT", isVerified: true, fullName: "Siti Rahmawati", studentId: "1401102202", major: "Matematika" },
  { key: "andi", email: "andi@mail.unpad.ac.id", role: "STUDENT", isVerified: true, fullName: "Andi Pratama", studentId: "1403102203", major: "Fisika" },
  { key: "belum", email: "belumverif@mail.unpad.ac.id", role: "STUDENT", isVerified: false, fullName: "Mahasiswa Belum Verifikasi", studentId: "1406102204", major: "Kimia" }
];

function resolvePassword() {
  const fromEnv = process.env.SEED_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SEED_PASSWORD wajib di-set saat NODE_ENV=production (jangan pakai password default di server).");
  }
  return DEFAULT_PASSWORD;
}

async function upsertAccounts(passwordHash: string) {
  const ids: Record<string, string> = {};

  for (const account of SEED_ACCOUNTS) {
    const profile: Omit<Prisma.UserCreateInput, "email" | "role"> =
      account.role === "ADMIN"
        ? { adminProfile: { create: { fullName: account.fullName, department: account.department! } } }
        : account.role === "LECTURER"
          ? { lecturerProfile: { create: { fullName: account.fullName, employeeId: account.employeeId!, faculty: "FMIPA" } } }
          : { studentProfile: { create: { fullName: account.fullName, studentId: account.studentId!, faculty: "FMIPA", major: account.major! } } };

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {},
      create: { email: account.email, role: account.role, isVerified: account.isVerified, passwordHash, ...profile },
      select: { id: true }
    });
    ids[account.key] = user.id;
  }

  return ids;
}

const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 60 * 60 * 1000);
const fromNow = (days: number) => new Date(Date.now() + days * DAY);

async function seedContent(u: Record<string, string>) {
  const policyActive = await prisma.policy.create({
    data: {
      authorId: u.dosen,
      title: "Perpanjangan Jam Buka Perpustakaan FMIPA hingga 21.00",
      content: "Selama periode UTS dan UAS, perpustakaan FMIPA diusulkan buka hingga pukul 21.00 pada hari kerja. Berikan pendapatmu!",
      status: "ACTIVE",
      createdAt: ago(6)
    }
  });
  await prisma.policy.create({
    data: {
      authorId: u.admin,
      title: "Penerapan Kantin Bebas Plastik Sekali Pakai",
      content: "Kantin FMIPA akan menghentikan penggunaan plastik sekali pakai mulai semester depan.",
      status: "CLOSED",
      createdAt: ago(20)
    }
  });
  await prisma.policy.create({
    data: {
      authorId: u.admin,
      title: "[DRAFT] Jadwal Ulang Kuliah Umum Dekanat",
      content: "Draft wacana, belum terlihat oleh mahasiswa.",
      status: "DRAFT",
      createdAt: ago(1)
    }
  });
  await prisma.vote.createMany({
    data: [
      { userId: u.budi, policyId: policyActive.id, choice: "AGREE" },
      { userId: u.siti, policyId: policyActive.id, choice: "AGREE" },
      { userId: u.andi, policyId: policyActive.id, choice: "DISAGREE" }
    ]
  });

  const postWifi = await prisma.post.create({
    data: {
      authorId: u.budi,
      title: "WiFi Gedung D sering putus",
      content: "WiFi di Gedung D lantai 3 sering putus saat jam kuliah pagi. Mohon dicek jaringannya ya 🙏",
      createdAt: ago(3)
    }
  });
  const postParkir = await prisma.post.create({
    data: {
      authorId: u.siti,
      title: "Parkiran motor penuh",
      content: "Parkiran motor dekat Gedung Matematika selalu penuh sebelum jam 8. Bisa ditambah area parkir?",
      imageUrl: IMG.sample3,
      createdAt: ago(2)
    }
  });
  const postPerpus = await prisma.post.create({
    data: {
      authorId: u.andi,
      policyId: policyActive.id,
      title: "Setuju perpustakaan buka malam",
      content: "Setuju perpustakaan buka lebih malam, tapi tolong AC di ruang baca lantai 2 juga diperbaiki.",
      createdAt: ago(1, 5)
    }
  });
  const postClosed = await prisma.post.create({
    data: {
      authorId: u.andi,
      title: "Jual beli akun game murah",
      content: "Yang mau beli akun game murah DM aja, dijamin aman!",
      createdAt: ago(4),
      closedAt: ago(3, 20),
      closedById: u.admin,
      closedReason: "Postingan ini tidak berkaitan dengan aspirasi kampus dan termasuk promosi/spam."
    }
  });
  const postFlagged = await prisma.post.create({
    data: {
      authorId: u.budi,
      title: "Info kuliah diliburkan besok",
      content: "Katanya besok semua kuliah di FMIPA diliburkan, sebarkan ya!",
      createdAt: ago(0, 6)
    }
  });

  const announcementPinned = await prisma.post.create({
    data: {
      authorId: u.admin,
      kind: "ANNOUNCEMENT",
      title: "Pemeliharaan Jaringan Kampus Sabtu Ini",
      content: "Akan ada pemeliharaan jaringan internet di seluruh gedung FMIPA pada Sabtu pukul 08.00–12.00 WIB. Mohon maaf atas ketidaknyamanannya.",
      imageUrl: IMG.campus,
      pinnedUntil: fromNow(7),
      createdAt: ago(0, 2)
    }
  });
  await prisma.post.create({
    data: {
      authorId: u.admin,
      kind: "ANNOUNCEMENT",
      title: "Pendaftaran Beasiswa Prestasi FMIPA Dibuka",
      content: "Pendaftaran beasiswa prestasi dibuka hingga akhir bulan. Informasi lengkap di bagian kemahasiswaan.",
      pinnedUntil: ago(1),
      createdAt: ago(10)
    }
  });

  const cWifi1 = await prisma.comment.create({
    data: { authorId: u.siti, postId: postWifi.id, content: "Iya bener, di lantai 2 juga sama.", createdAt: ago(2, 20) }
  });
  await prisma.comment.create({
    data: { authorId: u.budi, postId: postWifi.id, parentId: cWifi1.id, content: "Semoga cepat ditangani ya.", createdAt: ago(2, 18) }
  });
  const cRude = await prisma.comment.create({
    data: { authorId: u.andi, postId: postWifi.id, content: "Ngeluh mulu, pake kuota sendiri lah!", createdAt: ago(2, 10) }
  });
  const cSpam = await prisma.comment.create({
    data: { authorId: u.andi, postId: postParkir.id, content: "Promo joki tugas murah, hubungi 08xx-xxxx-xxxx", createdAt: ago(1, 10) }
  });
  await prisma.comment.create({
    data: { authorId: u.dosen, postId: postParkir.id, content: "Terima kasih masukannya, akan kami sampaikan ke bagian umum.", createdAt: ago(1, 8) }
  });
  const cRemoved = await prisma.comment.create({
    data: {
      authorId: u.andi,
      postId: postPerpus.id,
      content: "Komentar kasar yang sudah dihapus admin.",
      createdAt: ago(1, 3),
      deletedAt: ago(1, 1),
      deletedById: u.admin
    }
  });
  await prisma.comment.create({
    data: { authorId: u.siti, policyId: policyActive.id, content: "Sangat membantu untuk persiapan UAS!", createdAt: ago(5) }
  });
  await prisma.comment.create({
    data: { authorId: u.budi, postId: announcementPinned.id, content: "Apakah lab komputer juga terdampak?", createdAt: ago(0, 1) }
  });

  await prisma.postUpvote.createMany({
    data: [
      { userId: u.siti, postId: postWifi.id },
      { userId: u.andi, postId: postWifi.id },
      { userId: u.dosen, postId: postWifi.id },
      { userId: u.budi, postId: postParkir.id }
    ]
  });
  await prisma.commentUpvote.createMany({ data: [{ userId: u.budi, commentId: cWifi1.id }] });

  const flag = (reporterId: string, reason: FlagReason, target: { postId?: string; commentId?: string }, note?: string) => ({
    reporterId,
    reason,
    note: note ?? null,
    postId: target.postId ?? null,
    commentId: target.commentId ?? null
  });
  await prisma.contentFlag.createMany({
    data: [
      flag(u.budi, "SPAM", { commentId: cSpam.id }, "Promosi joki tugas"),
      flag(u.siti, "SPAM", { commentId: cSpam.id }),
      flag(u.dosen, "SPAM", { commentId: cSpam.id }),
      flag(u.budi, "UJARAN_KEBENCIAN", { commentId: cRude.id }, "Menyerang pembuat aspirasi"),
      flag(u.siti, "HOAKS", { postId: postFlagged.id }, "Tidak ada pengumuman resmi soal libur"),
      flag(u.dosen, "HOAKS", { postId: postFlagged.id })
    ]
  });
  await prisma.contentFlag.createMany({
    data: [
      { ...flag(u.budi, "SPAM", { postId: postClosed.id }), status: "ACTIONED", reviewedById: u.admin, reviewedAt: ago(3, 20) },
      { ...flag(u.siti, "PELECEHAN", { commentId: cRemoved.id }), status: "ACTIONED", reviewedById: u.admin, reviewedAt: ago(1, 1) }
    ]
  });

  const reportAc = await prisma.report.create({
    data: {
      authorId: u.siti,
      title: "AC ruang baca perpustakaan mati",
      description: "AC di ruang baca lantai 2 perpustakaan FMIPA tidak menyala sejak minggu lalu.",
      category: "OTHER",
      location: "Perpustakaan FMIPA Lt. 2",
      imageUrl: IMG.sample4,
      status: "IN_PROGRESS",
      upvoteCount: 2,
      createdAt: ago(5)
    }
  });
  await prisma.report.create({
    data: {
      authorId: u.budi,
      title: "Jalan berlubang depan Gedung D",
      description: "Ada lubang cukup dalam di jalan depan Gedung D, berbahaya untuk motor saat hujan.",
      category: "POTHOLE",
      location: "Jalan depan Gedung D",
      imageUrl: IMG.sample2,
      status: "SUBMITTED",
      createdAt: ago(1)
    }
  });
  await prisma.reportUpvote.createMany({
    data: [
      { userId: u.budi, reportId: reportAc.id },
      { userId: u.andi, reportId: reportAc.id }
    ]
  });

  const campaign = await prisma.donationCampaign.create({
    data: {
      title: "Bantuan Alat Praktikum Lab Kimia",
      description: "Penggalangan dana untuk mengganti alat praktikum yang rusak di Lab Kimia Dasar.",
      targetAmount: BigInt(5_000_000),
      collectedAmount: BigInt(150_000),
      bannerUrl: IMG.sample5,
      createdAt: ago(7)
    }
  });
  await prisma.donationCampaign.create({
    data: {
      title: "Donasi Korban Banjir Jatinangor",
      description: "Kampanye sudah selesai. Terima kasih atas partisipasinya!",
      targetAmount: BigInt(2_000_000),
      collectedAmount: BigInt(2_000_000),
      bannerUrl: IMG.sample,
      status: "COMPLETED",
      createdAt: ago(30)
    }
  });
  await prisma.transaction.create({
    data: {
      userId: u.budi,
      campaignId: campaign.id,
      orderId: `DON-SEED-${campaign.id.slice(0, 8).toUpperCase()}`,
      amount: BigInt(150_000),
      paymentStatus: "SUCCESS"
    }
  });

  const notif = (recipientId: string, actorId: string, type: NotificationType, extra: Partial<Prisma.NotificationCreateManyInput> = {}) => ({
    recipientId,
    actorId,
    type,
    ...extra
  });
  const verifiedUsers = SEED_ACCOUNTS.filter((a) => a.isVerified && a.key !== "admin").map((a) => u[a.key]);
  await prisma.notification.createMany({
    data: [
      notif(u.budi, u.siti, "COMMENT_ON_POST", { postId: postWifi.id, commentId: cWifi1.id }),
      notif(u.budi, u.siti, "UPVOTE_POST", { postId: postWifi.id }),
      notif(u.andi, u.admin, "POST_CLOSED", { postId: postClosed.id, isRead: true }),
      notif(u.andi, u.admin, "CONTENT_REMOVED", { commentId: cRemoved.id, postId: postPerpus.id }),
      notif(u.siti, u.admin, "REPORT_STATUS_CHANGED", { reportId: reportAc.id }),
      ...verifiedUsers.map((id) => notif(id, u.admin, "NEW_ANNOUNCEMENT", { postId: announcementPinned.id }))
    ]
  });
}

async function main() {
  const password = resolvePassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const ids = await upsertAccounts(passwordHash);
  console.log(`✔ ${SEED_ACCOUNTS.length} akun contoh siap`);

  const existingPosts = await prisma.post.count();
  if (existingPosts > 0) {
    console.log(`• Konten contoh dilewati: database sudah berisi ${existingPosts} postingan (pakai npm run db:reset untuk mulai dari awal)`);
  } else {
    await seedContent(ids);
    console.log("✔ Konten contoh dibuat (aspirasi, pengumuman, komentar, laporan konten, wacana, laporan fasilitas, donasi, notifikasi)");
  }

  console.log("\nAkun untuk login:");
  console.table(
    SEED_ACCOUNTS.map((a) => ({
      role: a.role,
      email: a.email,
      password: process.env.SEED_PASSWORD ? "(SEED_PASSWORD)" : DEFAULT_PASSWORD,
      verified: a.isVerified
    }))
  );
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
