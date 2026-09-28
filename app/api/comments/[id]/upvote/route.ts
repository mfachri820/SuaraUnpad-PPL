import { commentService } from '@/services/commentService';
import { successResponse } from '@/lib/apiResponse';
import { assertUuid, requireAuth, withErrorHandling } from '@/lib/http';

export const POST = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = assertUuid((await params).id, 'Komentar tidak ditemukan');
    const auth = requireAuth(request);
    const result = await commentService.toggleUpvote(id, auth.userId);
    return successResponse(result, result.message, 200);
  }
);
