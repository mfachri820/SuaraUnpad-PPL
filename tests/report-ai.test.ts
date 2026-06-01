import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performance } from 'perf_hooks';
import type { ReportCategory, ReportStatus } from '@prisma/client';

vi.mock('@/services/reportService', () => ({
  reportService: {
    createReport: vi.fn()
  }
}));

vi.mock('@/services/uploadService', () => ({
  uploadService: {
    deleteImageByUrl: vi.fn()
  }
}));

vi.mock('@/services/reportAiService', async () => {
  const actual = await vi.importActual<typeof import('../services/reportAiService')>(
    '../services/reportAiService'
  );
  return {
    ...actual,
    detectDamage: vi.fn()
  };
});

import { POST } from '@/app/api/reports/route';
import { reportService } from '@/services/reportService';
import { uploadService } from '@/services/uploadService';
import { detectDamage } from '@/services/reportAiService';

type ReportRecord = {
  status: ReportStatus;
  id: string;
  createdAt: Date;
  authorId: string;
  title: string;
  description: string;
  category: ReportCategory;
  location: string;
  imageUrl: string;
  upvoteCount: number;
  updatedAt: Date;
};

const mockedCreateReport = vi.mocked(reportService.createReport);
const mockedDeleteImage = vi.mocked(uploadService.deleteImageByUrl);
const mockedDetectDamage = vi.mocked(detectDamage);

function buildRequest(payload: Record<string, unknown>, userId = 'user-1') {
  return new Request('http://localhost/api/reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId
    },
    body: JSON.stringify(payload)
  });
}

describe('AI Report whitebox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { category: 'POTHOLE', aiType: 'pothole' },
    { category: 'CRACK', aiType: 'crack' },
    { category: 'CORROSION', aiType: 'korosi' },
    { category: 'SAMPAH', aiType: 'sampah' }
  ])('accepts report when AI approves for %s', async ({ category, aiType }) => {
    mockedDetectDamage.mockResolvedValue({
      status: 'success',
      model_used: 'mock',
      runtime_seconds: 0.1,
      has_detection: true,
      total_detections: 1,
      detections: [{ class: 'damage', confidence: 0.9, bbox: [0, 0, 10, 10] }]
    });

    mockedCreateReport.mockResolvedValue({
      id: 'report-1',
      title: 'Test',
      description: 'Desc',
      category,
      location: 'Location',
      imageUrl: 'https://example.com/image.jpg'
    } as ReportRecord);

    const response = await POST(
      buildRequest({
        title: 'Test',
        description: 'Desc',
        category,
        location: 'Location',
        imageUrl: 'https://example.com/image.jpg'
      })
    );

    expect(response.status).toBe(201);
    expect(mockedDetectDamage).toHaveBeenCalledWith('https://example.com/image.jpg', aiType);
    expect(mockedCreateReport).toHaveBeenCalledOnce();

    const body = await response.json();
    expect(body.status).toBe('success');
    expect(body.data.ai.decision).toBe('accept');
  });

  it('rejects report and deletes image when AI rejects', async () => {
    mockedDetectDamage.mockResolvedValue({
      status: 'success',
      model_used: 'mock',
      runtime_seconds: 0.1,
      has_detection: false,
      total_detections: 0,
      detections: []
    });

    const response = await POST(
      buildRequest({
        title: 'Test',
        description: 'Desc',
        category: 'POTHOLE',
        location: 'Location',
        imageUrl: 'https://example.com/image.jpg'
      })
    );

    expect(response.status).toBe(422);
    expect(mockedDeleteImage).toHaveBeenCalledWith('https://example.com/image.jpg');
    expect(mockedCreateReport).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.status).toBe('error');
    expect(body.message).toMatch(/Tidak ada kerusakan terdeteksi/i);
  });

  it('returns 401 when user is not authenticated', async () => {
    const response = await POST(
      buildRequest(
        {
          title: 'Test',
          description: 'Desc',
          category: 'POTHOLE',
          location: 'Location',
          imageUrl: 'https://example.com/image.jpg'
        },
        ''
      )
    );

    expect(response.status).toBe(401);
    expect(mockedDetectDamage).not.toHaveBeenCalled();
    expect(mockedCreateReport).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.status).toBe('error');
    expect(body.message).toMatch(/login terlebih dahulu/i);
  });

  it('returns 400 when category is invalid', async () => {
    const response = await POST(
      buildRequest({
        title: 'Test',
        description: 'Desc',
        category: 'INVALID',
        location: 'Location',
        imageUrl: 'https://example.com/image.jpg'
      })
    );

    expect(response.status).toBe(400);
    expect(mockedDetectDamage).not.toHaveBeenCalled();
    expect(mockedCreateReport).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.status).toBe('error');
    expect(body.message).toMatch(/Kategori tidak valid/i);
  });

  it('returns 502 and deletes image when AI service fails', async () => {
    mockedDetectDamage.mockRejectedValue(new Error('AI down'));

    const response = await POST(
      buildRequest({
        title: 'Test',
        description: 'Desc',
        category: 'POTHOLE',
        location: 'Location',
        imageUrl: 'https://example.com/image.jpg'
      })
    );

    expect(response.status).toBe(502);
    expect(mockedDeleteImage).toHaveBeenCalledWith('https://example.com/image.jpg');
    expect(mockedCreateReport).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.status).toBe('error');
    expect(body.message).toMatch(/AI down|Gagal memproses AI deteksi kerusakan/i);
  });

  it('completes AI report creation under 500ms', async () => {
    mockedDetectDamage.mockResolvedValue({
      status: 'success',
      model_used: 'mock',
      runtime_seconds: 0.1,
      has_detection: true,
      total_detections: 1,
      detections: [{ class: 'damage', confidence: 0.9, bbox: [0, 0, 10, 10] }]
    });

    mockedCreateReport.mockResolvedValue({
      id: 'report-2',
      title: 'Test',
      description: 'Desc',
      category: 'POTHOLE',
      location: 'Location',
      imageUrl: 'https://example.com/image.jpg'
    } as ReportRecord);

    const start = performance.now();
    const response = await POST(
      buildRequest({
        title: 'Test',
        description: 'Desc',
        category: 'POTHOLE',
        location: 'Location',
        imageUrl: 'https://example.com/image.jpg'
      })
    );
    const duration = performance.now() - start;

    expect(response.status).toBe(201);
    expect(duration).toBeLessThan(500);
  });
});
