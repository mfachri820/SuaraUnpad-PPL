import { notificationService, GetNotificationsFilter } from '@/services/notificationService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// GET: Ambil Daftar Notifikasi (Wajib Login)
export async function GET(request: Request) {
  try {
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    
    const filter: GetNotificationsFilter = {
      page: pageParam ? parseInt(pageParam) : undefined,
      limit: limitParam ? parseInt(limitParam) : undefined,
    };

    const result = await notificationService.getNotifications(currentUserId, filter);
    return successResponse(result, 'Berhasil mengambil daftar notifikasi', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return errorResponse(errorMessage, 500);
  }
}