import { moderationService } from '@/services/moderationService';
import { successResponse } from '@/lib/apiResponse';
import { parseBody, requireAuth, withErrorHandling } from '@/lib/http';
import { createFlagSchema } from '@/lib/validation';

export const POST = withErrorHandling(async (request: Request) => {
  const auth = requireAuth(request);
  const body = await parseBody(request, createFlagSchema);
  const flag = await moderationService.createFlag(auth.userId, body);
  return successResponse(flag, 'Laporan terkirim, akan ditinjau admin.', 201);
});
