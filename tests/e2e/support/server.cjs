/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node.js CommonJS launcher. */
const { spawn } = require('node:child_process');
const path = require('node:path');
const { resolveTestDatabase } = require('../../qa/environment.cjs');
const database = resolveTestDatabase();

const child = spawn(process.execPath, [path.join(database.root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3100'], {
  cwd: database.root,
  env: {
    ...process.env,
    DATABASE_URL: database.url,
    JWT_SECRET: process.env.QA_JWT_SECRET,
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '',
    SMTP_USER: '', SMTP_PASS: '',
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
  windowsHide: true,
});
child.on('exit', code => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
