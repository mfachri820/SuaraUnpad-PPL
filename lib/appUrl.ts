// URL publik aplikasi (mis. https://suara.fmipa.stg.unpad.ac.id), dari env APP_URL.
//
// Di container standalone (HOSTNAME=0.0.0.0) di belakang ingress, request.url bisa
// ter-derive jadi http://0.0.0.0:3000/... alih-alih domain publik. Karena itu semua
// redirect absolut dibangun dari APP_URL, dan origin request hanya dipakai sebagai
// fallback saat development lokal (APP_URL kosong).
export function getAppBaseUrl(fallbackOrigin?: string): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return (fallbackOrigin ?? 'http://localhost:3000').replace(/\/+$/, '');
}

export function appUrl(pathWithQuery: string, fallbackOrigin?: string): URL {
  const path = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  return new URL(`${getAppBaseUrl(fallbackOrigin)}${path}`);
}

export function isSecureAppUrl(fallbackOrigin?: string) {
  return getAppBaseUrl(fallbackOrigin).startsWith('https://');
}
