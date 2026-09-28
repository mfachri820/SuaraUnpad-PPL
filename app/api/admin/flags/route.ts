import { moderationService } from '@/services/moderationService';
import { successResponse } from '@/lib/apiResponse';
import { parseQuery, requireAdmin, withErrorHandling } from '@/lib/http';
import { flagQueueQuerySchema } from '@/lib/validation';

export const GET = withErrorHandling(async (request: Request) => {
  requireAdmin(request);
  const { type } = parseQuery(request, flagQueueQuerySchema);
  const queue = await moderationService.getFlagQueue(type);
  return successResponse(queue, 'Berhasil mengambil antrean moderasi', 200);
});
