import { postService } from '@/services/postService';
import { successResponse } from '@/lib/apiResponse';
import { getAuth, parseBody, parseQuery, requireAuth, withErrorHandling } from '@/lib/http';
import { createPostSchema, listPostsQuerySchema } from '@/lib/validation';

export const GET = withErrorHandling(async (request: Request) => {
  const filter = parseQuery(request, listPostsQuerySchema);
  const result = await postService.getPosts(filter, getAuth(request)?.userId);
  return successResponse(result, 'Berhasil mengambil daftar postingan', 200);
});

export const POST = withErrorHandling(async (request: Request) => {
  const auth = requireAuth(request);
  const body = await parseBody(request, createPostSchema);
  const newPost = await postService.createPost(auth.userId, auth.role, body);
  const message = newPost.kind === 'ANNOUNCEMENT' ? 'Pengumuman berhasil dibuat' : 'Postingan berhasil dibuat';
  return successResponse(newPost, message, 201);
});
