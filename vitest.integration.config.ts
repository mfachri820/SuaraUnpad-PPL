import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import 'dotenv/config';

const root = fileURLToPath(new URL('.', import.meta.url));

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL || 'postgresql://suara:suara@localhost:5432/suara_mipa_test';

export default defineConfig({
  resolve: {
    alias: [{ find: '@', replacement: root }],
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.int.test.ts'],
    globalSetup: ['tests/integration/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: randomBytes(32).toString('hex'),
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      NODE_ENV: 'test',
    },
  },
});
