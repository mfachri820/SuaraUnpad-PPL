import { authService } from '@/services/authService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.idToken) {
      return errorResponse('ID Token dari Google wajib dikirim', 400);
    }

    const result = await authService.googleLogin(body.idToken);

    // Jika isNewUser true, kita kembalikan status 202 (Accepted tapi butuh aksi lanjutan)
    if (result.isNewUser) {
      return successResponse(result, 'Akun Google valid, silakan lengkapi profil Anda', 202);
    }

    // Jika user sudah ada, login sukses seperti biasa
    return successResponse(result, 'Login dengan Google berhasil', 200);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan pada verifikasi Google';
    return errorResponse(errorMessage, 401);
  }
}