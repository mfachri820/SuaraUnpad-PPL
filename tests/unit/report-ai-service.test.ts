import { afterEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
vi.mock('@/lib/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage')>('@/lib/storage');
  return { ...actual, getS3Client: () => ({ send }) };
});

import { detectDamage } from '@/services/reportAiService';

const KEY = 'suara-mipa/reports/abc.png';
const okResult = { status: 'success', model_used: 'pothole', runtime_seconds: 0.4, has_detection: true, total_detections: 1, detections: [] };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  send.mockReset();
});

describe('detectDamage', () => {
  it('mode url: kirim temporary URL 10 menit (bucket tetap privat) ke AI_ENDPOINT', async () => {
    vi.stubEnv('AI_ENDPOINT', 'https://ai.test/predict');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(okResult), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(detectDamage(KEY, 'pothole')).resolves.toEqual(okResult);

    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toBe('https://ai.test/predict');
    const body = JSON.parse(init.body);
    expect(body.type).toBe('pothole');
    const imageUrl = new URL(body.image_url);
    expect(`${imageUrl.origin}${imageUrl.pathname}`).toBe(`https://storage.test/suara-mipa-test/${KEY}`);
    expect(imageUrl.searchParams.get('X-Amz-Expires')).toBe('600');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('mode file: ambil gambar dari MinIO lalu kirim multipart (AI tidak butuh akses storage)', async () => {
    vi.stubEnv('AI_ENDPOINT', 'https://ai.test/predict');
    vi.stubEnv('AI_INPUT_MODE', 'file');
    send.mockResolvedValue({
      ContentType: 'image/png',
      Body: { transformToByteArray: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(okResult), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await detectDamage(KEY, 'crack');

    expect(send.mock.calls[0][0].input).toEqual({ Bucket: 'suara-mipa-test', Key: KEY });
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('type')).toBe('crack');
    const file = form.get('file') as File;
    expect(file.name).toBe('abc.png');
    expect(file.type).toBe('image/png');
    expect(file.size).toBe(4);
  });

  it('timeout menghasilkan pesan yang jelas', async () => {
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeout));
    await expect(detectDamage(KEY, 'sampah')).rejects.toThrow('Layanan AI tidak merespons');
  });
});
