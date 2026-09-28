import { uploadService, UPLOAD_FOLDERS, resolveUploadFolder, type UploadFolder } from '@/services/uploadService';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { requireAuth, withErrorHandling } from '@/lib/http';

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 Megabytes

export const POST = withErrorHandling(async (request: Request) => {
  // Pastikan hanya user yang login yang bisa upload (cegah spamming ke Cloudinary)
  requireAuth(request);

  // Tangkap FormData (bukan JSON, karena ini pengiriman file fisik)
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const folder = (formData.get('folder') as string | null) || 'general'; // Contoh: 'avatars', 'reports'

  if (!file) {
    return errorResponse('File tidak ditemukan. Pastikan mengirim dengan key "file"', 400);
  }

  if (!UPLOAD_FOLDERS.includes(folder as UploadFolder)) {
    return errorResponse(`Folder tidak valid. Pilihan: ${UPLOAD_FOLDERS.join(', ')}.`, 400);
  }

  // Validasi Tipe File (Hanya terima gambar)
  if (!VALID_TYPES.includes(file.type)) {
    return errorResponse('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.', 400);
  }

  // Validasi Ukuran File (Maksimal 5MB agar RAM VPS kita tidak jebol)
  if (file.size > MAX_SIZE) {
    return errorResponse('Ukuran file terlalu besar. Maksimal 5MB.', 400);
  }

  // Ubah objek File menjadi Buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Validasi magic byte untuk memastikan konten benar-benar gambar
  if (!uploadService.isValidImageBuffer(buffer, file.type)) {
    return errorResponse('Konten file tidak valid. Pastikan file benar-benar gambar.', 400);
  }

  // Eksekusi Upload ke Cloudinary
  const imageUrl = await uploadService.uploadImage(buffer, resolveUploadFolder(folder as UploadFolder));

  // Kembalikan URL-nya ke Frontend
  return successResponse({ url: imageUrl }, 'File berhasil diunggah', 201);
});
