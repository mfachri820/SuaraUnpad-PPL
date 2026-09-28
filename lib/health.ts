import { prisma } from '@/lib/prisma';

const DB_TIMEOUT_MS = 3000;

export function validateDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not defined. Set the database connection string in environment variables.'
    );
  }

  return databaseUrl;
}

export async function checkHealth() {
  const version = process.env.APP_VERSION || 'dev';

  try {
    validateDatabaseUrl();
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT_MS)
      )
    ]);
    return { status: 'ok' as const, database: 'connected', version };
  } catch (error) {
    console.error('[health] Database check failed:', error);
    return { status: 'error' as const, database: 'unreachable', version };
  }
}
