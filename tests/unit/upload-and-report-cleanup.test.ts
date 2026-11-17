import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    report: {
      create: vi.fn(),
    },
  },
}));

import { POST as uploadRoutePOST } from '@/app/api/uploads/route';
import { reportService } from '@/services/reportService';
import { uploadService } from '@/services/uploadService';
import { keyFromPublicUrl, storageFolderPrefix, type StorageConfig } from '@/lib/storage';
import { prisma } from '@/lib/prisma';
import type { ReportCategory } from '@prisma/client';

describe('Upload handler and report cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a .jpg file whose magic bytes do not match image/jpeg before uploading to storage', async () => {
    const invalidBuffer = Buffer.from('this-is-not-a-real-jpeg');
    const fakeFile = {
      name: 'fake.jpg',
      type: 'image/jpeg',
      size: invalidBuffer.length,
      arrayBuffer: async () => invalidBuffer.buffer,
    } as unknown as File;

    const uploadImageSpy = vi.spyOn(uploadService, 'uploadImage').mockResolvedValue('https://svc.unpad.ac.id/minio/suara/suara-mipa/general/fake.jpg');

    const request = {
      headers: new Headers({ 'x-user-id': 'user-1', 'x-user-role': 'STUDENT' }),
      formData: async () => ({ get: (key: string) => (key === 'file' ? fakeFile : null) }),
    } as unknown as Request;

    const response = await uploadRoutePOST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ status: 'error', message: 'Konten file tidak valid. Pastikan file benar-benar gambar.' });
    expect(uploadImageSpy).not.toHaveBeenCalled();
  });

  it('calls deleteImageByUrl when report creation fails after an uploaded image URL is provided', async () => {
    const payload: { title: string; description: string; category: ReportCategory; location: string; imageUrl: string } = {
      title: 'Test Report',
      description: 'Desc',
      category: 'POTHOLE',
      location: 'Gedung A',
      imageUrl: 'https://svc.unpad.ac.id/minio/suara/suara-mipa/reports/fake-image.jpg',
    };

    const deleteImageByUrlSpy = vi.spyOn(uploadService, 'deleteImageByUrl').mockResolvedValue({ result: 'ok' });
    const mockedReportCreate = prisma.report.create as unknown as ReturnType<typeof vi.fn>;
    mockedReportCreate.mockRejectedValueOnce(new Error('Database insertion failed'));

    await expect(reportService.createReport('user-1', payload as unknown as { title: string; description: string; category: ReportCategory; location: string; imageUrl: string; })).rejects.toThrow('Database insertion failed');
    expect(deleteImageByUrlSpy).toHaveBeenCalledOnce();
    expect(deleteImageByUrlSpy).toHaveBeenCalledWith(payload.imageUrl);
  });

  const storage: StorageConfig = {
    endpoint: 'https://nodes.minio.unpad.dev',
    region: 'id-dipatiukur-1',
    bucket: 'suara',
    forcePathStyle: true,
    publicBaseUrl: 'https://svc.unpad.ac.id/minio/suara'
  };

  it('maps a public storage URL back to its object key (root folder included)', () => {
    expect(keyFromPublicUrl('https://svc.unpad.ac.id/minio/suara/suara-mipa/reports/abc123.jpg', storage, 'suara-mipa')).toBe(
      'suara-mipa/reports/abc123.jpg'
    );
    expect(keyFromPublicUrl('https://svc.unpad.ac.id/minio/suara/suara-mipa/general/file%20name.png', storage, 'suara-mipa')).toBe(
      'suara-mipa/general/file name.png'
    );
  });

  it('refuses URLs that do not belong to our bucket or root folder', () => {
    const cases = [
      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      'https://svc.unpad.ac.id/minio/other-bucket/suara-mipa/a.jpg',
      'https://svc.unpad.ac.id/minio/suara/app-lain/a.jpg',
      'https://svc.unpad.ac.id/minio/suara/suara-mipa/../secret.jpg',
      'https://svc.unpad.ac.id/minio/suara/suara-mipa/a.jpg?X-Amz-Signature=1',
      'http://svc.unpad.ac.id/minio/suara/suara-mipa/a.jpg',
      'bukan-url'
    ];
    for (const url of cases) expect(keyFromPublicUrl(url, storage, 'suara-mipa'), url).toBeNull();
  });

  it('without a root folder, maps <bucket>/<folder>/<file> straight to the key', () => {
    expect(keyFromPublicUrl('https://svc.unpad.ac.id/minio/suara/reports/abc123.jpg', storage, '')).toBe('reports/abc123.jpg');
    expect(keyFromPublicUrl('https://svc.unpad.ac.id/minio/suara/avatars/x.png', storage, '')).toBe('avatars/x.png');
    expect(storageFolderPrefix('reports', '')).toBe('reports');
    expect(storageFolderPrefix('reports', 'suara-mipa')).toBe('suara-mipa/reports');
  });

  it('without a root folder, still refuses unknown folders, bare files and foreign URLs', () => {
    const cases = [
      'https://svc.unpad.ac.id/minio/suara/a.jpg',
      'https://svc.unpad.ac.id/minio/suara/reports',
      'https://svc.unpad.ac.id/minio/suara/rahasia/a.jpg',
      'https://svc.unpad.ac.id/minio/suara/suara-mipa/staging/general/old.png',
      'https://svc.unpad.ac.id/minio/suara/reports/../secret.jpg',
      'https://svc.unpad.ac.id/minio/other-bucket/reports/a.jpg',
      'https://res.cloudinary.com/demo/image/upload/reports/sample.jpg'
    ];
    for (const url of cases) expect(keyFromPublicUrl(url, storage, ''), url).toBeNull();
  });

  it('rejects upload folders outside the allowlist', async () => {
    const request = {
      headers: new Headers({ 'x-user-id': 'user-1', 'x-user-role': 'STUDENT' }),
      formData: async () => ({
        get: (key: string) =>
          key === 'file' ? ({ name: 'a.jpg', type: 'image/jpeg', size: 10 } as unknown as File) : key === 'folder' ? '../../etc' : null,
      }),
    } as unknown as Request;

    const response = await uploadRoutePOST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toMatch(/Folder tidak valid/);
  });
});
