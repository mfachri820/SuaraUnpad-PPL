import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
//   AWS_URL                      base URL objek lewat proxy, sudah termasuk bucket
//                                (mis. https://svc.stg.unpad.ac.id/minio/<bucket>). Kosong = <endpoint>/<bucket>.
//   AWS_PRESIGN_ENDPOINT         (opsional) host yang dipakai saat menandatangani URL. Default = AWS_ENDPOINT.
//                                Hanya perlu untuk docker compose lokal (endpoint internal beda dengan host browser).
//   STORAGE_ROOT_FOLDER          prefix key opsional di dalam bucket. Kosong (default) = file langsung
//                                di <bucket>/<folder>/..., karena bucket sudah khusus app & per environment.
//   STORAGE_URL_TTL_HOURS        (opsional) masa berlaku URL bertanda tangan, default 24 jam
//
// Bucket PRIVAT: database menyimpan object key (mis. reports/<uuid>.png),
// lalu setiap kali dikirim ke frontend key diubah jadi presigned URL (temporary URL).

/** Folder upload yang diizinkan, langsung di bawah root (atau di bawah bucket jika root kosong). */
export const STORAGE_FOLDERS = ['general', 'avatars', 'posts', 'reports', 'announcements'] as const;
export type StorageFolder = (typeof STORAGE_FOLDERS)[number];

export interface StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  forcePathStyle: boolean;
  publicBaseUrl: string;
  /** Endpoint yang dipakai untuk menandatangani URL (default = endpoint). */
  presignEndpoint?: string;
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
    publicBaseUrl,
    presignEndpoint: process.env.AWS_PRESIGN_ENDPOINT?.trim() || endpoint
  };
}

export function getStorageRootFolder() {
  return trimSlashes(process.env.STORAGE_ROOT_FOLDER?.trim() ?? '');
}

/** Object key prefix untuk sebuah folder upload, mis. "reports" atau "<root>/reports". */
export function storageFolderPrefix(folder: StorageFolder, rootFolder: string = getStorageRootFolder()) {
  return rootFolder ? `${rootFolder}/${folder}` : folder;
}

/**
 * True jika key adalah file hasil upload app: <root>/<folder resmi>/<nama file>
 * (atau <folder resmi>/<nama file> jika root kosong).
 */
export function isUploadedKey(key: string, rootFolder: string = getStorageRootFolder()) {
  const segments = key.split('/');
  const rootSegments = rootFolder ? rootFolder.split('/') : [];
  if (rootSegments.some((segment, index) => segments[index] !== segment)) return false;
  const [folder, ...fileSegments] = segments.slice(rootSegments.length);
  return STORAGE_FOLDERS.includes(folder as StorageFolder) && fileSegments.length > 0;
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
 * dan berada di bawah STORAGE_ROOT_FOLDER. URL lain (eksternal, bucket lain, path traversal)
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

  if (!isSafeKey(key) || !isUploadedKey(key, rootFolder)) return null;

  return key;
}

// ---------------------------------------------------------------------------
// Object key <-> nilai yang disimpan / dikirim
// ---------------------------------------------------------------------------

// Parameter yang ditambahkan AWS SDK ke presigned URL (X-Amz-Signature, X-Amz-Date, x-id, ...).
const SIGNATURE_PARAM = /^(?:x-amz-.+|x-id)$/i;

function isSafeKey(key: string) {
  const segments = key.split('/');
  return key.length > 0 && !segments.some((segment) => segment === '' || segment === '.' || segment === '..');
}

/** Base URL yang dianggap "milik" bucket ini: AWS_URL (proxy) dan <endpoint>/<bucket>. */
function ownBaseUrls(config: StorageConfig): string[] {
  const bases = new Set<string>();
  if (config.publicBaseUrl) bases.add(config.publicBaseUrl);
  for (const endpoint of [config.endpoint, config.presignEndpoint]) {
    if (endpoint && config.bucket) bases.add(`${trimTrailingSlash(endpoint)}/${config.bucket}`);
  }
  return [...bases];
}

/**
 * Ambil object key dari nilai yang disimpan di DB atau dikirim frontend:
 *  - key polos            "suara-mipa/staging/reports/x.png"
 *  - URL lama (data lama)  "https://svc.../minio/<bucket>/suara-mipa/..."
 *  - URL bertanda tangan   "...x.png?X-Amz-Signature=..." (yang diterima frontend dari API)
 * Hasil null = bukan objek bucket ini (mis. URL eksternal).
 */
