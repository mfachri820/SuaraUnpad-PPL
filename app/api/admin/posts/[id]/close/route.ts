import { moderationService } from '@/services/moderationService';
import { successResponse } from '@/lib/apiResponse';
import { assertUuid, parseBody, requireAdmin, withErrorHandling } from '@/lib/http';
import { closePostSchema } from '@/lib/validation';

type RouteContext = { params: Promise<{ id: string }> };
const NOT_FOUND = 'Postingan tidak ditemukan';

export const POST = withErrorHandling(async (request: Request, { params }: RouteContext) => {
  const admin = requireAdmin(request);
  const id = assertUuid((await params).id, NOT_FOUND);
  const { reason } = await parseBody(request, closePostSchema);
  const result = await moderationService.closePost(id, admin.userId, reason);
  return successResponse(result, 'Postingan berhasil ditutup', 200);
});

export const DELETE = withErrorHandling(async (request: Request, { params }: RouteContext) => {
  requireAdmin(request);
  const id = assertUuid((await params).id, NOT_FOUND);
  const result = await moderationService.reopenPost(id);
  return successResponse(result, 'Postingan dibuka kembali', 200);
});
