/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node.js CommonJS setup. */
const { Pool } = require('pg');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { resolveTestDatabase } = require('./environment.cjs');

async function prepareDatabase() {
  const database = resolveTestDatabase();
  const adminUrl = new URL(database.url);
  adminUrl.pathname = '/postgres';
  const pool = new Pool({ connectionString: adminUrl.href, connectionTimeoutMillis: 5000 });
  try {
    const exists = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [database.name]);
    if (!exists.rowCount) await pool.query(`CREATE DATABASE "${database.name}"`);
  } finally {
    await pool.end();
  }
  const result = spawnSync(process.execPath, [path.join(database.root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: database.root,
    env: { ...process.env, DATABASE_URL: database.url, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error('Test database migration failed: ' + (result.stderr || result.stdout));
  console.log(`QA database prepared: ${database.name}`);
}

module.exports = { prepareDatabase };