export function storageKeyFrom(value: string, config: StorageConfig = getStorageConfig()): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!/^[a-z][a-z\d+.-]*:/i.test(trimmed)) {
    const key = trimSlashes(trimmed);
    return isSafeKey(key) ? key : null;
  }

  // new URL() menormalkan "/../", jadi segmen titik ditolak sebelum di-parse.
  if (/\/\.{1,2}(?=[/?#]|$)/.test(trimmed)) return null;

  let target: URL;
  try {
    target = new URL(trimmed);
  } catch {
    return null;
  }
  if (target.hash) return null;
  // Query hanya boleh berisi parameter tanda tangan S3 (dari presigned URL).
  for (const name of target.searchParams.keys()) {
    if (!SIGNATURE_PARAM.test(name)) return null;
  }

  for (const baseUrl of ownBaseUrls(config)) {
    let base: URL;
    try {
      base = new URL(`${baseUrl}/`);
    } catch {
      continue;
    }
    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) continue;
    try {
      const key = target.pathname.slice(base.pathname.length).split('/').map(decodeURIComponent).join('/');
      return isSafeKey(key) ? key : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Untuk input user: key harus milik bucket ini DAN berada di salah satu folder upload resmi. */
export function uploadedKeyFrom(
  value: string,
  config: StorageConfig = getStorageConfig(),
  rootFolder: string = getStorageRootFolder()
): string | null {
  const key = storageKeyFrom(value, config);
  return key && isUploadedKey(key, rootFolder) ? key : null;
}

// ---------------------------------------------------------------------------
// Presigned URL (temporary URL)
// ---------------------------------------------------------------------------

const HOUR_MS = 60 * 60 * 1000;

function urlTtlSeconds() {
  const hours = Number(process.env.STORAGE_URL_TTL_HOURS);
  const safeHours = Number.isFinite(hours) && hours >= 1 && hours <= 167 ? hours : 24;
  return Math.round(safeHours * 3600);
}

let presignClient: S3Client | undefined;
let presignClientKey: string | undefined;

function getPresignClient(config: StorageConfig) {
  const cacheKey = `${config.presignEndpoint}|${config.region}|${config.forcePathStyle}`;
  if (!presignClient || presignClientKey !== cacheKey) {
    presignClient = new S3Client({
      endpoint: config.presignEndpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      // Tanpa parameter x-amz-checksum-mode di URL: cukup URL GET biasa seperti di Prabu.
      responseChecksumValidation: 'WHEN_REQUIRED',
      requestChecksumCalculation: 'WHEN_REQUIRED'
    });
    presignClientKey = cacheKey;
  }
  return presignClient;
}

/**
 * Buat temporary URL untuk satu object key.
 *
 * - Penandatanganan dihitung lokal (HMAC), TIDAK ada request ke MinIO.
 * - Waktu tanda tangan dibulatkan ke awal jam, jadi URL untuk gambar yang sama identik
 *   selama 1 jam (di semua pod) dan bisa di-cache browser. Masa berlaku dihitung dari
 *   awal jam tsb, sehingga sisa berlaku minimal TTL - 1 jam.
 * - Sama seperti Sertifikat di Prabu: ditandatangani ke host MinIO asli, lalu base-nya
 *   diganti ke AWS_URL (proxy svc). Proxy meneruskan ke MinIO dengan host asli, jadi
 *   signature tetap valid.
 */
export async function signedUrlForKey(
  key: string,
  options: { ttlSeconds?: number; now?: number; roundToHour?: boolean } = {},
  config: StorageConfig = getStorageConfig()
): Promise<string> {
  if (!config.bucket || !config.presignEndpoint) {
    throw new Error('Storage belum dikonfigurasi: AWS_BUCKET / AWS_ENDPOINT kosong.');
  }
  const now = options.now ?? Date.now();
  const signingDate = options.roundToHour === false ? new Date(now) : new Date(Math.floor(now / HOUR_MS) * HOUR_MS);
  const presigned = await getSignedUrl(
    getPresignClient(config),
    new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    { expiresIn: options.ttlSeconds ?? urlTtlSeconds(), signingDate }
  );

  const signedBase = `${trimTrailingSlash(config.presignEndpoint)}/${config.bucket}`;
  if (!config.publicBaseUrl || config.publicBaseUrl === signedBase || !presigned.startsWith(`${signedBase}/`)) {
    return presigned;
  }
  return `${config.publicBaseUrl}${presigned.slice(signedBase.length)}`;
}

/**
 * Ubah nilai gambar dari DB menjadi URL yang bisa dibuka browser.
 * Key / URL lama milik bucket ini -> presigned URL. URL eksternal (mis. gambar demo seed) -> apa adanya.
 */
export async function displayUrlFor(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const config = getStorageConfig();
  const key = storageKeyFrom(value, config);
  if (!key) return value;
  try {
    return await signedUrlForKey(key, {}, config);
  } catch (error) {
    console.error('[storage] Gagal membuat temporary URL:', error);
    return null;
  }
}

const IMAGE_FIELDS = new Set(['imageUrl', 'avatarUrl']);

/**
 * Telusuri payload response dan ganti semua field imageUrl / avatarUrl dengan temporary URL.
 * Dipakai di successResponse, jadi semua endpoint otomatis aman tanpa perlu diubah satu-satu.
 */
export async function signImageFields<T>(payload: T): Promise<T> {
  const seen = new WeakSet<object>();

  async function visit(node: unknown): Promise<unknown> {
    if (node === null || typeof node !== 'object') return node;
    if (node instanceof Date) return node;
    if (seen.has(node)) return node;
    seen.add(node);

    if (Array.isArray(node)) {
      return Promise.all(node.map(visit));
    }

    const entries = await Promise.all(
      Object.entries(node as Record<string, unknown>).map(async ([field, value]) => {
        if (IMAGE_FIELDS.has(field) && typeof value === 'string') {
          return [field, await displayUrlFor(value)] as const;
        }
        return [field, await visit(value)] as const;
      })
    );
    return Object.fromEntries(entries);
  }

  return (await visit(payload)) as T;
}
