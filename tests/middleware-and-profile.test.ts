import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import { middleware } from '@/middleware';
import { authService } from '@/services/authService';
import { prisma } from '@/lib/prisma';

const mockedJwtVerify = vi.mocked(jwtVerify);
const mockedTransaction = vi.mocked(prisma.$transaction);

describe('Middleware and profile validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when STUDENT role tries to access /api/admin', async () => {
    mockedJwtVerify.mockResolvedValue({ payload: { isVerified: true, userId: 'user-1', role: 'STUDENT' } } as unknown as { payload: { isVerified: boolean; userId: string; role: string } });

    const request = {
      headers: new Headers({ authorization: 'Bearer fake-token' }),
      nextUrl: new URL('http://localhost/api/admin'),
      cookies: {
        get: vi.fn(() => undefined),
      },
    } as unknown as Request;

    const response = await middleware(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ status: 'error', message: 'Akses ditolak. Hanya Admin yang diizinkan.' });
    expect(mockedJwtVerify).toHaveBeenCalledOnce();
  });

  it('returns 403 when API token is valid but user is not verified', async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { isVerified: false, userId: 'user-1', role: 'STUDENT' }
    } as unknown as { payload: { isVerified: boolean; userId: string; role: string } });

    const request = {
      headers: new Headers({ authorization: 'Bearer fake-token' }),
      nextUrl: new URL('http://localhost/api/reports'),
      cookies: {
        get: vi.fn(() => undefined),
      },
    } as unknown as Request;

    const response = await middleware(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({
      status: 'error',
      message: 'Akun belum terverifikasi. Silakan cek email Anda.'
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
    } as unknown as Request;

    const response = await middleware(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({
      status: 'error',
      message: 'Sesi tidak valid atau telah kadaluarsa.'
    });
    expect(mockedJwtVerify).toHaveBeenCalledOnce();
  });

  it('throws error and does not call Prisma when studentId is invalid during profile update', async () => {
    await expect(
      authService.updateProfile('user-1', 'STUDENT', { studentId: 'invalid-npm' })
    ).rejects.toThrow(/Format NPM tidak valid/i);

    expect(mockedTransaction).not.toHaveBeenCalled();
  });
});
