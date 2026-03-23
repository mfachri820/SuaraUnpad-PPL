import { policyService, CreatePolicyPayload } from '@/services/policyService';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { PolicyStatus } from '@prisma/client';

// 1. GET: List Kebijakan (Public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validasi filter status (Pastikan teks yang dikirim cocok dengan Enum Prisma)
    const statusParam = searchParams.get('status');
    const isValidStatus = statusParam === 'DRAFT' || statusParam === 'ACTIVE' || statusParam === 'CLOSED';
    
    const statusFilter = isValidStatus ? (statusParam as PolicyStatus) : undefined;

    const policies = await policyService.getPolicies(statusFilter);
    return successResponse(policies, 'Berhasil mengambil daftar kebijakan', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return errorResponse(errorMessage, 500);
  }
}

// 2. POST: Buat Kebijakan Baru (Hanya Admin & Dosen)
export async function POST(request: Request) {
  try {
    const currentUserId = request.headers.get('x-user-id');
    const currentUserRole = request.headers.get('x-user-role');

    // Proteksi Lapis 1: Harus Login
    if (!currentUserId || !currentUserRole) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    // Proteksi Lapis 2: Role-Based Access Control (RBAC)
    // Mahasiswa tidak boleh membuat wacana kebijakan!
    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'LECTURER') {
      return errorResponse('Akses ditolak. Hanya Admin dan Dosen yang dapat membuat kebijakan.', 403);
    }

    const body = (await request.json()) as CreatePolicyPayload;

    if (!body.title || !body.content) {
      return errorResponse('Data tidak lengkap. title dan content wajib diisi.', 400);
    }

    const newPolicy = await policyService.createPolicy(currentUserId, body);
    return successResponse(newPolicy, 'Wacana kebijakan berhasil dibuat (Status: DRAFT)', 201);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return errorResponse(errorMessage, 500);
  }
}