import cloudinary from '@/lib/cloudinary';

export const uploadService = {
  /**
   * Mengunggah file buffer ke Cloudinary via stream.
   * @param fileBuffer Buffer dari file gambar
   * @param folder Nama folder tujuan di Cloudinary (opsional)
   * @returns URL aman (HTTPS) dari gambar yang berhasil diunggah
   */

  
  async uploadImage(fileBuffer: Buffer, folder: string = 'suara_unpad/general'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          // Opsional: Anda bisa tambahkan transformasi di sini jika butuh
          // misal: format: 'webp', quality: 'auto'
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload gagal, tidak ada hasil dari Cloudinary'));
          
          // Kembalikan URL HTTPS
          resolve(result.secure_url);
        }
      );

      // Akhiri stream dengan mengirimkan buffer dari RAM kita
      uploadStream.end(fileBuffer);
    });
  }
};