import type { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type AdminNotificationType = Extract<NotificationType, 'NEW_REPORT' | 'NEW_CONTENT_FLAG'>;

export interface AdminNotificationTarget {
  reportId?: string | null;
  postId?: string | null;
  commentId?: string | null;
  policyId?: string | null;
}

// Kirim notifikasi ke semua admin saat user membuat laporan (fasilitas atau konten).
// Best-effort: kegagalan notifikasi tidak boleh menggagalkan laporan yang sudah tersimpan.
export async function notifyAdmins(type: AdminNotificationType, actorId: string, target: AdminNotificationTarget) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', id: { not: actorId } },
      select: { id: true }
    });
    if (admins.length === 0) return 0;

    const { count } = await prisma.notification.createMany({
      data: admins.map((admin) => ({
        recipientId: admin.id,
        actorId,
        type,
        reportId: target.reportId ?? null,
        postId: target.postId ?? null,
        commentId: target.commentId ?? null,
        policyId: target.policyId ?? null
      }))
    });
    return count;
  } catch (error) {
    console.error('Gagal mengirim notifikasi ke admin:', error);
    return 0;
  }
}
