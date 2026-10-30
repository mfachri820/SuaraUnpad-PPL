import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { resolveTestDatabase } from '../qa/environment.cjs';

const database = resolveTestDatabase();
process.env.TEST_DATABASE_URL = database.url;
process.env.DATABASE_URL = database.url;
process.env.QA_JWT_SECRET ||= randomBytes(48).toString('hex');

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  globalSetup: './support/global-setup.ts',
  outputDir: '../results/sprint-4/playwright/artifacts',
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(database.root, 'tests/results/sprint-4/playwright/report'), open: 'never' }],
    ['json', { outputFile: path.join(database.root, 'tests/results/sprint-4/playwright/results.json') }],
    ['junit', { outputFile: path.join(database.root, 'tests/results/sprint-4/playwright/junit.xml') }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    channel: 'msedge',
    viewport: { width: 1366, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'node tests/e2e/support/server.cjs',
    cwd: database.root,
    url: 'http://127.0.0.1:3100/login',
    reuseExistingServer: false,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
