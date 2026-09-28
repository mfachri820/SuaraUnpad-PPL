import { commentService } from '@/services/commentService';
import { successResponse } from '@/lib/apiResponse';
import { getAuth, parseBody, parseQuery, requireAuth, withErrorHandling } from '@/lib/http';
import { createCommentSchema, listCommentsQuerySchema } from '@/lib/validation';

export const GET = withErrorHandling(async (request: Request) => {
  const filter = parseQuery(request, listCommentsQuerySchema);
  const result = await commentService.getComments(filter, getAuth(request)?.userId);
  return successResponse(result, 'Berhasil mengambil daftar komentar', 200);
});

// 2. POST: Buat Komentar atau Balasan (Wajib Login)
export const POST = withErrorHandling(async (request: Request) => {
  const auth = requireAuth(request);
  const body = await parseBody(request, createCommentSchema);
  const newComment = await commentService.createComment(auth.userId, body);
  return successResponse(newComment, 'Komentar berhasil dikirim', 201);
});
