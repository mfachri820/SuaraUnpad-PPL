import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

import { POST } from '@/app/api/reports/route';
import { reportService } from '@/services/reportService';
import { uploadService } from '@/services/uploadService';

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
  verifiedAt: Date | null;
  inProgressAt: Date | null;
  resolvedAt: Date | null;
};

type TextLabel = 'SAMPAH' | 'LUBANG' | 'KARATAN' | 'RETAKAN';
type CvType = 'pothole' | 'crack' | 'korosi' | 'sampah';

// URL harus milik storage aplikasi (lihat AWS_URL di vitest.config.ts)
const IMAGE_URL = 'https://storage.test/suara-mipa-test/suara-mipa/reports/image.jpg';
const TEXT_AI_HOST = 'ai-labelling-tool.streamlit.app';
const CV_AI_HOST = 'unagisupreme-ai-objectdamagedetection.hf.space';

const mockedCreateReport = vi.mocked(reportService.createReport);
const mockedDeleteImage = vi.mocked(uploadService.deleteImageByUrl);
const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/**
 * Memalsukan kedua API AI:
 * - text: label IndoBERT beserta probabilitasnya (label < 0.5 tidak dikembalikan)
 * - cv: confidence tertinggi per tipe CV (0 / tidak ada = tidak terdeteksi), atau 'error'
 */
function mockAi({
  text = {},
  cv = {},
  textDown = false
}: {
  text?: Partial<Record<TextLabel, number>>;
  cv?: Partial<Record<CvType, number | 'error'>>;
  textDown?: boolean;
}) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    if (url.includes(TEXT_AI_HOST)) {
      if (textDown) throw new Error('streamlit sleeping');
      const probabilities = { SAMPAH: 0, LUBANG: 0, KARATAN: 0, RETAKAN: 0, ...text };
      const labels = Object.entries(probabilities).filter(([, p]) => p >= 0.5).map(([label]) => label);
      return jsonResponse({ labels, probabilities, threshold: 0.5 });
    }
    if (url.includes(CV_AI_HOST)) {
      const result = cv[body.type as CvType];
      if (result === 'error') return jsonResponse({ detail: 'model crashed' }, 500);
      const confidence = result ?? 0;
      return jsonResponse({
        status: 'success',
        model_used: body.type,
        runtime_seconds: 0.1,
        has_detection: confidence > 0,
        total_detections: confidence > 0 ? 1 : 0,
        detections: confidence > 0 ? [{ class: body.type, confidence, bbox: [0, 0, 10, 10] }] : []
      });
    }
    throw new Error(`Unexpected fetch ${url}`);
  });
}

function cvCalls() {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).includes(CV_AI_HOST))
    .map(([, init]) => JSON.parse(String(init.body)).type as CvType);
}

function textCalls() {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).includes(TEXT_AI_HOST))
    .map(([, init]) => JSON.parse(String(init.body)).text as string);
}

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

