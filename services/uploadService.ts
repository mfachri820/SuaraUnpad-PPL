import cloudinary from '@/lib/cloudinary';

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_MAGIC = Buffer.from('RIFF');

export const UPLOAD_FOLDERS = ['general', 'avatars', 'posts', 'reports', 'campaigns', 'announcements'] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export function resolveUploadFolder(folder: UploadFolder) {
  const root = (process.env.CLOUDINARY_ROOT_FOLDER || 'suara_mipa').replace(/^\/+|\/+$/g, '');
  return `${root}/${folder}`;
}

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

export function extractPublicIdFromUrl(imageUrl: string, cloudName = process.env.CLOUDINARY_CLOUD_NAME) {
  try {
    const parsed = new URL(imageUrl);
    if (parsed.hostname !== 'res.cloudinary.com') return null;

    const parts = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const [cloud, resourceType, deliveryType, ...rest] = parts;
    if (!cloudName || cloud !== cloudName || resourceType !== 'image' || deliveryType !== 'upload') return null;

    const pathParts = /^v\d+$/.test(rest[0] ?? '') ? rest.slice(1) : rest;
    if (pathParts.length === 0) return null;

    return pathParts.join('/').replace(/\.[^./]+$/, '');
  } catch {
    return null;
  }
}

export const uploadService = {
  async uploadImage(fileBuffer: Buffer, folder: string = resolveUploadFolder('general')): Promise<string> {
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
      console.warn('Lewati hapus gambar: URL bukan aset Cloudinary milik aplikasi ini:', imageUrl);
      return { result: 'skipped' };
    }

    return new Promise<{ result?: string }>((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
        if (error) return reject(error);
        if (result?.result !== 'ok') {
          console.warn(`Cloudinary tidak menghapus ${publicId}:`, result);
        }
        resolve(result);
      });
    });
  }
};
