import { describe, expect, it } from 'vitest';
import {
  displayUrlFor,
  signImageFields,
  signedUrlForKey,
  storageKeyFrom,
  uploadedKeyFrom,
  type StorageConfig
} from '@/lib/storage';
import { storageImageUrl } from '@/lib/validation';

// Env tes (vitest.config.ts): AWS_URL=https://storage.test/suara-mipa-test,
// AWS_ENDPOINT=https://s3.storage.test, AWS_BUCKET=suara-mipa-test, STORAGE_ROOT_FOLDER=suara-mipa.
const BASE = 'https://storage.test/suara-mipa-test';
const KEY = 'suara-mipa/reports/abc.png';

const platform: StorageConfig = {
  endpoint: 'https://nodes.minio.unpad.dev',
  presignEndpoint: 'https://nodes.minio.unpad.dev',
  region: 'id-dipatiukur-1',
  bucket: 'stg-suaraunpad-ppl-storage',
  forcePathStyle: true,
  publicBaseUrl: 'https://svc.stg.unpad.ac.id/minio/stg-suaraunpad-ppl-storage'
};

describe('storageKeyFrom / uploadedKeyFrom', () => {
  it('menerima key polos, URL proxy, URL endpoint langsung, dan URL bertanda tangan', () => {
    expect(storageKeyFrom(KEY)).toBe(KEY);
    expect(storageKeyFrom(`${BASE}/${KEY}`)).toBe(KEY);
    expect(storageKeyFrom(`https://s3.storage.test/suara-mipa-test/${KEY}`)).toBe(KEY);
    expect(storageKeyFrom(`${BASE}/${KEY}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc`)).toBe(KEY);
    expect(storageKeyFrom(`${BASE}/suara-mipa/general/file%20name.png`)).toBe('suara-mipa/general/file name.png');
  });

  it('menolak URL eksternal, query non-signature, dan path traversal', () => {
    for (const value of [
      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      'https://storage.test/bucket-lain/suara-mipa/a.png',
      `${BASE}/${KEY}?foo=bar`,
      `${BASE}/${KEY}#x`,
      `${BASE}/suara-mipa/../rahasia.png`,
      'suara-mipa/../rahasia.png',
      'javascript:alert(1)',
      ''
    ]) {
      expect(storageKeyFrom(value), value).toBeNull();
    }
  });

  it('input user wajib berada di bawah STORAGE_ROOT_FOLDER', () => {
    expect(uploadedKeyFrom(`${BASE}/${KEY}`)).toBe(KEY);
    expect(uploadedKeyFrom('reports/abc.png')).toBeNull();
    expect(uploadedKeyFrom(`${BASE}/app-lain/abc.png`)).toBeNull();
  });

  it('skema validasi gambar mengubah URL upload (termasuk yang bertanda tangan) menjadi key', () => {
    expect(storageImageUrl.parse(`${BASE}/${KEY}?X-Amz-Signature=abc`)).toBe(KEY);
    expect(storageImageUrl.safeParse('https://example.com/a.jpg').success).toBe(false);
  });
});

describe('signedUrlForKey', () => {
  const now = Date.UTC(2026, 10, 23, 10, 17, 5);

  it('menandatangani ke host MinIO lalu mengganti base ke proxy (pola Sertifikat Prabu)', async () => {
    const url = new URL(await signedUrlForKey('suara-mipa/staging/reports/x.png', { now }, platform));
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://svc.stg.unpad.ac.id/minio/stg-suaraunpad-ppl-storage/suara-mipa/staging/reports/x.png'
    );
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('86400');
    expect(url.searchParams.get('X-Amz-Date')).toBe('20261123T100000Z');
  });

  it('URL identik selama satu jam (bisa di-cache browser), berganti di jam berikutnya', async () => {
    const a = await signedUrlForKey(KEY, { now });
    const b = await signedUrlForKey(KEY, { now: now + 30 * 60 * 1000 });
    const c = await signedUrlForKey(KEY, { now: now + 60 * 60 * 1000 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('URL bertanda tangan yang dikirim balik frontend tetap terbaca sebagai key', async () => {
    const signed = await signedUrlForKey(KEY, { now });
    expect(storageKeyFrom(signed)).toBe(KEY);
    expect(uploadedKeyFrom(signed)).toBe(KEY);
    expect(storageImageUrl.parse(signed)).toBe(KEY);
  });

  it('URL singkat untuk AI tidak dibulatkan', async () => {
    const url = new URL(await signedUrlForKey(KEY, { now, ttlSeconds: 600, roundToHour: false }));
    expect(url.searchParams.get('X-Amz-Expires')).toBe('600');
    expect(url.searchParams.get('X-Amz-Date')).toBe('20261123T101705Z');
  });
});

describe('response API', () => {
  it('displayUrlFor: key & URL lama ditandatangani, URL eksternal dibiarkan', async () => {
    expect(await displayUrlFor(null)).toBeNull();
    expect(await displayUrlFor('https://res.cloudinary.com/demo/sample.jpg')).toBe('https://res.cloudinary.com/demo/sample.jpg');
    expect(await displayUrlFor(KEY)).toMatch(new RegExp(`^${BASE}/${KEY}\\?X-Amz-`));
    expect(await displayUrlFor(`${BASE}/${KEY}`)).toMatch(new RegExp(`^${BASE}/${KEY}\\?X-Amz-`));
  });

  it('signImageFields mengganti imageUrl/avatarUrl di semua kedalaman dan tidak menyentuh field lain', async () => {
    const createdAt = new Date('2026-11-23T00:00:00Z');
    const payload = {
      data: [
        { id: '1', imageUrl: KEY, createdAt, author: { name: 'A', avatarUrl: `${BASE}/suara-mipa/avatars/a.png` } },
        { id: '2', imageUrl: null, author: { name: 'B', avatarUrl: null } }
      ],
      meta: { totalItems: 2, url: KEY }
    };

    const result = await signImageFields(payload);
    expect(result.data[0].imageUrl).toMatch(/\?X-Amz-Signature=|&X-Amz-Signature=/);
    expect(result.data[0].author.avatarUrl).toMatch(/X-Amz-Signature=/);
    expect(result.data[0].createdAt).toBe(createdAt);
    expect(result.data[1].imageUrl).toBeNull();
    expect(result.data[1].author.avatarUrl).toBeNull();
    expect(result.meta).toEqual({ totalItems: 2, url: KEY });
    // payload asli tidak diubah (yang ada di DB tetap key)
    expect(payload.data[0].imageUrl).toBe(KEY);
  });
});
