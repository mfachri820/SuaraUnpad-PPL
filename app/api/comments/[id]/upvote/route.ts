import { commentService } from '@/services/commentService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Proteksi: Wajib Login
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    // Eksekusi Service
    const result = await commentService.toggleUpvote(id, currentUserId);
    
    return successResponse(result, result.message, 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage === 'Komentar tidak ditemukan' ? 404 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}