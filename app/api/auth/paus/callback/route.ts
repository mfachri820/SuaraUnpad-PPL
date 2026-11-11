import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { appUrl } from '@/lib/appUrl';
import { PAUS_STATE_COOKIE, clearCookie, setSessionCookie } from '@/lib/authCookies';
import { PausError, exchangeCodeForAccessToken, fetchPausProfile, getPausConfig } from '@/lib/paus';
import { AuthFlowError, authService } from '@/services/authService';

export const dynamic = 'force-dynamic';

function statesMatch(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// PAUS_REDIRECT_URI harus menunjuk ke route ini: https://<domain>/api/auth/paus/callback
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  const fail = (code: string, detail?: unknown) => {
    if (detail) console.warn(`[paus] Login gagal (${code})`, detail);
    const response = NextResponse.redirect(appUrl(`/login?error=${encodeURIComponent(code)}`, origin));
    clearCookie(response, PAUS_STATE_COOKIE);
    return response;
  };

  const params = request.nextUrl.searchParams;
  if (params.get('error')) {
    // Ditolak oleh PAuS sendiri (mis. invalid_scope, unauthorized_client, access_denied).
    return fail('paus_denied', {
      error: params.get('error'),
      description: params.get('error_description'),
      hint: params.get('hint'),
      message: params.get('message')
    });
  }

  const code = params.get('code');
  if (!code || !statesMatch(params.get('state'), request.cookies.get(PAUS_STATE_COOKIE)?.value)) {
    return fail('paus_state', { hasCode: Boolean(code), hasState: Boolean(params.get('state')) });
  }

  const config = getPausConfig();
  if (!config) return fail('paus_unavailable');

  try {
    const accessToken = await exchangeCodeForAccessToken(config, code);
    const profile = await fetchPausProfile(accessToken);
    // User baru (mahasiswa FMIPA) langsung dibuatkan akun; prodi diambil dari kode di NPM.
    const session = await authService.loginWithPaus(profile);

    const response = NextResponse.redirect(appUrl(session.user.role === 'ADMIN' ? '/admin' : '/home', origin));
    setSessionCookie(response, session.token);
    clearCookie(response, PAUS_STATE_COOKIE);
    return response;
  } catch (error) {
    if (error instanceof AuthFlowError || error instanceof PausError) return fail(error.code, error.message);
    return fail('paus_failed', error);
  }
}
