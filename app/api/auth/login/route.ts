import { authService } from '@/services/authService';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { isPasswordLoginEnabled } from '@/lib/authFeatures';

export async function POST(request: Request) {
  if (!isPasswordLoginEnabled()) {
    return errorResponse('Login password dinonaktifkan. Silakan masuk dengan PAuS.', 404);
  }

  try {
    const body = await request.json();

    if (!body.email || !body.password) {
      return errorResponse('Email dan password wajib diisi', 400);
    }

    const loginData = await authService.login(body.email, body.password);
    return successResponse(loginData, 'Login berhasil', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan pada server';
    return errorResponse(errorMessage, 401);
  }
}
