import { commentService } from '@/services/commentService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// 1. PATCH: Mengedit Komentar (Hanya Author)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Proteksi: Harus login
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    const body = await request.json();

    if (!body.content) {
      return errorResponse('Isi komentar tidak boleh kosong.', 400);
    }

    const updatedComment = await commentService.updateComment(id, currentUserId, body.content);
    return successResponse(updatedComment, 'Komentar berhasil diperbarui', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    
    let statusCode = 500;
    if (errorMessage === 'Komentar tidak ditemukan') statusCode = 404;
    if (errorMessage.includes('Akses ditolak') || errorMessage.includes('Komentar yang sudah dihapus')) statusCode = 403;
    
    return errorResponse(errorMessage, statusCode);
  }
}

// 2. DELETE: Soft Delete Komentar (Author atau Admin)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const currentUserId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!currentUserId || !userRole) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    await commentService.deleteComment(id, currentUserId, userRole);
    return successResponse(null, 'Komentar berhasil dihapus', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    
    let statusCode = 500;
    if (errorMessage === 'Komentar tidak ditemukan') statusCode = 404;
    if (errorMessage.includes('Akses ditolak')) statusCode = 403;
    
    return errorResponse(errorMessage, statusCode);
  }
}