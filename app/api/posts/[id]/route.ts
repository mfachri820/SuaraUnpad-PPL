import { postService } from '@/services/postService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// 1. GET: Ambil Detail Postingan (Public)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await postService.getPostById(id);
    
    return successResponse(post, 'Berhasil mengambil detail postingan', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage === 'Postingan tidak ditemukan' ? 404 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}

// 2. PATCH: Mengedit Postingan (Hanya Author)
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

    if (!body.title && !body.content) {
      return errorResponse('Tidak ada data yang diubah. Kirimkan title atau content.', 400);
    }

    const updatedPost = await postService.updatePost(id, currentUserId, {
      title: body.title,
      content: body.content,
    });
    
    return successResponse(updatedPost, 'Postingan berhasil diperbarui', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    
    let statusCode = 500;
    if (errorMessage === 'Postingan tidak ditemukan') statusCode = 404;
    if (errorMessage.includes('Akses ditolak')) statusCode = 403;
    
    return errorResponse(errorMessage, statusCode);
  }
}

// 3. DELETE: Menghapus Postingan (Author atau Admin)
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

    await postService.deletePost(id, currentUserId, userRole);
    return successResponse(null, 'Postingan berhasil dihapus', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    
    let statusCode = 500;
    if (errorMessage === 'Postingan tidak ditemukan') statusCode = 404;
    if (errorMessage.includes('Akses ditolak')) statusCode = 403;
    
    return errorResponse(errorMessage, statusCode);
  }
}