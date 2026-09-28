import { moderationService } from '@/services/moderationService';
import { successResponse } from '@/lib/apiResponse';
import { parseBody, requireAdmin, withErrorHandling } from '@/lib/http';
import { flagTargetSchema } from '@/lib/validation';

export const POST = withErrorHandling(async (request: Request) => {
  const admin = requireAdmin(request);
  const target = await parseBody(request, flagTargetSchema);
  const result = await moderationService.dismissFlags(
    target.postId ? { postId: target.postId } : { commentId: target.commentId as string },
    admin.userId
  );
  return successResponse(result, 'Laporan diabaikan', 200);
});
