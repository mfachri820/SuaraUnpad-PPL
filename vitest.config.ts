import { configDefaults, defineConfig } from 'vitest/config';
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
      STORAGE_ROOT_FOLDER: 'suara-mipa',
    },
  },
});
