import type { NextResponse } from 'next/server';
import { isSecureAppUrl } from '@/lib/appUrl';

export const SESSION_COOKIE = 'token';
export const PAUS_STATE_COOKIE = 'paus_oauth_state';

const SEVEN_DAYS = 60 * 60 * 24 * 7;

// Cookie sesi sengaja TIDAK httpOnly: frontend membacanya (js-cookie) untuk mengirim
// header Authorization: Bearer ke /api/*, sama seperti alur login sebelumnya.
export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: false,
    secure: isSecureAppUrl(),
    sameSite: 'lax',
    path: '/',
    maxAge: SEVEN_DAYS
  });
}

export function setShortLivedCookie(response: NextResponse, name: string, value: string, maxAgeSeconds: number) {
  response.cookies.set(name, value, {
    httpOnly: true,
    secure: isSecureAppUrl(),
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds
  });
}

export function clearCookie(response: NextResponse, name: string) {
  response.cookies.set(name, '', { path: '/', maxAge: 0 });
}
