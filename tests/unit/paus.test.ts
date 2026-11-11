import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    studentProfile: { findUnique: vi.fn() }
  }
}));

import { prisma } from '@/lib/prisma';
import { buildAuthorizeUrl, exchangeCodeForAccessToken, mapPausProfile, type PausConfig } from '@/lib/paus';
import { GET as redirectGET } from '@/app/api/auth/paus/redirect/route';
import { GET as callbackGET } from '@/app/api/auth/paus/callback/route';

const db = vi.mocked(prisma, true);
const APP = 'https://suara.fmipa.stg.unpad.ac.id';
const config: PausConfig = { clientId: 'client.paus.unpad.ac.id', clientSecret: 'rahasia', redirectUri: `${APP}/api/auth/paus/callback` };

// Bentuk response https://paus.unpad.ac.id/api sesuai PausProvider.php di Prabu.
const pausUserResponse = (npm: string) => ({
  attributes: {
    npm: { attribute_value: [npm] },
    name: { attribute_value: 'Mahasiswa Uji' },
    email: { attribute_value: 'Mahasiswa@Mail.Unpad.ac.id' },
    fakultas: { attribute_value: 'FPIK' }
  }
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('PAuS OAuth client', () => {
  it('membangun URL authorize dengan parameter yang sama seperti Prabu', () => {
    const url = new URL(buildAuthorizeUrl(config, 'state-123'));
    expect(url.origin + url.pathname).toBe('https://paus.unpad.ac.id/oauth');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: 'user.basic',
      response_type: 'code',
      state: 'state-123'
    });
  });

  it('memetakan atribut PAuS ke profil (NPM dari array, email lowercase)', () => {
    expect(mapPausProfile(pausUserResponse('140810230041'))).toEqual({
      npm: '140810230041',
      name: 'Mahasiswa Uji',
      email: 'mahasiswa@mail.unpad.ac.id'
    });
    expect(mapPausProfile({ attributes: { nama: { attribute_value: 'Fallback' } } })).toEqual({
      npm: null,
      name: 'Fallback',
      email: null
    });
    expect(mapPausProfile(null)).toEqual({ npm: null, name: null, email: null });
  });

  it('menukar code dengan Basic auth + body form, dan retry saat 504', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Gateway Time-out', { status: 504 }))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-abc' }));

    try {
      await expect(exchangeCodeForAccessToken(config, 'code-1')).resolves.toBe('access-abc');
      expect(fetchMock).toHaveBeenCalledTimes(2);

      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe('https://paus.unpad.ac.id/oauth/access-token');
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        `Basic ${Buffer.from('client.paus.unpad.ac.id:rahasia').toString('base64')}`
      );
      expect(Object.fromEntries(init?.body as URLSearchParams)).toEqual({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: 'code-1',
        redirect_uri: config.redirectUri
      });
    } finally {
      fetchMock.mockRestore();
    }
  });
});

describe('Route /api/auth/paus/*', () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_URL = APP;
    process.env.PAUS_CLIENT_ID = config.clientId;
    process.env.PAUS_CLIENT_SECRET = config.clientSecret;
    process.env.PAUS_REDIRECT_URI = config.redirectUri;
    db.studentProfile.findUnique.mockResolvedValue(null);
    db.user.findUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  it('redirect mengarah ke PAuS dan menyimpan state di cookie httpOnly', async () => {
    const response = await redirectGET(new Request('http://0.0.0.0:3000/api/auth/paus/redirect'));
    const location = new URL(response.headers.get('location')!);
    const cookie = response.headers.get('set-cookie')!;

    expect(location.origin).toBe('https://paus.unpad.ac.id');
    expect(cookie).toContain(`paus_oauth_state=${location.searchParams.get('state')}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
  });

  it('redirect kembali ke login jika client PAuS belum dikonfigurasi', async () => {
    delete process.env.PAUS_CLIENT_SECRET;
    const response = await redirectGET(new Request('http://0.0.0.0:3000/api/auth/paus/redirect'));
    expect(response.headers.get('location')).toBe(`${APP}/login?error=paus_unavailable`);
  });

  it('callback menolak state yang tidak cocok tanpa menghubungi PAuS', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const request = new NextRequest('http://0.0.0.0:3000/api/auth/paus/callback?code=abc&state=palsu', {
      headers: { cookie: 'paus_oauth_state=asli' }
    });

    const response = await callbackGET(request);

    expect(response.headers.get('location')).toBe(`${APP}/login?error=paus_state`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('callback untuk mahasiswa FMIPA baru langsung membuat akun (prodi dari NPM) lalu ke /home', async () => {
    db.user.create.mockResolvedValue({ id: 'u-9', email: 'mahasiswa@mail.unpad.ac.id', role: 'STUDENT', isVerified: true } as never);
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-abc' }))
      .mockResolvedValueOnce(jsonResponse(pausUserResponse('140810230041')));

    const request = new NextRequest('http://0.0.0.0:3000/api/auth/paus/callback?code=abc&state=s1', {
      headers: { cookie: 'paus_oauth_state=s1' }
    });
    const response = await callbackGET(request);

    expect(response.headers.get('location')).toBe(`${APP}/home`);
    expect(response.headers.get('set-cookie')).toMatch(/(^|, )token=ey/);
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentProfile: { create: expect.objectContaining({ studentId: '140810230041', major: 'Teknik Informatika' }) }
        })
      })
    );
  });

  it('callback untuk user lama langsung memasang cookie sesi', async () => {
    db.studentProfile.findUnique.mockResolvedValue({
      user: { id: 'u-1', email: 'mahasiswa@mail.unpad.ac.id', role: 'STUDENT', isVerified: true }
    } as never);
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-abc' }))
      .mockResolvedValueOnce(jsonResponse(pausUserResponse('140810230041')));

    const request = new NextRequest('http://0.0.0.0:3000/api/auth/paus/callback?code=abc&state=s1', {
      headers: { cookie: 'paus_oauth_state=s1' }
    });
    const response = await callbackGET(request);

    expect(response.headers.get('location')).toBe(`${APP}/home`);
    expect(response.headers.get('set-cookie')).toMatch(/(^|, )token=ey/);
  });

  it('callback menolak mahasiswa non-FMIPA dengan pesan yang jelas', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-abc' }))
      .mockResolvedValueOnce(jsonResponse(pausUserResponse('180110240011')));

    const request = new NextRequest('http://0.0.0.0:3000/api/auth/paus/callback?code=abc&state=s1', {
      headers: { cookie: 'paus_oauth_state=s1' }
    });
    const response = await callbackGET(request);

    expect(response.headers.get('location')).toBe(`${APP}/login?error=not_fmipa`);
  });
});
