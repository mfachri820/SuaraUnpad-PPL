import { prisma } from "@/lib/prisma";
import { ReportCategory, ReportStatus } from "@prisma/client";
import { uploadService } from '@/services/uploadService';
import { authorSelect, toPublicAuthor } from '@/lib/author';

// Interface biar ga type 'any'
export interface CreateReportPayload {
  title: string;
  description: string;
  category: ReportCategory;
  location: string;
  imageUrl: string;
}

export interface GetReportsFilter {
  page?: number;
  limit?: number;
  category?: ReportCategory;
  status?: ReportStatus;
}

const ADMIN_QUEUE_LIMIT = 100;

const STAGE_ORDER: ReportStatus[] = ["SUBMITTED", "VERIFIED", "IN_PROGRESS", "RESOLVED"];
const STAGE_FIELD = {
  VERIFIED: "verifiedAt",
  IN_PROGRESS: "inProgressAt",
  RESOLVED: "resolvedAt"
} as const;

type StageTimestamps = Partial<Record<(typeof STAGE_FIELD)[keyof typeof STAGE_FIELD], Date | null>>;

// Tahap yang tercapai (termasuk yang dilompati) diberi waktu sekali saja;
// tahap setelah status baru dikosongkan bila laporan dimundurkan.
export function stageTimestamps(current: StageTimestamps, newStatus: ReportStatus, now: Date): StageTimestamps {
  const target = STAGE_ORDER.indexOf(newStatus);
  const data: StageTimestamps = {};
  for (const [stage, field] of Object.entries(STAGE_FIELD) as [ReportStatus, keyof StageTimestamps][]) {
    if (STAGE_ORDER.indexOf(stage) <= target) {
      if (!current[field]) data[field] = now;
    } else if (current[field]) {
      data[field] = null;
    }
  }
  return data;
}

