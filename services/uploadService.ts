import cloudinary from '@/lib/cloudinary';

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_MAGIC = Buffer.from('RIFF');

function getImageMimeType(fileBuffer: Buffer): string | null {
  if (fileBuffer.length >= 3 && fileBuffer.slice(0, 3).equals(JPEG_MAGIC)) {
    return 'image/jpeg';
  }

  if (fileBuffer.length >= 8 && fileBuffer.slice(0, 8).equals(PNG_MAGIC)) {
    return 'image/png';
  }

  if (
    fileBuffer.length >= 12 &&
    fileBuffer.slice(0, 4).equals(WEBP_MAGIC) &&
    fileBuffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

function extractPublicIdFromUrl(imageUrl: string) {
  try {
    const parsed = new URL(imageUrl);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const lastSegment = parts.pop();
    if (!lastSegment) return null;
    return lastSegment.replace(/\.[^.]+$/, '');
  } catch {
    return null;
  }
}

export const uploadService = {
  async uploadImage(fileBuffer: Buffer, folder: string = 'suara_unpad/general'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload gagal, tidak ada hasil dari Cloudinary'));
          
          resolve(result.secure_url);
        }
      );

      uploadStream.end(fileBuffer);
    });
  },

  isValidImageBuffer(fileBuffer: Buffer, mimeType: string) {
    return getImageMimeType(fileBuffer) === mimeType;
  },

  async deleteImageByUrl(imageUrl: string) {
    const publicId = extractPublicIdFromUrl(imageUrl);
    if (!publicId) {
      throw new Error('Gagal menghapus gambar: publicId tidak dapat diekstrak dari URL');
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
  }
};