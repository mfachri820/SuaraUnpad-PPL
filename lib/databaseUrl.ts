// Connection string PostgreSQL. Di cluster Unpad, URI dari Secret `postgresql-creds`
// dipetakan ke DB_URL (lihat .gitlab/auto-deploy-values.yaml); lokal tetap DATABASE_URL.
// String kosong diperlakukan sama dengan tidak di-set.
export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim() || process.env.DB_URL?.trim() || undefined;
}
