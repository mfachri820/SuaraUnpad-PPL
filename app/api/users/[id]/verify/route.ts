import { userService } from '@/services/userService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const {id} = await params;
    // Proteksi: Hanya Admin
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return errorResponse('Akses ditolak. Hanya Admin yang diizinkan.', 403);
    }

    // Ambil request body
    const body = await request.json();

    // Validasi input strict boolean
    if (typeof body.isVerified !== 'boolean') {
      return errorResponse('Field isVerified wajib diisi dengan format boolean (true / false)', 400);
    }

    const updatedUser = await userService.verifyUser(id, body.isVerified);
    return successResponse(updatedUser, `Status verifikasi user berhasil diubah menjadi ${body.isVerified}`, 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage === 'User tidak ditemukan' ? 404 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}