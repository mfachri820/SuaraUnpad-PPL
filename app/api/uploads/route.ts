import { uploadService } from '@/services/uploadService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function POST(request: Request) {
  try {
    // Pastikan hanya user yang login yang bisa upload (cegah spamming ke Cloudinary)
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    // Tangkap FormData (bukan JSON, karena ini pengiriman file fisik)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string | null; // Contoh: 'avatars', 'reports'

    if (!file) {
      return errorResponse('File tidak ditemukan. Pastikan mengirim dengan key "file"', 400);
    }

    // Validasi Tipe File (Hanya terima gambar)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return errorResponse('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.', 400);
    }

    // Validasi Ukuran File (Maksimal 5MB agar RAM VPS kita tidak jebol)
    const MAX_SIZE = 5 * 1024 * 1024; // 5 Megabytes
    if (file.size > MAX_SIZE) {
      return errorResponse('Ukuran file terlalu besar. Maksimal 5MB.', 400);
    }

    // Ubah objek File menjadi Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Tentukan path folder di Cloudinary
    const targetFolder = folder ? `suara_unpad/${folder}` : 'suara_unpad/general';

    // Eksekusi Upload ke Cloudinary
    const imageUrl = await uploadService.uploadImage(buffer, targetFolder);

    // Kembalikan URL-nya ke Frontend
    return successResponse({ url: imageUrl }, 'File berhasil diunggah', 201);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunggah file';
    return errorResponse(errorMessage, 500);
  }
}