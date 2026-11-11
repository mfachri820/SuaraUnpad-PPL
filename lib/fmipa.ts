// Suara MIPA hanya melayani sivitas akademika FMIPA Universitas Padjadjaran.
// Fakultas dikunci ke satu nilai, dan program studi ditentukan dari NPM.

export const FMIPA_FACULTY = 'FMIPA' as const;

// NPM Unpad selalu 12 digit: 2 digit pertama = kode fakultas ("14" = FMIPA,
// sumber: config/paus.php di prabu2026-backend), 2 digit berikutnya = kode program studi.
// Contoh: 140810230041 -> 14 (FMIPA) + 08 (Teknik Informatika).
export const FMIPA_NPM_PREFIX = '14';

export const FMIPA_PRODI_BY_CODE = {
  '01': 'Matematika',
  '02': 'Kimia',
  '03': 'Fisika',
  '04': 'Biologi',
  '06': 'Statistika',
  '07': 'Geofisika',
  '08': 'Teknik Informatika',
  '09': 'Teknik Elektro',
  '10': 'Ilmu Aktuaria'
} as const;

export type FmipaMajor = (typeof FMIPA_PRODI_BY_CODE)[keyof typeof FMIPA_PRODI_BY_CODE];

export const FMIPA_MAJORS = Object.values(FMIPA_PRODI_BY_CODE) as [FmipaMajor, ...FmipaMajor[]];

export function isFmipaMajor(value: string): value is FmipaMajor {
  return (FMIPA_MAJORS as readonly string[]).includes(value);
}

export function isFmipaNpm(npm: string): boolean {
  return /^\d{12}$/.test(npm) && npm.startsWith(FMIPA_NPM_PREFIX);
}

/** Program studi dari NPM FMIPA, atau null bila bukan NPM FMIPA / kode prodinya tidak dikenal. */
export function majorFromNpm(npm: string): FmipaMajor | null {
  if (!isFmipaNpm(npm)) return null;
  const code = npm.slice(2, 4) as keyof typeof FMIPA_PRODI_BY_CODE;
  return FMIPA_PRODI_BY_CODE[code] ?? null;
}
