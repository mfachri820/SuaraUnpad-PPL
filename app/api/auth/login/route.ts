import { authService } from '@/services/authService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.email || !body.password) {
      return errorResponse('Email dan password wajib diisi', 400);
    }

    const loginData = await authService.login(body.email, body.password);
    return successResponse(loginData, 'Login berhasil', 200);
  } catch (error: unknown) {
    // Handling error tanpa tipe 'any'
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan pada server';
    return errorResponse(errorMessage, 401);
  }
}