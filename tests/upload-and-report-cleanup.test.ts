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
import { uploadService, extractPublicIdFromUrl } from '@/services/uploadService';
import { prisma } from '@/lib/prisma';
import type { ReportCategory } from '@prisma/client';

describe('Upload handler and report cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a .jpg file whose magic bytes do not match image/jpeg before uploading to Cloudinary', async () => {
    const invalidBuffer = Buffer.from('this-is-not-a-real-jpeg');
    const fakeFile = {
      name: 'fake.jpg',
      type: 'image/jpeg',
      size: invalidBuffer.length,
      arrayBuffer: async () => invalidBuffer.buffer,
    } as unknown as File;

    const uploadImageSpy = vi.spyOn(uploadService, 'uploadImage').mockResolvedValue('https://res.cloudinary.com/demo/image/upload/fake.jpg');

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
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/suara_unpad/reports/fake-image.jpg',
    };

    const deleteImageByUrlSpy = vi.spyOn(uploadService, 'deleteImageByUrl').mockResolvedValue({ result: 'ok' });
    const mockedReportCreate = prisma.report.create as unknown as ReturnType<typeof vi.fn>;
    mockedReportCreate.mockRejectedValueOnce(new Error('Database insertion failed'));

    await expect(reportService.createReport('user-1', payload as unknown as { title: string; description: string; category: ReportCategory; location: string; imageUrl: string; })).rejects.toThrow('Database insertion failed');
    expect(deleteImageByUrlSpy).toHaveBeenCalledOnce();
    expect(deleteImageByUrlSpy).toHaveBeenCalledWith(payload.imageUrl);
  });

  it('extracts the full Cloudinary public_id (folder included, version & extension removed)', () => {
    expect(
      extractPublicIdFromUrl('https://res.cloudinary.com/my-cloud/image/upload/v1712345678/suara_mipa/reports/abc123.jpg', 'my-cloud')
    ).toBe('suara_mipa/reports/abc123');
    expect(
      extractPublicIdFromUrl('https://res.cloudinary.com/my-cloud/image/upload/suara_unpad/general/file.name.png', 'my-cloud')
    ).toBe('suara_unpad/general/file.name');
  });

  it('refuses to touch assets that do not belong to our Cloudinary account', () => {
    expect(extractPublicIdFromUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg', 'my-cloud')).toBeNull();
    expect(extractPublicIdFromUrl('https://example.com/image.jpg', 'my-cloud')).toBeNull();
    expect(extractPublicIdFromUrl('bukan-url', 'my-cloud')).toBeNull();
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
