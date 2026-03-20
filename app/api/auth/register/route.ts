import { authService, RegisterPayload } from '@/services/authService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(request: Request) {
  try {
    // Casting tipe request JSON ke interface kita
    const body = (await request.json()) as RegisterPayload;
    
    // Validasi basic
    if (!body.email || !body.password || !body.role || !body.fullName) {
      return errorResponse('Data tidak lengkap (email, password, role, fullName wajib diisi)', 400);
    }

    const newUser = await authService.register(body);
    return successResponse(newUser, 'Registrasi berhasil', 201);
  } catch (error: unknown) {
    // Ganti 'any' dengan 'unknown' dan pastikan itu Error object
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan pada server';
    return errorResponse(errorMessage, 400);
  }
}