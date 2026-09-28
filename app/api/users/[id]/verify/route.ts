import { z } from 'zod';
import { userService } from '@/services/userService';
import { successResponse } from '@/lib/apiResponse';
import { assertUuid, parseBody, requireAdmin, withErrorHandling } from '@/lib/http';

const bodySchema = z.object({
  isVerified: z.boolean({ message: 'Field isVerified wajib diisi dengan format boolean (true / false)' })
});

export const PATCH = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    requireAdmin(request);
    const id = assertUuid((await params).id, 'User tidak ditemukan');
    const { isVerified } = await parseBody(request, bodySchema);
    const updatedUser = await userService.verifyUser(id, isVerified);
    return successResponse(updatedUser, `Status verifikasi user berhasil diubah menjadi ${isVerified}`, 200);
  }
);
