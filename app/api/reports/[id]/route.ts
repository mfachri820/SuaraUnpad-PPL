import { reportService } from '@/services/reportService';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { ReportStatus } from '@prisma/client';

// 1. GET: Ambil Detail Laporan (Public)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Format Next.js 15: params adalah Promise
) {
  try {
    const { id } = await params;
    const report = await reportService.getReportById(id);
    
    return successResponse(report, 'Berhasil mengambil detail laporan', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage === 'Laporan tidak ditemukan' ? 404 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}

// 2. PATCH: Ubah Status Laporan (Khusus Admin)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Cek Role (Harus Admin)
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return errorResponse('Akses ditolak. Hanya Admin yang bisa mengubah status laporan.', 403);
    }

    const body = await request.json();
    const newStatus = body.status as ReportStatus | undefined;

    if (!newStatus) {
      return errorResponse('Field status wajib diisi (SUBMITTED, VERIFIED, IN_PROGRESS, RESOLVED)', 400);
    }

    const updatedReport = await reportService.updateReportStatus(id, newStatus);
    return successResponse(updatedReport, `Status laporan berhasil diubah menjadi ${newStatus}`, 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage === 'Laporan tidak ditemukan' ? 404 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}

// 3. DELETE: Hapus Laporan (Admin atau Author)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Siapa yang me-request ini?
    const currentUserId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!currentUserId || !userRole) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    await reportService.deleteReport(id, currentUserId, userRole);
    return successResponse(null, 'Laporan berhasil dihapus', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    // Mapping error status code
    let statusCode = 500;
    if (errorMessage === 'Laporan tidak ditemukan') statusCode = 404;
    if (errorMessage.includes('Akses ditolak')) statusCode = 403;
    
    return errorResponse(errorMessage, statusCode);
  }
}