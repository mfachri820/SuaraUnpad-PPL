/* eslint-disable @typescript-eslint/no-require-imports -- Shared Node.js CommonJS test configuration. */
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '../..');
const envFile = path.join(root, '.env');
const developmentEnv = fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile)) : {};
dotenv.config({ path: envFile, quiet: true });

function resolveTestDatabase() {
  const development = new URL(developmentEnv.DATABASE_URL || process.env.DATABASE_URL);
  const fallback = new URL(development);
  fallback.pathname = '/suara_mipa_test';
  const test = new URL(process.env.TEST_DATABASE_URL || fallback.href);
  const name = decodeURIComponent(test.pathname.slice(1));
  if (!['localhost', '127.0.0.1', '[::1]'].includes(test.hostname)) {
    throw new Error('Sprint 4 QA requires a local test database.');
  }
  if (!/^[a-zA-Z0-9_]+_(test|e2e|qa)$/.test(name)) {
    throw new Error('QA database name must end in _test, _e2e, or _qa.');
  }
  const sameHost = test.hostname === development.hostname || ['localhost', '127.0.0.1', '[::1]'].includes(development.hostname);
  if (sameHost && (test.port || '5432') === (development.port || '5432') && name === decodeURIComponent(development.pathname.slice(1))) {
    throw new Error('QA database must differ from the development database.');
  }
  return { url: test.href, name, root };
}

module.exports = { resolveTestDatabase, root };
