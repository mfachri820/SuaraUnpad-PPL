import { commentService } from '@/services/commentService';
import { successResponse } from '@/lib/apiResponse';
import { assertUuid, parseBody, requireAuth, withErrorHandling } from '@/lib/http';
import { updateCommentSchema } from '@/lib/validation';

type RouteContext = { params: Promise<{ id: string }> };
const NOT_FOUND = 'Komentar tidak ditemukan';

// 1. PATCH: Mengedit Komentar (Hanya Author)
export const PATCH = withErrorHandling(async (request: Request, { params }: RouteContext) => {
  const id = assertUuid((await params).id, NOT_FOUND);
  const auth = requireAuth(request);
  const { content } = await parseBody(request, updateCommentSchema);
  const updatedComment = await commentService.updateComment(id, auth.userId, content);
  return successResponse(updatedComment, 'Komentar berhasil diperbarui', 200);
});

// 2. DELETE: Soft Delete Komentar (Author atau Admin)
export const DELETE = withErrorHandling(async (request: Request, { params }: RouteContext) => {
  const id = assertUuid((await params).id, NOT_FOUND);
  const auth = requireAuth(request);
  const result = await commentService.deleteComment(id, auth.userId, auth.role);
  return successResponse(null, result.message, 200);
});
