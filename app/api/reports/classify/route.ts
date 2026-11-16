import { successResponse, errorResponse } from '@/lib/apiResponse';
import { suggestReportCategory, TEXT_AI_MAX_LENGTH } from '@/services/reportAiService';

// METHOD POST: Saran kategori laporan dari teks (judul + deskripsi) memakai IndoBERT.
// Hanya saran; kategori akhir tetap dipilih user saat POST /api/reports.
export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Body harus berupa JSON.', 400);
  }

  const rawText = (body as { text?: unknown } | null)?.text;
  const text = typeof rawText === 'string' ? rawText.trim() : '';
  if (!text) {
    return errorResponse('Teks laporan wajib diisi.', 400);
  }
  if (text.length > TEXT_AI_MAX_LENGTH) {
    return errorResponse(`Teks laporan maksimal ${TEXT_AI_MAX_LENGTH} karakter.`, 400);
  }

  try {
    const suggestion = await suggestReportCategory(text);
    return successResponse(suggestion, 'Berhasil mendapatkan saran kategori', 200);
  } catch (error) {
    console.error('Report category suggestion failed:', error);
    return errorResponse('Saran kategori AI sedang tidak tersedia.', 503);
  }
}
