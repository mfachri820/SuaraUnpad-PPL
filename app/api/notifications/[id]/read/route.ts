import { notificationService } from '@/services/notificationService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// PATCH: Tandai Semua Dibaca (Wajib Login)
export async function PATCH(request: Request) {
  try {
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    const result = await notificationService.markAllAsRead(currentUserId);
    return successResponse(null, result.message, 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return errorResponse(errorMessage, 500);
  }
}