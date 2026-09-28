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
    exclude: [...configDefaults.exclude, 'tests/integration/**'],
    env: {
      JWT_SECRET: 'unit-test-secret-unit-test-secret-0123456789',
    },
  },
});
