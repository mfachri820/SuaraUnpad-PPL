import { notificationService } from '@/services/notificationService';
import { successResponse } from '@/lib/apiResponse';
import { requireAuth, withErrorHandling } from '@/lib/http';

// PATCH: Tandai Semua Dibaca (Wajib Login)
export const PATCH = withErrorHandling(async (request: Request) => {
  const auth = requireAuth(request);
  const result = await notificationService.markAllAsRead(auth.userId);
  return successResponse(null, result.message, 200);
});
