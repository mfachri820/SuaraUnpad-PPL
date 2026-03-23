import { policyService } from '@/services/policyService';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { PolicyStatus } from '@prisma/client';

// 1. GET: Ambil Detail Kebijakan + Statistik Vote (Public)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const policy = await policyService.getPolicyById(id);
    
    return successResponse(policy, 'Berhasil mengambil detail kebijakan', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage === 'Kebijakan tidak ditemukan' ? 404 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}

// 2. PATCH: Mengedit Kebijakan (Hanya Admin)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // RBAC: Hanya Admin yang boleh mengedit wacana kebijakan
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return errorResponse('Akses ditolak. Hanya Admin yang dapat mengedit kebijakan.', 403);
    }

    const body = await request.json();
    
    // Validasi opsional
    const updateData = {
      title: body.title,
      content: body.content,
      status: body.status as PolicyStatus | undefined
    };

    const updatedPolicy = await policyService.updatePolicy(id, updateData);
    return successResponse(updatedPolicy, 'Kebijakan berhasil diperbarui', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage === 'Kebijakan tidak ditemukan' ? 404 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}

// 3. DELETE: Menghapus Kebijakan (Hanya Admin)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // RBAC: Hanya Admin
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return errorResponse('Akses ditolak. Hanya Admin yang dapat menghapus kebijakan.', 403);
    }

    await policyService.deletePolicy(id);
    return successResponse(null, 'Kebijakan berhasil dihapus', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage === 'Kebijakan tidak ditemukan' ? 404 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}