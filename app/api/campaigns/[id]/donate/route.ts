import { donationService } from '@/services/donationService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // campaignId
    
    // Proteksi: Wajib Login
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    const body = await request.json();
    
    if (!body.amount || isNaN(Number(body.amount))) {
      return errorResponse('Nominal donasi tidak valid.', 400);
    }

    const transaction = await donationService.createTransaction(currentUserId, id, Number(body.amount));
    
    return successResponse(transaction, 'Transaksi berhasil dibuat. Silakan selesaikan pembayaran.', 201);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    
    let statusCode = 500;
    if (errorMessage.includes('tidak ditemukan')) statusCode = 404;
    if (errorMessage.includes('sudah ditutup') || errorMessage.includes('Minimal')) statusCode = 400;
    
    return errorResponse(errorMessage, statusCode);
  }
}