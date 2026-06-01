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
import { prisma } from '@/lib/prisma';

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
      headers: new Headers({ 'x-user-id': 'user-1' }),
      formData: async () => ({ get: (key: string) => (key === 'file' ? fakeFile : null) }),
    } as unknown as Request;

    const response = await uploadRoutePOST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ status: 'error', message: 'Konten file tidak valid. Pastikan file benar-benar gambar.' });
    expect(uploadImageSpy).not.toHaveBeenCalled();
  });

  it('calls deleteImageByUrl when report creation fails after an uploaded image URL is provided', async () => {
    const payload = {
      title: 'Test Report',
      description: 'Desc',
      category: 'POTHOLE',
      location: 'Gedung A',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/suara_unpad/reports/fake-image.jpg',
    };

    const deleteImageByUrlSpy = vi.spyOn(uploadService, 'deleteImageByUrl').mockResolvedValue(undefined);
    const mockedReportCreate = prisma.report.create as unknown as ReturnType<typeof vi.fn>;
    mockedReportCreate.mockRejectedValueOnce(new Error('Database insertion failed'));

    await expect(reportService.createReport('user-1', payload as unknown as { title: string; description: string; category: string; location: string; imageUrl: string; })).rejects.toThrow('Database insertion failed');
    expect(deleteImageByUrlSpy).toHaveBeenCalledOnce();
    expect(deleteImageByUrlSpy).toHaveBeenCalledWith(payload.imageUrl);
  });
});