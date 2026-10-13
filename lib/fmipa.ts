// Suara MIPA hanya melayani sivitas akademika FMIPA Universitas Padjadjaran.
// Fakultas dikunci ke satu nilai, dan program studi dibatasi ke daftar resmi FMIPA.
// NOTE: daftar program studi di bawah perlu dicek ulang ke katalog resmi FMIPA Unpad
// sebelum rilis produksi.

export const FMIPA_FACULTY = 'FMIPA' as const;

export const FMIPA_MAJORS = [
  'Matematika',
  'Statistika',
  'Aktuaria',
  'Fisika',
  'Kimia',
  'Biologi',
  'Teknik Informatika',
  'Teknik Elektro'
] as const;

export type FmipaMajor = (typeof FMIPA_MAJORS)[number];

export function isFmipaMajor(value: string): value is FmipaMajor {
  return (FMIPA_MAJORS as readonly string[]).includes(value);
}
