import { prisma } from '@/lib/prisma';

export interface GetNotificationsFilter {
  page?: number;
  limit?: number;
}

export const notificationService = {
  // 1. FUNGSI GET: Mengambil daftar notifikasi milik user (sebagai penerima/recipient)
  async getNotifications(userId: string, filter: GetNotificationsFilter) {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId }, // 👉 DIUBAH KE recipientId
      skip: skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        // Sekalian ambil profil si 'Pelaku' (actor) agar Frontend bisa nampilin nama/fotonya
        actor: {
          select: {
            id: true,
            avatarUrl: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
            adminProfile: { select: { fullName: true } },
          }
        }
      }
    });

    const totalItems = await prisma.notification.count({
      where: { recipientId: userId } // 👉 DIUBAH KE recipientId
    });

    const unreadCount = await prisma.notification.count({
      where: { recipientId: userId, isRead: false } // 👉 DIUBAH KE recipientId
    });

    return {
      data: notifications,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limit),
        unreadCount: unreadCount,
      }
    };
  },

  // 2. FUNGSI BACA SATU
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) throw new Error('Notifikasi tidak ditemukan');

    // BUSINESS LOGIC: Pastikan user hanya bisa membaca notif miliknya sendiri
    if (notification.recipientId !== userId) { // 👉 DIUBAH KE recipientId
      throw new Error('Akses ditolak. Ini bukan notifikasi Anda.');
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return updatedNotification;
  },

  // 3. FUNGSI BACA SEMUA
  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { 
        recipientId: userId, // 👉 DIUBAH KE recipientId
        isRead: false 
      },
      data: { isRead: true }
    });

    return { message: `${result.count} notifikasi berhasil ditandai sudah dibaca` };
  }
};