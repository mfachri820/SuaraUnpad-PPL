import { notificationService } from '@/services/notificationService';
import { successResponse } from '@/lib/apiResponse';
import { assertUuid, requireAuth, withErrorHandling } from '@/lib/http';

export const PATCH = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const auth = requireAuth(request);
    const id = assertUuid((await params).id, 'Notifikasi tidak ditemukan');
    const notification = await notificationService.markAsRead(id, auth.userId);
    return successResponse(notification, 'Notifikasi ditandai sudah dibaca', 200);
  }
);
