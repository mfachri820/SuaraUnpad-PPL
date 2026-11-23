import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  getS3Client,
  getStorageConfig,
  keyFromPublicUrl,
  publicUrlFor,
  storageFolderPrefix,
  type StorageFolder
} from '@/lib/storage';
import { trimSlashes } from '@/lib/slashes';

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_MAGIC = Buffer.from('RIFF');

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

export { STORAGE_FOLDERS as UPLOAD_FOLDERS, type StorageFolder as UploadFolder } from '@/lib/storage';

export function resolveUploadFolder(folder: StorageFolder) {
  return storageFolderPrefix(folder);
}

function getImageMimeType(fileBuffer: Buffer): string | null {
  if (fileBuffer.length >= 3 && fileBuffer.subarray(0, 3).equals(JPEG_MAGIC)) {
    return 'image/jpeg';
  }

  if (fileBuffer.length >= 8 && fileBuffer.subarray(0, 8).equals(PNG_MAGIC)) {
    return 'image/png';
  }

  if (
    fileBuffer.length >= 12 &&
    fileBuffer.subarray(0, 4).equals(WEBP_MAGIC) &&
    fileBuffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

export const uploadService = {
  async uploadImage(fileBuffer: Buffer, folder: string = resolveUploadFolder('general')): Promise<string> {
    const contentType = getImageMimeType(fileBuffer);
    if (!contentType) throw new Error('Konten file bukan gambar yang didukung.');

    const config = getStorageConfig();
    if (!config.bucket) throw new Error('Storage belum dikonfigurasi: AWS_BUCKET kosong.');

    const key = `${trimSlashes(folder)}/${randomUUID()}.${EXTENSION_BY_MIME[contentType]}`;

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        // Nama file unik per upload, jadi aman di-cache lama oleh browser/proxy.
        CacheControl: 'public, max-age=31536000, immutable'
      })
    );

    return publicUrlFor(key, config);
  },

  isValidImageBuffer(fileBuffer: Buffer, mimeType: string) {
    return getImageMimeType(fileBuffer) === mimeType;
  },

  async deleteImageByUrl(imageUrl: string) {
    const key = keyFromPublicUrl(imageUrl);
    if (!key) {
      console.warn('Lewati hapus gambar: URL bukan objek storage milik aplikasi ini:', imageUrl);
      return { result: 'skipped' };
    }

    await getS3Client().send(new DeleteObjectCommand({ Bucket: getStorageConfig().bucket, Key: key }));
    return { result: 'ok' };
  }
};
