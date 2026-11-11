// Klien OAuth2 untuk PAuS (SSO Universitas Padjadjaran).
//
// Endpoint, scope, dan bentuk response diambil dari implementasi PAuS di
// prabu2026-backend (app/Services/PausProvider.php), yang sudah berjalan di
// platform yang sama. Alurnya Authorization Code biasa:
//   1. browser diarahkan ke  https://paus.unpad.ac.id/oauth?client_id&redirect_uri&scope&response_type=code&state
//   2. PAuS balik ke PAUS_REDIRECT_URI dengan ?code&state
//   3. server menukar code ke https://paus.unpad.ac.id/oauth/access-token
//   4. server mengambil profil dari https://paus.unpad.ac.id/api (Bearer token)

import { getAppBaseUrl } from '@/lib/appUrl';

export const PAUS_DEFAULT_BASE_URL = 'https://paus.unpad.ac.id';
export const PAUS_SCOPE = 'user.basic';

// PAUS_BASE_URL hanya untuk menguji alur login dengan server PAuS tiruan secara lokal.
// Di staging/production biarkan kosong.
function pausEndpoint(path: string) {
  const base = (process.env.PAUS_BASE_URL?.trim() || PAUS_DEFAULT_BASE_URL).replace(/\/+$/, '');
  return `${base}${path}`;
}

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([502, 503, 504]);

export class PausError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400
  ) {
    super(message);
    this.name = 'PausError';
  }
}

export interface PausConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface PausProfile {
  npm: string | null;
  name: string | null;
  email: string | null;
}

export function getPausConfig(): PausConfig | null {
  const clientId = process.env.PAUS_CLIENT_ID?.trim();
  const clientSecret = process.env.PAUS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const redirectUri = process.env.PAUS_REDIRECT_URI?.trim() || `${getAppBaseUrl()}/api/auth/paus/callback`;
  return { clientId, clientSecret, redirectUri };
}

export function buildAuthorizeUrl(config: PausConfig, state: string) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: PAUS_SCOPE,
    response_type: 'code',
    state
  });
  return `${pausEndpoint('/oauth')}?${params.toString()}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// PAuS sesekali membalas 502/503/504 saat banyak yang login bersamaan (lihat catatan
// di PausProvider.php). Hanya error transien itu yang di-retry; 4xx tidak, karena
// authorization code tidak boleh dipakai ulang untuk kesalahan yang memang permanen.
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (!RETRYABLE_STATUS.has(response.status) || attempt >= MAX_RETRIES) return response;
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
    }
    await sleep(300 * 2 ** attempt);
  }
}

export async function exchangeCodeForAccessToken(config: PausConfig, code: string): Promise<string> {
  const response = await fetchWithRetry(pausEndpoint('/oauth/access-token'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      // Dikirim di header (Basic) DAN di body, sama seperti Prabu, supaya cocok dengan
      // server OAuth yang membaca salah satunya.
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri
    })
  });

  const body = (await response.json().catch(() => null)) as { access_token?: unknown } | null;
  if (!response.ok || typeof body?.access_token !== 'string' || !body.access_token) {
    console.warn('[paus] Penukaran code gagal', { status: response.status, body });
    throw new PausError('Gagal menukar kode login PAuS.', 'paus_failed', 502);
  }
  return body.access_token;
}

type PausAttribute = { attribute_value?: unknown } | undefined;

function firstString(attribute: PausAttribute): string | null {
  const value = attribute?.attribute_value;
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  if (typeof candidate === 'number') return String(candidate);
  return null;
}

/** Petakan response mentah https://paus.unpad.ac.id/api ke profil yang dipakai aplikasi. */
export function mapPausProfile(raw: unknown): PausProfile {
  const attributes = ((raw as { attributes?: Record<string, PausAttribute> } | null)?.attributes ?? {}) as Record<
    string,
    PausAttribute
  >;

  const email = firstString(attributes.email);
  if (!email) {
    // Nama key 'email' di Prabu juga belum 100% terverifikasi; log key yang tersedia
    // supaya login pertama di staging langsung memberi bukti struktur aslinya.
    console.warn('[paus] Atribut email kosong', { attributeKeys: Object.keys(attributes) });
  }

  return {
    npm: firstString(attributes.npm),
    name: firstString(attributes.name) ?? firstString(attributes.nama),
    email: email?.toLowerCase() ?? null
  };
}

export async function fetchPausProfile(accessToken: string): Promise<PausProfile> {
  const response = await fetchWithRetry(pausEndpoint('/api'), {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` }
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    console.warn('[paus] Ambil profil gagal', { status: response.status });
    throw new PausError('Gagal mengambil profil dari PAuS.', 'paus_failed', 502);
  }
  return mapPausProfile(body);
}
