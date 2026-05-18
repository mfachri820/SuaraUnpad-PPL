import { donationService } from '@/services/donationService';
import { errorResponse, successResponse } from '@/lib/apiResponse';

export async function POST(
  request: Request,
  { params }: { params: { id?: string } }
) {
  try {
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'ADMIN') {
      return errorResponse(
        'Akses ditolak. Hanya Admin yang dapat mengarsipkan kampanye donasi.',
        403
      );
    }

    const body = await request.json().catch(() => ({} as { campaignId?: string; action?: 'ARCHIVE' | 'UNARCHIVE' }));
    const campaignId = params.id || body.campaignId;
    const action = body.action || 'ARCHIVE';

    if (!campaignId) {
      return errorResponse('ID kampanye tidak valid.', 400);
    }

    if (action === 'UNARCHIVE') {
      const restoredCampaign = await donationService.unarchiveCampaign(campaignId);
      return successResponse(
        restoredCampaign,
        'Kampanye donasi berhasil dikembalikan ke status aktif',
        200
      );
    }

    const archivedCampaign = await donationService.archiveCampaign(campaignId);
    return successResponse(
      archivedCampaign,
      'Kampanye donasi berhasil diarsipkan',
      200
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return errorResponse(errorMessage, 500);
  }
}
