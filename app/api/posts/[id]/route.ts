import { postService } from '@/services/postService';
import { successResponse } from '@/lib/apiResponse';
import { assertUuid, getAuth, parseBody, requireAuth, withErrorHandling } from '@/lib/http';
import { updatePostSchema } from '@/lib/validation';

type RouteContext = { params: Promise<{ id: string }> };
const NOT_FOUND = 'Postingan tidak ditemukan';

export const GET = withErrorHandling(async (request: Request, { params }: RouteContext) => {
  const id = assertUuid((await params).id, NOT_FOUND);
  const post = await postService.getPostById(id, getAuth(request)?.userId);
  return successResponse(post, 'Berhasil mengambil detail postingan', 200);
});

// 2. PATCH: Mengedit Postingan (Hanya Author)
export const PATCH = withErrorHandling(async (request: Request, { params }: RouteContext) => {
  const id = assertUuid((await params).id, NOT_FOUND);
  const auth = requireAuth(request);
  const body = await parseBody(request, updatePostSchema);
  const updatedPost = await postService.updatePost(id, auth.userId, body);
  return successResponse(updatedPost, 'Postingan berhasil diperbarui', 200);
});

// 3. DELETE: Menghapus Postingan (Author atau Admin)
export const DELETE = withErrorHandling(async (request: Request, { params }: RouteContext) => {
  const id = assertUuid((await params).id, NOT_FOUND);
  const auth = requireAuth(request);
  await postService.deletePost(id, auth.userId, auth.role);
  return successResponse(null, 'Postingan berhasil dihapus', 200);
});
