import { defineConfig } from 'vitest/config';
import { randomBytes } from 'node:crypto';
import { resolveTestDatabase } from './environment.cjs';

const database = resolveTestDatabase();

export default defineConfig({
  resolve: { alias: [{ find: '@', replacement: database.root }] },
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    include: [
      'tests/integration/announcement.int.test.ts',
      'tests/integration/moderation.int.test.ts',
      'tests/integration/sprint4-edge-cases.int.test.ts',
    ],
    globalSetup: ['tests/qa/vitest-setup.ts'],
    reporters: ['verbose', 'json', 'junit'],
    outputFile: {
      json: 'tests/results/sprint-4/vitest-integration/results.json',
      junit: 'tests/results/sprint-4/vitest-integration/junit.xml',
    },
    env: {
      DATABASE_URL: database.url,
      JWT_SECRET: randomBytes(32).toString('hex'),
      AWS_URL: 'https://storage.test/suara-mipa-test',
      AWS_BUCKET: 'suara-mipa-test',
      STORAGE_ROOT_FOLDER: 'suara-mipa',
      NODE_ENV: 'test',
    },
  },
});
