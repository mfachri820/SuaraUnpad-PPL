import { policyService } from '@/services/policyService';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { VoteChoice } from '@prisma/client';

// 1. POST: Submit atau Ganti Pilihan Vote (Semua User Login)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Proteksi: Harus login
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu untuk melakukan voting.', 401);
    }

    const body = await request.json();
    const choice = body.choice as VoteChoice | undefined;

    // Validasi input
    if (choice !== 'AGREE' && choice !== 'DISAGREE') {
      return errorResponse('Pilihan vote tidak valid. Gunakan AGREE atau DISAGREE.', 400);
    }

    const result = await policyService.submitVote(id, currentUserId, choice);
    return successResponse(result, `Berhasil memberikan vote: ${choice}`, 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    
    let statusCode = 500;
    if (errorMessage === 'Kebijakan tidak ditemukan') statusCode = 404;
    if (errorMessage.includes('Voting ditolak')) statusCode = 403;
    
    return errorResponse(errorMessage, statusCode);
  }
}

// 2. DELETE: Cabut Vote (Semua User Login)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Proteksi: Harus login
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    await policyService.removeVote(id, currentUserId);
    return successResponse(null, 'Vote berhasil dicabut', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage === 'Anda belum memberikan vote pada kebijakan ini.' ? 400 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}