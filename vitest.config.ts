import { configDefaults, defineConfig } from 'vitest/config';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@',
        replacement: root,
      },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
    exclude: [...configDefaults.exclude, 'tests/integration/**', 'tests/e2e/**', 'tests/results/**'],
    env: {
      JWT_SECRET: 'unit-test-secret-unit-test-secret-0123456789',
      AWS_URL: 'https://storage.test/suara-mipa-test',
      AWS_ENDPOINT: 'https://s3.storage.test',
      AWS_BUCKET: 'suara-mipa-test',
      AWS_DEFAULT_REGION: 'id-dipatiukur-1',
      // Credential acak: hanya untuk menghitung tanda tangan presigned URL di tes (tanpa jaringan).
      AWS_ACCESS_KEY_ID: randomBytes(10).toString('hex'),
      AWS_SECRET_ACCESS_KEY: randomBytes(20).toString('hex'),
      STORAGE_ROOT_FOLDER: 'suara-mipa',
    },
  },
});
