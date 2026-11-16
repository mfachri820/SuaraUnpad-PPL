import { reportService, CreateReportPayload, GetReportsFilter } from '@/services/reportService';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { ADMIN_READ_ONLY_MESSAGE } from '@/lib/http';
import { ReportCategory, ReportStatus } from '@prisma/client';
import { uploadService } from '@/services/uploadService';
import { assessReport, ReportAssessment } from '@/services/reportAiService';

// 1. METHOD GET: Untuk List Laporan (Public / Tidak perlu login)
export async function GET(request: Request) {
  try {
    // A. Membaca Query Parameter dari URL (contoh: ?page=2&category=POTHOLE)
    const { searchParams } = new URL(request.url);
    
    // B. Mengambil nilai satu per satu dan mengubah formatnya jika perlu
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    
    // parseInt digunakan untuk mengubah teks "2" menjadi angka matematika 2
    const page = pageParam ? parseInt(pageParam) : undefined;
    const limit = limitParam ? parseInt(limitParam) : undefined;
    
    // as ReportCategory memaksa TypeScript menganggap teks ini sebagai tipe enum Prisma
    const category = searchParams.get('category') as ReportCategory | null;
    const status = searchParams.get('status') as ReportStatus | null;

    // C. Membungkusnya ke dalam cetakan filter yang diminta Service
    const filter: GetReportsFilter = {
      page: page,
      limit: limit,
      category: category || undefined,
      status: status || undefined,
    };

    // D. Menyuruh Service mengambil data dari Database
    const result = await reportService.getReports(filter);
    
    // E. Mengembalikan data ke Frontend
    return successResponse(result, 'Berhasil mengambil daftar laporan', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return errorResponse(errorMessage, 500);
  }
}

// 2. METHOD POST: Untuk Membuat Laporan Baru (Wajib Login)
export async function POST(request: Request) {
  try {
    // A. Cek KTP (Apakah user sudah login?)
    // Middleware kita menyisipkan 'x-user-id' di header jika token JWT-nya valid
    const authorId = request.headers.get('x-user-id');
    if (!authorId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }
    if (request.headers.get('x-user-role') === 'ADMIN') {
      return errorResponse(ADMIN_READ_ONLY_MESSAGE, 403);
    }

    // B. Tangkap data JSON yang dikirim Frontend
    const body = (await request.json()) as Partial<CreateReportPayload>;

    // C. Validasi Kesiapan Data (Jangan biarkan data kosong masuk ke Service)
    // Kategori TIDAK diterima dari user; ditentukan AI dari judul.
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title || !body.description || !body.location || !body.imageUrl) {
      return errorResponse('Data tidak lengkap. title, description, location, dan imageUrl wajib diisi.', 400);
    }

    // D. AI: judul -> kategori (IndoBERT), lalu foto dicek sesuai kategori (CV). OTHER tidak dicek CV.
    let assessment: ReportAssessment;
    try {
      assessment = await assessReport(title, body.imageUrl);
    } catch (error) {
      await uploadService.deleteImageByUrl(body.imageUrl);
      const errorMessage = error instanceof Error ? error.message : 'Gagal memproses AI deteksi kerusakan.';
      return errorResponse(errorMessage, 502);
    }

    if (assessment.decision === 'reject') {
      await uploadService.deleteImageByUrl(body.imageUrl);
      return errorResponse(assessment.message, 422);
    }

    // E. Menyuruh Service menyimpan ke Database
    const newReport = await reportService.createReport(authorId, {
      title,
      description: body.description,
      location: body.location,
      imageUrl: body.imageUrl,
      category: assessment.category
    });

    // F. Kasih tahu Frontend kalau berhasil (Status 201 Created)
    const message = assessment.evaluation?.decision === 'warn'
      ? `Laporan berhasil dibuat. ${assessment.evaluation.message}`
      : 'Laporan berhasil dibuat';

    return successResponse(
      { report: newReport, ai: assessment.evaluation, labels: assessment.textLabels },
      message,
      201
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return errorResponse(errorMessage, 500);
  }
}