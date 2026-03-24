import { donationService, CreateCampaignPayload } from '@/services/donationService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// 1. GET: Ambil Semua Kampanye (Public)
export async function GET() {
  try {
    const campaigns = await donationService.getCampaigns();
    return successResponse(campaigns, 'Berhasil mengambil daftar kampanye', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return errorResponse(errorMessage, 500);
  }
}

// 2. POST: Buat Kampanye Baru (Hanya ADMIN)
export async function POST(request: Request) {
  try {
    const userRole = request.headers.get('x-user-role');
    
    if (userRole !== 'ADMIN') {
      return errorResponse('Akses ditolak. Hanya Admin yang dapat membuat kampanye donasi.', 403);
    }

    const body = (await request.json()) as CreateCampaignPayload;

    if (!body.title || !body.description || !body.targetAmount || !body.bannerUrl) {
      return errorResponse('Data tidak lengkap. title, description, targetAmount, dan bannerUrl wajib diisi.', 400);
    }

    const newCampaign = await donationService.createCampaign(body);
    return successResponse(newCampaign, 'Kampanye donasi berhasil dibuat', 201);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return errorResponse(errorMessage, 500);
  }
}