import { S3Client } from '@aws-sdk/client-s3';
import { trimSlashes, trimTrailingSlashes as trimTrailingSlash } from '@/lib/slashes';

// Penyimpanan file pakai S3-compatible storage (MinIO platform Unpad).
// Nama env sengaja disamakan dengan konvensi AWS / Laravel yang dipakai project lain
// di platform yang sama, jadi nilai dari Tim Platform bisa langsung dipakai:
//   AWS_ENDPOINT                 endpoint S3 untuk upload/hapus (mis. https://nodes.minio.unpad.dev)
//   AWS_DEFAULT_REGION           region MinIO (mis. id-dipatiukur-1)
//   AWS_BUCKET                   nama bucket
//   AWS_ACCESS_KEY_ID            access key   (secret)
//   AWS_SECRET_ACCESS_KEY        secret key   (secret)
//   AWS_USE_PATH_STYLE_ENDPOINT  "true" untuk MinIO
//   AWS_URL                      base URL publik objek, sudah termasuk bucket
//                                (mis. lewat proxy svc publik). Kosong = <endpoint>/<bucket>.
//   STORAGE_ROOT_FOLDER          prefix key opsional di dalam bucket. Kosong (default) = file langsung
//                                di <bucket>/<folder>/..., karena bucket sudah khusus app & per environment.

/** Folder upload yang diizinkan, langsung di bawah root (atau di bawah bucket jika root kosong). */
export const STORAGE_FOLDERS = ['general', 'avatars', 'posts', 'reports', 'announcements'] as const;
export type StorageFolder = (typeof STORAGE_FOLDERS)[number];

export interface StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  forcePathStyle: boolean;
  publicBaseUrl: string;
}


export function getStorageConfig(): StorageConfig {
  const bucket = process.env.AWS_BUCKET?.trim() ?? '';
  const endpoint = process.env.AWS_ENDPOINT?.trim() || undefined;
  const explicitPublicUrl = process.env.AWS_URL?.trim();

  const publicBaseUrl = explicitPublicUrl
    ? trimTrailingSlash(explicitPublicUrl)
    : endpoint && bucket
      ? `${trimTrailingSlash(endpoint)}/${bucket}`
      : '';

  return {
    endpoint,
    region: process.env.AWS_DEFAULT_REGION?.trim() || 'us-east-1',
    bucket,
    forcePathStyle: (process.env.AWS_USE_PATH_STYLE_ENDPOINT ?? 'true').toLowerCase() !== 'false',
    publicBaseUrl
  };
}

export function getStorageRootFolder() {
  return trimSlashes(process.env.STORAGE_ROOT_FOLDER?.trim() ?? '');
}

/** Object key prefix untuk sebuah folder upload, mis. "reports" atau "<root>/reports". */
export function storageFolderPrefix(folder: StorageFolder, rootFolder: string = getStorageRootFolder()) {
  return rootFolder ? `${rootFolder}/${folder}` : folder;
}

let cachedClient: S3Client | undefined;
let cachedClientKey: string | undefined;

export function getS3Client(): S3Client {
  const config = getStorageConfig();
  const cacheKey = `${config.endpoint}|${config.region}|${config.forcePathStyle}`;
  if (!cachedClient || cachedClientKey !== cacheKey) {
    // Credential dibaca otomatis oleh SDK dari AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
    cachedClient = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle
    });
    cachedClientKey = cacheKey;
  }
  return cachedClient;
}

export function publicUrlFor(key: string, config: StorageConfig = getStorageConfig()) {
  if (!config.publicBaseUrl) {
    throw new Error('Storage belum dikonfigurasi: set AWS_URL atau AWS_ENDPOINT + AWS_BUCKET.');
  }
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${config.publicBaseUrl}/${encodedKey}`;
}

/**
 * Balikkan URL publik menjadi object key, HANYA jika URL itu milik bucket aplikasi ini
 * dan berada di salah satu STORAGE_FOLDERS (di bawah STORAGE_ROOT_FOLDER jika diisi).
 * URL lain (eksternal, bucket lain, folder lain, path traversal)
 * menghasilkan null supaya tidak pernah dihapus atau diterima sebagai gambar upload.
 */
export function keyFromPublicUrl(
  imageUrl: string,
  config: StorageConfig = getStorageConfig(),
  rootFolder: string = getStorageRootFolder()
): string | null {
  if (!config.publicBaseUrl) return null;

  let target: URL;
  let base: URL;
  try {
    target = new URL(imageUrl);
    base = new URL(`${config.publicBaseUrl}/`);
  } catch {
    return null;
  }

  if (target.origin !== base.origin || target.search || target.hash) return null;
  if (!target.pathname.startsWith(base.pathname)) return null;

  let key: string;
  try {
    key = target.pathname.slice(base.pathname.length).split('/').map(decodeURIComponent).join('/');
  } catch {
    return null;
  }

  const segments = key.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return null;
  // Setelah root (jika ada), segmen pertama harus folder upload resmi dan harus ada nama file.
  const rootSegments = rootFolder ? rootFolder.split('/') : [];
  if (rootSegments.some((segment, index) => segments[index] !== segment)) return null;
  const [folder, ...fileSegments] = segments.slice(rootSegments.length);
  if (!STORAGE_FOLDERS.includes(folder as StorageFolder) || fileSegments.length === 0) return null;

  return key;
}
