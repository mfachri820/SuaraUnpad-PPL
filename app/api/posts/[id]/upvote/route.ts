import { postService } from '@/services/postService';
import { successResponse } from '@/lib/apiResponse';
import { assertUuid, requireAuth, withErrorHandling } from '@/lib/http';

export const POST = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = assertUuid((await params).id, 'Postingan tidak ditemukan');
    const auth = requireAuth(request);
    const result = await postService.toggleUpvote(id, auth.userId);
    return successResponse(result, result.message, 200);
  }
);
