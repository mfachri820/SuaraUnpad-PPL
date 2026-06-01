import { userService } from "@/services/userService";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
    try {
        const userRole = request.headers.get('x-user-role');
        if (userRole !== 'ADMIN') {
            return errorResponse('Akses ditolak, Hanya admin yang diizinkan.', 403);
        }

        const {searchParams} = new URL(request.url);
        const roleFilter = searchParams.get('role') as Role | null;
        const users = await userService.getAllUsers(roleFilter || undefined);
        return successResponse(users, 'Berhasil mengambil daftar user', 200);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan server";
        return errorResponse(errorMessage, 500);
    }
}
