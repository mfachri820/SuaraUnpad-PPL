import { notificationService } from '@/services/notificationService';
import { successResponse } from '@/lib/apiResponse';
import { paginationSchema, parseQuery, requireAuth, withErrorHandling } from '@/lib/http';

// GET: Ambil Daftar Notifikasi (Wajib Login)
export const GET = withErrorHandling(async (request: Request) => {
  const auth = requireAuth(request);
  const filter = parseQuery(request, paginationSchema);
  const result = await notificationService.getNotifications(auth.userId, filter);
  return successResponse(result, 'Berhasil mengambil daftar notifikasi', 200);
});