export const reportService = {
  // FUNGSI CREATE (Membuat Laporan Baru)
  async createReport(authorId: string, data: CreateReportPayload) {
    try {
      const newReport = await prisma.report.create({
        data: {
          authorId: authorId,
          title: data.title,
          description: data.description,
          category: data.category,
          location: data.location,
          imageUrl: data.imageUrl
          // status dan upvoteCount tidak perlu diisi karena sudah punya nilai default di schema.prisma
        }
      });

      return newReport;
    } catch (error) {
      try {
        await uploadService.deleteImageByUrl(data.imageUrl);
      } catch (cleanupError) {
        console.warn('Gagal menghapus gambar yang sudah diunggah setelah kegagalan DB:', cleanupError);
      }
      throw error;
    }
  },

  // FUNGSI GET ALL (Mengambil Banyak Laporan dengan Pagination & Filter)
  async getReports(filter: GetReportsFilter) {
    // Setup Pagination (Halaman)
    const page = filter.page || 1; // Jika tidak dikirim, anggap halaman 1
    const limit = filter.limit || 10; // Jika tidak dikirim, tampilkan 10 data per halaman
    const skip = (page - 1) * limit; // Rumus melewati data

    // Setup Query Database
    const reports = await prisma.report.findMany({
      where: {
        ...(filter.category && { category: filter.category }),
        ...(filter.status && { status: filter.status })
      },
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" }, // Urutkan dari yang terbaru
      include: {
        author: {
          select: {
            id: true,
            email: true,
            avatarUrl: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
            adminProfile: { select: { fullName: true } }
          }
        },
        reportUpvotes: true
      }
    });

    // Hitung total data untuk info Pagination di Frontend
    const totalItems = await prisma.report.count({
      where: {
        ...(filter.category && { category: filter.category }),
        ...(filter.status && { status: filter.status })
      }
    });

    return {
      data: reports,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    };
  },

  async getReportById(id: string) {
    const report = await prisma.report.findUnique({
      where: { id: id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            avatarUrl: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
            adminProfile: { select: { fullName: true } }
          }
        }
      }
    });

    if (!report) throw new Error("Laporan tidak ditemukan");
    return report;
  },

  // FUNGSI UPDATE STATUS (Khusus Admin: SUBMITTED -> VERIFIED -> dll)
  async updateReportStatus(id: string, newStatus: ReportStatus) {
    const existingReport = await prisma.report.findUnique({ where: { id } });
    if (!existingReport) throw new Error("Laporan tidak ditemukan");

    return prisma.$transaction(async (tx) => {
      const updatedReport = await tx.report.update({
        where: { id: id },
        data: { status: newStatus, ...stageTimestamps(existingReport, newStatus, new Date()) }
      });

      await tx.notification.create({
        data: {
          recipientId: existingReport.authorId, // Kirim ke pembuat laporan
          actorId: existingReport.authorId, // Karena sistem/admin yang ubah, kita bisa pakai ID authornya sendiri atau ID Admin (opsional)
          type: "REPORT_STATUS_CHANGED", // Pastikan nama Enum ini sesuai di schema.prisma Anda!
          reportId: id
        }
      });

      return updatedReport;
    });
  },

  // FUNGSI ANTREAN ADMIN: laporan per status, yang paling lama menunggu di atas
  async getAdminQueue(status: ReportStatus) {
    const reports = await prisma.report.findMany({
      where: { status },
      orderBy: status === "RESOLVED" ? { resolvedAt: { sort: "desc", nulls: "last" } } : { createdAt: "asc" },
      take: ADMIN_QUEUE_LIMIT,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        location: true,
        imageUrl: true,
        status: true,
        upvoteCount: true,
        createdAt: true,
        verifiedAt: true,
        inProgressAt: true,
        resolvedAt: true,
        author: { select: authorSelect }
      }
    });
    return reports.map((report) => ({ ...report, author: toPublicAuthor(report.author) }));
  },

  // FUNGSI DELETE (Hapus Laporan)
  async deleteReport(id: string, userId: string, userRole: string) {
    // Cari laporannya dulu untuk mengecek siapa pembuatnya
    const existingReport = await prisma.report.findUnique({ where: { id } });
    if (!existingReport) throw new Error("Laporan tidak ditemukan");

    // Yang boleh hapus hanya Admin ATAU si pembuat laporan itu sendiri
    if (userRole !== "ADMIN" && existingReport.authorId !== userId) {
      throw new Error(
        "Akses ditolak. Anda tidak berhak menghapus laporan ini."
      );
    }

    // Eksekusi hapus (Data upvotes & notifikasi akan otomatis terhapus karena aturan onDelete: Cascade di Prisma)
    await prisma.report.delete({
      where: { id: id }
    });

    return { message: "Laporan berhasil dihapus" };
  },

  async toggleUpvote(reportId: string, userId: string) {
    // Kita menggunakan Interactive Transaction (tx) agar proses ini kebal dari bentrok
    return await prisma.$transaction(async (tx) => {
      // Cek laporannya ada atau tidak
      const report = await tx.report.findUnique({ where: { id: reportId } });
      if (!report) throw new Error("Laporan tidak ditemukan");

      // Cek apakah user INI sudah pernah upvote laporan INI
      // userId_reportId adalah cara Prisma membaca aturan @@unique([userId, reportId]) di schema
      const existingUpvote = await tx.reportUpvote.findUnique({
        where: {
          userId_reportId: {
            userId: userId,
            reportId: reportId
          }
        }
      });

      if (existingUpvote) {
        // KALO UDAH UPVOTE -> Maka ini fungsinya menarik Upvote (Unlike)

        // Hapus jejaknya dari tabel report_upvotes
        await tx.reportUpvote.delete({
          where: { id: existingUpvote.id }
        });

        // Kurangi angka upvoteCount di tabel laporan (-1)
        await tx.report.update({
          where: { id: reportId },
          data: { upvoteCount: { decrement: 1 } }
        });

        return { action: "unvoted", message: "Upvote berhasil ditarik" };
      } else {
        // KALO BELUM UPVOTE -> Maka ini fungsinya memberi Upvote (Like)

        // Catat jejaknya di tabel report_upvotes
        await tx.reportUpvote.create({
          data: { userId: userId, reportId: reportId }
        });

        // Tambah angka upvoteCount di tabel laporan (+1)
        await tx.report.update({
          where: { id: reportId },
          data: { upvoteCount: { increment: 1 } }
        });

        // 🚀 FIX: Eksekusi TODO (Notifikasi ke author laporan)
        // Kita pakai tx.notification biar masuk ke dalam satu transaksi yang sama
        if (report.authorId !== userId) {
          await tx.notification.create({
            data: {
              recipientId: report.authorId,
              actorId: userId,
              type: "UPVOTE_REPORT", 
              reportId: reportId
            }
          });
        }

        return { action: "upvoted", message: "Upvote berhasil ditambahkan" };
      }
    });
  }
};
