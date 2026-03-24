import { prisma } from '@/lib/prisma';
import { ReportCategory, ReportStatus } from '@prisma/client';

// 1. INTERFACE: Cetakan Data
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

export const reportService = {
  // 2. FUNGSI CREATE (Membuat Laporan Baru)
  async createReport(authorId: string, data: CreateReportPayload) {
    const newReport = await prisma.report.create({
      data: {
        authorId: authorId,
        title: data.title,
        description: data.description,
        category: data.category,
        location: data.location,
        imageUrl: data.imageUrl,
        // status dan upvoteCount tidak perlu diisi karena sudah punya nilai default di schema.prisma
      },
    });

    return newReport;
  },

  // 3. FUNGSI GET ALL (Mengambil Banyak Laporan dengan Pagination & Filter)
  async getReports(filter: GetReportsFilter) {
    // A. Setup Pagination (Halaman)
    const page = filter.page || 1; // Jika tidak dikirim, anggap halaman 1
    const limit = filter.limit || 10; // Jika tidak dikirim, tampilkan 10 data per halaman
    const skip = (page - 1) * limit; // Rumus melewati data

    // B. Setup Query Database
    const reports = await prisma.report.findMany({
      where: {
        ...(filter.category && { category: filter.category }),
        ...(filter.status && { status: filter.status }),
      },
      skip: skip,
      take: limit,
      orderBy: { createdAt: 'desc' }, // Urutkan dari yang terbaru
      include: {
        author: {
          select: {
            id: true,
            email: true,
            avatarUrl: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
            adminProfile: { select: { fullName: true } },
          }
        }
      }
    });

    // C. Hitung total data untuk info Pagination di Frontend
    const totalItems = await prisma.report.count({
      where: {
        ...(filter.category && { category: filter.category }),
        ...(filter.status && { status: filter.status }),
      }
    });

    return {
      data: reports,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limit),
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
            adminProfile: { select: { fullName: true } },
          }
        }
      }
    });

    if (!report) throw new Error('Laporan tidak ditemukan');
    return report;
  },

  // 5. FUNGSI UPDATE STATUS (Khusus Admin: SUBMITTED -> VERIFIED -> dll)
  // 5. FUNGSI UPDATE STATUS (Khusus Admin: SUBMITTED -> VERIFIED -> dll)
  async updateReportStatus(id: string, newStatus: ReportStatus) {
    const existingReport = await prisma.report.findUnique({ where: { id } });
    if (!existingReport) throw new Error('Laporan tidak ditemukan');

    const updatedReport = await prisma.report.update({
      where: { id: id },
      data: { status: newStatus }
    });


    await prisma.notification.create({
      data: {
        recipientId: existingReport.authorId, // Kirim ke pembuat laporan
        actorId: existingReport.authorId,     // Karena sistem/admin yang ubah, kita bisa pakai ID authornya sendiri atau ID Admin (opsional)
        type: 'REPORT_STATUS_CHANGED',        // Pastikan nama Enum ini sesuai di schema.prisma Anda!
        reportId: id,
      }
    });
    // ==========================================

    return updatedReport;
  },

  // 6. FUNGSI DELETE (Hapus Laporan)
  async deleteReport(id: string, userId: string, userRole: string) {
    // Cari laporannya dulu untuk mengecek siapa pembuatnya
    const existingReport = await prisma.report.findUnique({ where: { id } });
    if (!existingReport) throw new Error('Laporan tidak ditemukan');

    // PROTEKSI BISNIS LOGIC: Yang boleh hapus hanya Admin ATAU si pembuat laporan itu sendiri
    if (userRole !== 'ADMIN' && existingReport.authorId !== userId) {
      throw new Error('Akses ditolak. Anda tidak berhak menghapus laporan ini.');
    }

    // Eksekusi hapus (Data upvotes & notifikasi akan otomatis terhapus karena aturan onDelete: Cascade di Prisma)
    await prisma.report.delete({
      where: { id: id }
    });

    return { message: 'Laporan berhasil dihapus' };
  },
  
  async toggleUpvote(reportId: string, userId: string) {
    // Kita menggunakan Interactive Transaction (tx) agar proses ini kebal dari bentrok
    return await prisma.$transaction(async (tx) => {
      // A. Cek laporannya ada atau tidak
      const report = await tx.report.findUnique({ where: { id: reportId } });
      if (!report) throw new Error('Laporan tidak ditemukan');

      // B. Cek apakah user INI sudah pernah upvote laporan INI
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
        // KONDISI 1: SUDAH UPVOTE -> Maka ini fungsinya menarik Upvote (Unlike)
        
        // Hapus jejaknya dari tabel report_upvotes
        await tx.reportUpvote.delete({
          where: { id: existingUpvote.id }
        });
        
        // Kurangi angka upvoteCount di tabel laporan (-1)
        await tx.report.update({
          where: { id: reportId },
          data: { upvoteCount: { decrement: 1 } }
        });
        
        return { action: 'unvoted', message: 'Upvote berhasil ditarik' };
      } else {
        // KONDISI 2: BELUM UPVOTE -> Maka ini fungsinya memberi Upvote (Like)
        
        // Catat jejaknya di tabel report_upvotes
        await tx.reportUpvote.create({
          data: { userId: userId, reportId: reportId }
        });
        
        // Tambah angka upvoteCount di tabel laporan (+1)
        await tx.report.update({
          where: { id: reportId },
          data: { upvoteCount: { increment: 1 } }
        });

        // TODO: Di Fase 4 (Notifikasi), kita akan memanggil notifikasi ke author di sini
        
        return { action: 'upvoted', message: 'Upvote berhasil ditambahkan' };
      }
    });
  }
  
};