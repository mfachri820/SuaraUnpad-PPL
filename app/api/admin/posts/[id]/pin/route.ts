import { moderationService } from '@/services/moderationService';
import { successResponse } from '@/lib/apiResponse';
import { assertUuid, requireAdmin, withErrorHandling } from '@/lib/http';

export const DELETE = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    requireAdmin(request);
    const id = assertUuid((await params).id, 'Postingan tidak ditemukan');
    const result = await moderationService.unpinPost(id);
    return successResponse(result, 'Pin pengumuman dilepas', 200);
  }
);
