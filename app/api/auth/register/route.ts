// app/api/auth/register/route.ts

import { authService, RegisterPayload } from "@/services/authService";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterPayload;
    
    // Password wajib JIKA bukan pendaftaran dari Google
    if (!body.email || !body.role || !body.fullName) {
      return errorResponse('Data tidak lengkap (email, role, fullName wajib diisi)', 400);
    }
    if (!body.isGoogleAuth && !body.password) {
      return errorResponse('Password wajib diisi untuk pendaftaran manual', 400);
    }

    // Timpa role dari frontend untuk keamanan mutlak
    body.role = "STUDENT";

    // Lanjutkan ke service
    const newUser = await authService.register(body);
    
    const msg = body.isGoogleAuth 
      ? 'Registrasi Google berhasil' 
      : 'Registrasi berhasil. Silakan cek email Anda untuk verifikasi.';
      
    return successResponse(newUser, msg, 201);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan pada server';
    return errorResponse(errorMessage, 400);
  }
}
