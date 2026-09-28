import { execSync } from 'node:child_process';
import 'dotenv/config';

export default function setup() {
  const databaseUrl =
    process.env.TEST_DATABASE_URL || 'postgresql://suara:suara@localhost:5432/suara_mipa_test';

  if (databaseUrl === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL tidak boleh sama dengan DATABASE_URL (data dev akan terhapus).');
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
  });
}
