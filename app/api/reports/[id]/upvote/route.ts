import { reportService } from '@/services/reportService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Proteksi: Wajib login untuk bisa upvote
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu untuk melakukan upvote.', 401);
    }

    // Panggil service
    const result = await reportService.toggleUpvote(id, currentUserId);
    
    return successResponse(result, result.message, 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage === 'Laporan tidak ditemukan' ? 404 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}