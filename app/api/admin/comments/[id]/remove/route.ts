import { moderationService } from '@/services/moderationService';
import { successResponse } from '@/lib/apiResponse';
import { assertUuid, requireAdmin, withErrorHandling } from '@/lib/http';

export const POST = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const admin = requireAdmin(request);
    const id = assertUuid((await params).id, 'Komentar tidak ditemukan');
    const result = await moderationService.removeComment(id, admin.userId);
    return successResponse(result, result.message, 200);
  }
);