const basePayload = {
  title: 'Jalan berlubang',
  description: 'Lubang besar di depan gedung',
  location: 'Gedung D',
  imageUrl: IMAGE_URL
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mockedCreateReport.mockImplementation(async (_authorId, data) => ({
    id: 'report-1',
    ...data
  }) as unknown as ReportRecord);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/reports — kategori otomatis dari judul + cek foto', () => {
  it.each([
    { label: 'LUBANG', cvType: 'pothole', category: 'POTHOLE' },
    { label: 'RETAKAN', cvType: 'crack', category: 'CRACK' },
    { label: 'KARATAN', cvType: 'korosi', category: 'CORROSION' },
    { label: 'SAMPAH', cvType: 'sampah', category: 'SAMPAH' }
  ] as const)('label $label -> CV $cvType -> kategori $category', async ({ label, cvType, category }) => {
    mockAi({ text: { [label]: 0.95 }, cv: { [cvType]: 0.9 } });

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(201);
    expect(cvCalls()).toEqual([cvType]);
    expect(mockedCreateReport).toHaveBeenCalledWith('user-1', expect.objectContaining({ category }));
    const body = await response.json();
    expect(body.data.ai.decision).toBe('accept');
    expect(body.data.report.category).toBe(category);
  });

  it('hanya membaca judul untuk klasifikasi teks', async () => {
    mockAi({ text: { LUBANG: 0.95 }, cv: { pothole: 0.9 } });

    await POST(buildRequest({ ...basePayload, title: '  Jalan berlubang  ' }));

    expect(textCalls()).toEqual(['Jalan berlubang']);
  });

  it('mengabaikan kategori yang dikirim user', async () => {
    mockAi({ text: { LUBANG: 0.95 }, cv: { pothole: 0.9 } });

    const response = await POST(buildRequest({ ...basePayload, category: 'SAMPAH' }));

    expect(response.status).toBe(201);
    expect(mockedCreateReport).toHaveBeenCalledWith('user-1', expect.objectContaining({ category: 'POTHOLE' }));
  });

  it('judul tidak dikenali -> OTHER dan CV dilewati', async () => {
    mockAi({ text: {} });

    const response = await POST(buildRequest({ ...basePayload, title: 'AC kelas bocor' }));

    expect(response.status).toBe(201);
    expect(cvCalls()).toEqual([]);
    expect(mockedCreateReport).toHaveBeenCalledWith('user-1', expect.objectContaining({ category: 'OTHER' }));
    const body = await response.json();
    expect(body.data.ai).toBeNull();
  });

  it('AI teks tidak tersedia -> OTHER dan CV dilewati', async () => {
    mockAi({ textDown: true });

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(201);
    expect(cvCalls()).toEqual([]);
    expect(mockedCreateReport).toHaveBeenCalledWith('user-1', expect.objectContaining({ category: 'OTHER' }));
  });

  it('banyak label -> CV dicek per label, kategori = skor teks tertinggi yang lolos CV', async () => {
    mockAi({ text: { SAMPAH: 0.99, LUBANG: 0.9 }, cv: { sampah: 0, pothole: 0.8 } });

    const response = await POST(buildRequest({ ...basePayload, title: 'Jalan berlubang dan banyak sampah' }));

    expect(response.status).toBe(201);
    expect(cvCalls().sort()).toEqual(['pothole', 'sampah']);
    expect(mockedCreateReport).toHaveBeenCalledWith('user-1', expect.objectContaining({ category: 'POTHOLE' }));
    const body = await response.json();
    expect(body.data.labels.map((l: { category: string }) => l.category)).toEqual(['SAMPAH', 'POTHOLE']);
  });

  it('banyak label dan semuanya lolos CV -> pakai skor teks tertinggi', async () => {
    mockAi({ text: { SAMPAH: 0.99, LUBANG: 0.9 }, cv: { sampah: 0.7, pothole: 0.9 } });

    await POST(buildRequest(basePayload));

    expect(mockedCreateReport).toHaveBeenCalledWith('user-1', expect.objectContaining({ category: 'SAMPAH' }));
  });

  it('foto tidak cocok dengan label manapun -> 422 dan foto dihapus', async () => {
    mockAi({ text: { LUBANG: 0.95 }, cv: { pothole: 0 } });

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(422);
    expect(mockedDeleteImage).toHaveBeenCalledWith(IMAGE_URL);
    expect(mockedCreateReport).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body.message).toMatch(/Tidak ada kerusakan terdeteksi/i);
  });

  it('confidence CV rendah -> laporan diterima dengan peringatan', async () => {
    mockAi({ text: { LUBANG: 0.95 }, cv: { pothole: 0.4 } });

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.ai.decision).toBe('warn');
    expect(body.message).toMatch(/Foto kurang jelas/i);
  });

  it('CV error -> 502 dan foto dihapus', async () => {
    mockAi({ text: { LUBANG: 0.95 }, cv: { pothole: 'error' } });

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(502);
    expect(mockedDeleteImage).toHaveBeenCalledWith(IMAGE_URL);
    expect(mockedCreateReport).not.toHaveBeenCalled();
  });

  it('401 jika belum login', async () => {
    const response = await POST(buildRequest(basePayload, ''));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedCreateReport).not.toHaveBeenCalled();
  });

  it('400 jika data tidak lengkap (tanpa perlu kategori)', async () => {
    const response = await POST(buildRequest({ ...basePayload, title: '   ' }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body.message).not.toMatch(/category/);
  });

  it('400 untuk URL gambar di luar storage aplikasi tanpa memanggil AI', async () => {
    const response = await POST(buildRequest({ ...basePayload, imageUrl: 'https://evil.example/tracker.jpg' }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedCreateReport).not.toHaveBeenCalled();
  });

  it('pembuatan laporan dengan AI (mock) selesai di bawah 500ms', async () => {
    mockAi({ text: { LUBANG: 0.95 }, cv: { pothole: 0.9 } });

    const start = performance.now();
    const response = await POST(buildRequest(basePayload));
    const duration = performance.now() - start;

    expect(response.status).toBe(201);
    expect(duration).toBeLessThan(500);
  });
});
