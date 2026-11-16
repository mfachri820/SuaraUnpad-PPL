import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  predictReportLabels,
  toCategorySuggestion,
  TEXT_AI_MAX_LENGTH
} from '@/services/reportAiService';
import { POST } from '@/app/api/reports/classify/route';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function buildRequest(body: unknown, userId = 'user-1') {
  return new Request('http://localhost/api/reports/classify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId && { 'x-user-id': userId })
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('toCategorySuggestion', () => {
  it('maps IndoBERT labels to report categories, highest probability first', () => {
    const suggestion = toCategorySuggestion({
      labels: ['LUBANG', 'SAMPAH'],
      probabilities: { SAMPAH: 0.99, LUBANG: 0.9, KARATAN: 0.001, RETAKAN: 0.0007 },
      threshold: 0.5
    });

    expect(suggestion.suggestedCategory).toBe('SAMPAH');
    expect(suggestion.matches).toEqual([
      { category: 'SAMPAH', probability: 0.99 },
      { category: 'POTHOLE', probability: 0.9 }
    ]);
  });

  it.each([
    ['LUBANG', 'POTHOLE'],
    ['RETAKAN', 'CRACK'],
    ['KARATAN', 'CORROSION'],
    ['SAMPAH', 'SAMPAH']
  ])('maps %s to %s', (label, category) => {
    const suggestion = toCategorySuggestion({
      labels: [label],
      probabilities: { [label]: 0.8 },
      threshold: 0.5
    });
    expect(suggestion.suggestedCategory).toBe(category);
  });

  it('returns no suggestion when no label passes the threshold', () => {
    const suggestion = toCategorySuggestion({
      labels: [],
      probabilities: { SAMPAH: 0.1, LUBANG: 0.2, KARATAN: 0.05, RETAKAN: 0.01 },
      threshold: 0.5
    });
    expect(suggestion).toEqual({ suggestedCategory: null, matches: [] });
  });

  it('ignores unknown labels', () => {
    const suggestion = toCategorySuggestion({
      labels: ['BANJIR'],
      probabilities: { BANJIR: 0.9 },
      threshold: 0.5
    });
    expect(suggestion.suggestedCategory).toBeNull();
  });
});

describe('predictReportLabels', () => {
  it('posts text and threshold to the default Streamlit endpoint', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ labels: ['SAMPAH'], probabilities: { SAMPAH: 0.9 }, threshold: 0.5 })
    );

    const result = await predictReportLabels('banyak sampah di depan gedung');

    expect(result.labels).toEqual(['SAMPAH']);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://ai-labelling-tool.streamlit.app/~/+/predict');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ text: 'banyak sampah di depan gedung', threshold: 0.5 });
  });

  it('uses REPORT_TEXT_AI_URL when set', async () => {
    vi.stubEnv('REPORT_TEXT_AI_URL', 'http://localhost:8501/~/+/predict');
    fetchMock.mockResolvedValue(jsonResponse({ labels: [], probabilities: {}, threshold: 0.5 }));

    await predictReportLabels('teks');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8501/~/+/predict');
  });

  it('throws when the AI returns an error status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'invalid' }, 422));
    await expect(predictReportLabels('x')).rejects.toThrow(/status 422/);
  });

  it('throws when the AI returns a malformed body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ foo: 'bar' }));
    await expect(predictReportLabels('x')).rejects.toThrow(/tidak valid/);
  });
});

describe('POST /api/reports/classify', () => {
  it('returns the category suggestion', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        labels: ['SAMPAH', 'LUBANG'],
        probabilities: { SAMPAH: 0.99, LUBANG: 0.9, KARATAN: 0.001, RETAKAN: 0.0007 },
        threshold: 0.5
      })
    );

    const response = await POST(buildRequest({ text: '  jalan berlubang dan banyak sampah  ' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.suggestedCategory).toBe('SAMPAH');
    expect(body.data.matches).toHaveLength(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toBe('jalan berlubang dan banyak sampah');
  });

  it('returns 401 without a logged-in user', async () => {
    const response = await POST(buildRequest({ text: 'jalan berlubang' }, ''));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['empty text', { text: '   ' }],
    ['missing text', {}],
    ['non-string text', { text: 123 }],
    ['too long text', { text: 'a'.repeat(TEXT_AI_MAX_LENGTH + 1) }]
  ])('returns 400 for %s', async (_name, payload) => {
    const response = await POST(buildRequest(payload));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    const response = await POST(buildRequest('{not json'));
    expect(response.status).toBe(400);
  });

  it('returns 503 when the AI is unavailable', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));

    const response = await POST(buildRequest({ text: 'jalan berlubang' }));

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.message).toMatch(/tidak tersedia/i);
  });
});
