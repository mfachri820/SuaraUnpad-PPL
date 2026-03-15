import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { authService } from '@/services/authService';

export async function GET(request: Request) {
  try {
    // 1. Tangkap ID user yang dilempar oleh middleware
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return errorResponse('Akses ditolak', 401);
    }

    // 2. Cari data user di database beserta profilnya
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
        // Ambil profil yang sesuai (yang tidak ada akan bernilai null)
        studentProfile: true,
        lecturerProfile: true,
        adminProfile: true,
      }
    });

    if (!user) {
      return errorResponse('User tidak ditemukan', 404);
    }

    return successResponse(user, 'Data user berhasil diambil', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan pada server';
    return errorResponse(errorMessage, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role'); // Ambil role yang dilempar middleware

    if (!userId || !userRole) {
      return errorResponse('Akses ditolak', 401);
    }

    const body = await request.json();

    // Panggil service untuk update tabel profil yang sesuai
    const updatedProfile = await authService.updateProfile(userId, userRole, body);

    return successResponse(updatedProfile, 'Profil berhasil diperbarui', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan pada server';
    return errorResponse(errorMessage, 500);
  }
}