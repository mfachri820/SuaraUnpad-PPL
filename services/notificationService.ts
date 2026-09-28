import { prisma } from '@/lib/prisma';
import { forbidden, notFound } from '@/lib/http';
import { DELETED_COMMENT_PLACEHOLDER } from '@/services/commentService';

export interface GetNotificationsFilter {
  page?: number;
  limit?: number;
}

export const notificationService = {
  // Get user notification
  async getNotifications(userId: string, filter: GetNotificationsFilter) {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId }, 
      skip: skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        // Sekalian ambil profil si actor biar Frontend bisa nampilin nama/fotonya
        actor: {
          select: {
            id: true,
            avatarUrl: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
            adminProfile: { select: { fullName: true } },
          }
        },
        post: { select: { title: true, kind: true } },
        report: { select: { title: true, status: true } },
        policy: { select: { title: true } },
        comment: { select: { content: true, deletedAt: true } }
      }
    });

    const totalItems = await prisma.notification.count({
      where: { recipientId: userId } 
    });

    const unreadCount = await prisma.notification.count({
      where: { recipientId: userId, isRead: false } 
    });

    return {
      data: notifications.map((notification) => ({
        ...notification,
        comment: notification.comment
          ? { content: notification.comment.deletedAt ? DELETED_COMMENT_PLACEHOLDER : notification.comment.content }
          : null
      })),
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limit),
        unreadCount: unreadCount,
      }
    };
  },

  // FUNGSI BACA SATU
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) throw notFound('Notifikasi tidak ditemukan');

    // Pastikan user hanya bisa membaca notif miliknya sendiri
    if (notification.recipientId !== userId) { 
      throw forbidden('Akses ditolak. Ini bukan notifikasi Anda.');
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return updatedNotification;
  },

  // FUNGSI BACA SEMUA
  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { 
        recipientId: userId,
        isRead: false 
      },
      data: { isRead: true }
    });

    return { message: `${result.count} notifikasi berhasil ditandai sudah dibaca` };
  }
};