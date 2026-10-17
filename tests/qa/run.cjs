/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node.js CommonJS QA runner. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');
const { resolveTestDatabase, root } = require('./environment.cjs');
const { prepareDatabase } = require('./prepare-database.cjs');

const output = path.join(root, 'tests/results/sprint-4');
const phase = process.argv[2] || 'all';
const database = resolveTestDatabase();

async function run(label, script, args, env = {}) {
  const logPath = path.join(output, label + '.log');
  const log = fs.createWriteStream(logPath);
  console.log(`\n--- ${label} ---`);
  const command = [process.execPath, script, ...args];
  log.write(command.join(' ') + '\n');
  const child = spawn(process.execPath, [script, ...args], { cwd: root, env: { ...process.env, ...env }, windowsHide: true });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { process.stdout.write(chunk); log.write(chunk); });
  return new Promise((resolve, reject) => {
    child.on('error', error => { log.end(); reject(error); });
    child.on('close', code => { log.end(); resolve(code ?? 1); });
  });
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(path.join(output, 'vitest-integration'), { recursive: true });
  fs.mkdirSync(path.join(output, 'playwright'), { recursive: true });
  process.env.TEST_DATABASE_URL = database.url;
  process.env.QA_JWT_SECRET = crypto.randomBytes(48).toString('hex');
  const metadata = {
    sprint: 4,
    startedAt: new Date().toISOString(),
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
    node: process.version,
    vitest: require('vitest/package.json').version,
    playwright: require('@playwright/test/package.json').version,
    database: database.name,
    scope: ['REQ-03 Pengumuman', 'REQ-04 Moderasi pengguna/admin'],
    assumptions: ['Pengumuman boleh dikomentari sesuai implementasi saat ini.', 'Moderasi setelah publikasi, bukan persetujuan sebelum terbit.'],
    limitations: ['SSO, deployment DPSI, dan AI bukan scope.', 'Upload Cloudinary berhasil tidak termasuk alur E2E; validasi file diuji melalui HTTP.'],
    exitCodes: {},
  };
  await prepareDatabase();
  if (phase !== 'e2e') {
    metadata.exitCodes.integration = await run('vitest-integration/console', path.join(root, 'node_modules/vitest/vitest.mjs'), ['run', '--config', 'tests/qa/vitest.sprint4.config.ts']);
  }
  if (phase !== 'integration') {
    metadata.exitCodes.build = await run('playwright/build', path.join(root, 'node_modules/next/dist/bin/next'), ['build'], {
      DATABASE_URL: database.url, JWT_SECRET: process.env.QA_JWT_SECRET, CLOUDINARY_CLOUD_NAME: 'test-cloud', NODE_ENV: 'production',
    });
    if (metadata.exitCodes.build === 0) {
      metadata.exitCodes.e2e = await run('playwright/console', path.join(root, 'node_modules/@playwright/test/cli.js'), ['test', '--config', 'tests/e2e/playwright.config.ts']);
    }
  }
  metadata.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'run.json'), JSON.stringify(metadata, null, 2));
  const { renderEvidence } = require('./render-evidence.cjs');
  await renderEvidence(output);
  process.exitCode = Object.values(metadata.exitCodes).some(code => code !== 0) ? 1 : 0;
  console.log(`\nQA evidence saved to ${output}`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
