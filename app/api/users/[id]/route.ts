import { userService } from '@/services/userService';
import { successResponse } from '@/lib/apiResponse';
import { assertUuid, forbidden, requireAuth, withErrorHandling } from '@/lib/http';

export const GET = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const auth = requireAuth(request);
    const id = assertUuid((await params).id, 'User tidak ditemukan');
    if (auth.role !== 'ADMIN' && auth.userId !== id) {
      throw forbidden('Akses ditolak. Anda hanya dapat melihat profil Anda sendiri.');
    }
    const user = await userService.getUserById(id);
    return successResponse(user, 'Berhasil mengambil detail user', 200);
  }
);
