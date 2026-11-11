import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JWTVerifyResult, ResolvedKey } from 'jose';
import type { NextRequest } from 'next/server';

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    studentProfile: { update: vi.fn() },
    lecturerProfile: { update: vi.fn() },
    adminProfile: { update: vi.fn() },
    user: { update: vi.fn() },
  },
}));

import { jwtVerify } from 'jose';
import { proxy as middleware } from '@/proxy';
import { authService } from '@/services/authService';
import { prisma } from '@/lib/prisma';

const mockedJwtVerify = vi.mocked(jwtVerify);
const mockedTransaction = vi.mocked(prisma.$transaction);

describe('Middleware and profile validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when STUDENT role tries to access /api/admin', async () => {
    mockedJwtVerify.mockResolvedValue({ payload: { isVerified: true, userId: 'user-1', role: 'STUDENT' }, protectedHeader: {} } as unknown as JWTVerifyResult<unknown> & ResolvedKey);

    const request = {
      headers: new Headers({ authorization: 'Bearer fake-token' }),
      nextUrl: new URL('http://localhost/api/admin'),
      cookies: {
        get: vi.fn(() => undefined),
      },
    } as unknown as NextRequest;

    const response = await middleware(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ status: 'error', message: 'Akses ditolak. Hanya Admin yang diizinkan.' });
    expect(mockedJwtVerify).toHaveBeenCalledOnce();
  });

  it('returns 403 when API token is valid but user is not verified', async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { isVerified: false, userId: 'user-1', role: 'STUDENT' },
      protectedHeader: {}
    } as unknown as JWTVerifyResult<unknown> & ResolvedKey);

    const request = {
      headers: new Headers({ authorization: 'Bearer fake-token' }),
      nextUrl: new URL('http://localhost/api/reports'),
      cookies: {
        get: vi.fn(() => undefined),
      },
    } as unknown as NextRequest;

    const response = await middleware(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({
      status: 'error',
      message: 'Akun belum aktif. Silakan hubungi admin.'
    });
    expect(mockedJwtVerify).toHaveBeenCalledOnce();
  });

  it('returns 401 when API token is invalid or expired', async () => {
    mockedJwtVerify.mockRejectedValue(new Error('token invalid'));

    const request = {
      headers: new Headers({ authorization: 'Bearer fake-token' }),
      nextUrl: new URL('http://localhost/api/reports'),
      cookies: {
        get: vi.fn(() => undefined),
      },
    } as unknown as NextRequest;

    const response = await middleware(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({
      status: 'error',
      message: 'Sesi tidak valid atau telah kadaluarsa.'
    });
    expect(mockedJwtVerify).toHaveBeenCalledOnce();
  });

  it('lets /api/health through without a token and strips spoofed identity headers', async () => {
    const request = {
      headers: new Headers({ 'x-user-id': 'attacker', 'x-user-role': 'ADMIN' }),
      nextUrl: new URL('http://localhost/api/health'),
      cookies: { get: vi.fn(() => undefined) },
    } as unknown as NextRequest;

    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-request-x-user-id')).toBeNull();
    expect(response.headers.get('x-middleware-request-x-user-role')).toBeNull();
    expect(mockedJwtVerify).not.toHaveBeenCalled();
  });

  it('forwards identity from the verified token, not from client headers', async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { isVerified: true, userId: 'real-user', role: 'STUDENT' },
      protectedHeader: {}
    } as unknown as JWTVerifyResult<unknown> & ResolvedKey);

    const request = {
      headers: new Headers({ authorization: 'Bearer fake-token', 'x-user-id': 'attacker', 'x-user-role': 'ADMIN' }),
      nextUrl: new URL('http://localhost/api/posts'),
      cookies: { get: vi.fn(() => undefined) },
    } as unknown as NextRequest;

    const response = await middleware(request);

    expect(response.headers.get('x-middleware-request-x-user-id')).toBe('real-user');
    expect(response.headers.get('x-middleware-request-x-user-role')).toBe('STUDENT');
  });

  it('refuses to run with a missing/short JWT_SECRET instead of falling back to a default', async () => {
    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'short';
    const request = {
      headers: new Headers({ authorization: 'Bearer fake-token' }),
      nextUrl: new URL('http://localhost/api/posts'),
      cookies: { get: vi.fn(() => undefined) },
    } as unknown as NextRequest;

    await expect(middleware(request)).rejects.toThrow(/JWT_SECRET/);
    process.env.JWT_SECRET = original;
  });

  it('ignores studentId on profile update because the NPM comes from PAuS', async () => {
    await authService.updateProfile('user-1', 'STUDENT', { studentId: '140810230099', fullName: 'Nama Baru' } as never);

    expect(prisma.studentProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { fullName: 'Nama Baru' }
    });
    expect(mockedTransaction).toHaveBeenCalledOnce();
  });
});

describe('Pemisahan halaman admin dan user (proxy UI)', () => {
  const pageRequest = async (path: string, role: 'STUDENT' | 'LECTURER' | 'ADMIN') => {
    mockedJwtVerify.mockResolvedValue({
      payload: { isVerified: true, userId: 'user-1', role },
      protectedHeader: {}
    } as unknown as JWTVerifyResult<unknown> & ResolvedKey);
    const { NextRequest } = await import('next/server');
    return middleware(new NextRequest(`http://localhost${path}`, { headers: { cookie: 'token=fake-token' } }));
  };

  const redirectPath = (response: Response) => {
    const location = response.headers.get('location');
    return location ? new URL(location).pathname : null;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('non-admin yang membuka /admin/* dialihkan ke /home', async () => {
    expect(redirectPath(await pageRequest('/admin', 'STUDENT'))).toBe('/home');
    expect(redirectPath(await pageRequest('/admin/moderation', 'LECTURER'))).toBe('/home');
  });

  it('admin bisa membuka panel admin dan halaman lihat-saja user', async () => {
    expect(redirectPath(await pageRequest('/admin/content', 'ADMIN'))).toBeNull();
    expect(redirectPath(await pageRequest('/home', 'ADMIN'))).toBeNull();
    expect(redirectPath(await pageRequest('/aspirasi/abc', 'ADMIN'))).toBeNull();
  });

  it('admin dialihkan ke /admin dari halaman pembuatan laporan dan dari halaman login', async () => {
    expect(redirectPath(await pageRequest('/report', 'ADMIN'))).toBe('/admin');
    expect(redirectPath(await pageRequest('/profil/my-report', 'ADMIN'))).toBe('/admin');
    expect(redirectPath(await pageRequest('/login', 'ADMIN'))).toBe('/admin');
    expect(redirectPath(await pageRequest('/login', 'STUDENT'))).toBe('/home');
  });

  it('redirect memakai APP_URL, bukan host internal container', async () => {
    const original = process.env.APP_URL;
    process.env.APP_URL = 'https://suara.fmipa.stg.unpad.ac.id';
    try {
      const { NextRequest } = await import('next/server');
      const response = await middleware(new NextRequest('http://0.0.0.0:3000/home'));
      expect(response.headers.get('location')).toBe('https://suara.fmipa.stg.unpad.ac.id/login?error=unauthorized');
    } finally {
      if (original === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = original;
    }
  });

  it('halaman yang hanya berawalan sama tidak ikut diblokir', async () => {
    expect(redirectPath(await pageRequest('/reports-archive', 'ADMIN'))).toBeNull();
    expect(redirectPath(await pageRequest('/administrasi', 'STUDENT'))).toBeNull();
  });
});
