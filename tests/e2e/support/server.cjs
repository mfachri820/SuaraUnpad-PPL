/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node.js CommonJS launcher. */
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const { resolveTestDatabase } = require('../../qa/environment.cjs');
const database = resolveTestDatabase();

const child = spawn(process.execPath, [path.join(database.root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3100'], {
  cwd: database.root,
  env: {
    ...process.env,
    DATABASE_URL: database.url,
    JWT_SECRET: process.env.QA_JWT_SECRET,
    AWS_URL: 'https://storage.test/suara-mipa-test',
    AWS_ENDPOINT: 'https://s3.storage.test',
    AWS_BUCKET: 'suara-mipa-test',
    AWS_DEFAULT_REGION: 'id-dipatiukur-1',
    AWS_ACCESS_KEY_ID: crypto.randomBytes(10).toString('hex'),
    AWS_SECRET_ACCESS_KEY: crypto.randomBytes(20).toString('hex'),
    STORAGE_ROOT_FOLDER: 'suara-mipa',
    // Fixture E2E login memakai akun seeder (email + password), bukan PAuS.
    PASSWORD_LOGIN_ENABLED: 'true',
    APP_URL: 'http://127.0.0.1:3100',
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
  windowsHide: true,
});
child.on('exit', code => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
