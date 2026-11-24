import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { appUrl } from '@/lib/appUrl';
import { PAUS_STATE_COOKIE, setShortLivedCookie } from '@/lib/authCookies';
import { buildAuthorizeUrl, getPausConfig } from '@/lib/paus';

export const dynamic = 'force-dynamic';

// Tombol "Masuk dengan PAuS" adalah link biasa ke route ini (sama seperti /bff/auth/paus/redirect di Prabu).
export function GET(request: Request) {
  const config = getPausConfig();
  if (!config) {
    console.error('[paus] PAUS_CLIENT_ID / PAUS_CLIENT_SECRET belum di-set');
    return NextResponse.redirect(appUrl('/login?error=paus_unavailable', new URL(request.url).origin));
  }

  const state = randomBytes(20).toString('hex');
  const response = NextResponse.redirect(buildAuthorizeUrl(config, state));

  // Dicocokkan lagi di callback untuk mencegah CSRF pada alur OAuth.
  setShortLivedCookie(response, PAUS_STATE_COOKIE, state, 60 * 5);
  return response;
}
