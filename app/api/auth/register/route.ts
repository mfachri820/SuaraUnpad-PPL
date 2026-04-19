// app/api/auth/register/route.ts

import { authService, RegisterPayload } from "@/services/authService";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterPayload & {
      studentId?: string;
      employeeId?: string;
      major?: string;
      faculty?: string;
    };

    // Validasi basic email & password dulu
    if (!body.email || !body.password || !body.fullName || !body.faculty) {
      return errorResponse("Data tidak lengkap", 400);
    }

    // Deteksi Domain Email
    const domain = body.email.split("@")[1];
    let detectedRole: "STUDENT" | "LECTURER" | "ADMIN" = "STUDENT";

    if (domain === "unpad.ac.id") {
      detectedRole = "LECTURER";
    } else if (
      domain === "mail.unpad.ac.id" ||
      domain === "student.unpad.ac.id"
    ) {
      detectedRole = "STUDENT";
    } else {
      // Tolak mentah-mentah jika bukan email Unpad
      return errorResponse(
        "Akses ditolak. Gunakan email resmi Unpad (@unpad.ac.id atau @mail.unpad.ac.id)",
        403
      );
    }

    // Timpa role dari frontend untuk keamanan mutlak
    body.role = detectedRole;

    // Lanjutkan ke service
    const newUser = await authService.register(body);
    return successResponse(newUser, "Registrasi berhasil", 201);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Terjadi kesalahan pada server";
    return errorResponse(errorMessage, 400);
  }
}
