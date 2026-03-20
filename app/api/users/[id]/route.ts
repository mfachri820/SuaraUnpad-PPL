import { userService } from '@/services/userService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Proteksi: Pastikan yang akses sudah login (ada userId dari middleware)
    const { id } = await params;
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    const user = await userService.getUserById(id);
    return successResponse(user, 'Berhasil mengambil detail user', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage === 'User tidak ditemukan' ? 404 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}