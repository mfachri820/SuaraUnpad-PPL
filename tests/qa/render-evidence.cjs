/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node.js CommonJS evidence renderer. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const read = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
const css = `body{font:18px/1.45 Arial,sans-serif;color:#111827;background:#fff;margin:0;padding:40px}h1{font-size:30px;margin:0 0 12px}h2{font-size:23px;margin:28px 0 12px}p{margin:8px 0}.meta{color:#374151;font-size:16px}.counts{display:flex;gap:24px;margin:24px 0;padding:20px;background:#f8fafc;border:1px solid #cbd5e1}.counts strong{font-size:28px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{text-align:left;padding:12px;border:1px solid #cbd5e1;vertical-align:top}th{background:#f1f5f9}.pass{color:#14783e;font-weight:bold}.fail{color:#b91c1c;font-weight:bold}.skip{color:#475569;font-weight:bold}small{font-size:15px}.foot{font-size:14px;color:#475569;margin-top:20px}a{color:#1d5db3}code{overflow-wrap:anywhere}`;

function document(title, content) {
  return `<!doctype html><html lang="id"><meta charset="utf-8"><title>${escape(title)}</title><style>${css}</style><body><h1>${escape(title)}</h1>${content}</body></html>`;
}

function table(rows) {
  return `<table><thead><tr><th>No.</th><th>Test case</th><th>Status aktual</th></tr></thead><tbody>${rows.map((row, i) => `<tr><td>${i + 1}</td><td>${escape(row.title)}${row.error ? `<br><small>${escape(row.error.slice(0, 600))}</small>` : ''}</td><td class="${row.status === 'passed' ? 'pass' : row.status === 'skipped' || row.status === 'pending' ? 'skip' : 'fail'}">${escape(row.status.toUpperCase())}</td></tr>`).join('')}</tbody></table>`;
}

function vitestRows(report) {
  return report.testResults.flatMap(file => file.assertionResults.map(test => ({
    title: test.fullName || [...(test.ancestorTitles || []), test.title].join(' > '),
    status: test.status,
    file: path.basename(file.name),
    error: (test.failureMessages || []).join('\n'),
  })));
}

function playwrightRows(report) {
  const rows = [];
  function walk(suite) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result = test.results.at(-1);
        rows.push({ title: spec.title, status: result?.status || 'not-run', file: path.basename(spec.file || suite.file || ''), error: result?.error?.message || '' });
      }
    }
    for (const child of suite.suites || []) walk(child);
  }
  for (const suite of report.suites || []) walk(suite);
  return rows;
}

async function renderEvidence(output) {
  const metadata = read(path.join(output, 'run.json'));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const summaries = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
    for (const [folder, title, parser] of [
      ['vitest-integration', 'Vitest Integration Test Sprint 4', vitestRows],
      ['playwright', 'Playwright E2E dan HTTP Test Sprint 4', playwrightRows],
    ]) {
      const directory = path.join(output, folder);
      const report = read(path.join(directory, 'results.json'));
      if (!report) continue;
      const rows = parser(report);
      const passed = rows.filter(row => row.status === 'passed').length;
      const skipped = rows.filter(row => ['skipped', 'pending', 'todo'].includes(row.status)).length;
      const failed = rows.length - passed - skipped;
      const meta = `<p class="meta">REQ-03 Pengumuman dan REQ-04 Moderasi pengguna/admin</p><p class="meta">Commit aplikasi: <code>${escape(metadata?.commit || 'tidak tercatat')}</code> · Node ${escape(metadata?.node || process.version)}</p><p class="meta">Selesai: ${escape(metadata?.finishedAt || new Date().toISOString())}</p>`;
      const counts = `<div class="counts"><span>Total<br><strong>${rows.length}</strong></span><span>Passed<br><strong class="pass">${passed}</strong></span><span>Failed<br><strong class="fail">${failed}</strong></span><span>Skipped<br><strong class="skip">${skipped}</strong></span></div>`;
      const fileSummary = [...new Set(rows.map(row => row.file))].map(file => {
        const subset = rows.filter(row => row.file === file);
        return `<tr><td>${escape(file)}</td><td>${subset.length}</td><td>${subset.filter(row => row.status === 'passed').length}</td><td>${subset.filter(row => !['passed', 'skipped', 'pending', 'todo'].includes(row.status)).length}</td></tr>`;
      }).join('');
      const summary = meta + counts + `<table><tr><th>File test</th><th>Total</th><th>Passed</th><th>Failed</th></tr>${fileSummary}</table><p class="foot">Ringkasan otomatis dari results.json. Screenshot aplikasi berada di folder playwright/screenshots. Test HTTP dilabeli HTTP; hasil mock tidak digunakan sebagai bukti alur utama.</p>`;
      await page.setContent(document(title, summary));
      await page.locator('body').screenshot({ path: path.join(directory, 'summary.png') });
      fs.writeFileSync(path.join(directory, 'summary.html'), document(title, summary));
      const links = [];
      const logFile = path.join(directory, 'console.log');
      if (fs.existsSync(logFile)) {
        const log = fs.readFileSync(logFile, 'utf8').replace(/\u001b\[[0-9;]*m/g, '').trim().split(/\r?\n/).slice(-14).join('\n');
        const consoleHtml = document(title, '<p class="meta">Cuplikan console.log asli dari eksekusi yang sama.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;background:#111827;color:white;padding:24px;font:17px/1.55 Consolas,monospace">' + escape(log) + '</pre>');
        fs.writeFileSync(path.join(directory, 'console-summary.html'), consoleHtml);
        await page.setContent(consoleHtml);
        await page.locator('body').screenshot({ path: path.join(directory, 'console-summary.png') });
        links.push('console-summary.png');
      }
      for (const [fileIndex, file] of [...new Set(rows.map(row => row.file))].entries()) {
        const subset = rows.filter(row => row.file === file);
        for (let offset = 0; offset < subset.length; offset += 12) {
          const stem = `cases-${String(fileIndex + 1).padStart(2, '0')}-${String(offset / 12 + 1).padStart(2, '0')}`;
          const detail = document(title, meta + `<h2>${escape(file)}</h2><p>Kasus ${offset + 1}–${Math.min(offset + 12, subset.length)} dari ${subset.length}</p>` + table(subset.slice(offset, offset + 12)) + '<p class="foot">Sumber: results.json pada folder yang sama.</p>');
          fs.writeFileSync(path.join(directory, stem + '.html'), detail);
          await page.setContent(detail);
          await page.locator('body').screenshot({ path: path.join(directory, stem + '.png') });
          links.push(stem + '.png');
        }
      }
      const csv = [['file', 'test_case', 'actual_status'], ...rows.map(row => [row.file, row.title, row.status])].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
      fs.writeFileSync(path.join(directory, 'test-cases.csv'), '\ufeff' + csv);
      summaries.push({ folder, title, total: rows.length, passed, failed, skipped, images: ['summary.png', ...links] });
    }
    const index = document('Bukti QA Sprint 4', `<p>Commit aplikasi: <code>${escape(metadata?.commit)}</code></p>${summaries.map(s => `<h2>${escape(s.title)}</h2><p>${s.passed}/${s.total} passed, ${s.failed} failed, ${s.skipped} skipped.</p><ul>${s.images.map(image => `<li><a href="${s.folder}/${image}">${s.folder}/${image}</a></li>`).join('')}</ul>`).join('')}<h2>Bukti aplikasi</h2><p><a href="playwright/report/index.html">Laporan HTML Playwright</a> · <a href="playwright/screenshots/">Screenshot alur aplikasi</a> · <a href="run.json">Metadata pengujian dan batas cakupan</a></p>`);
    fs.writeFileSync(path.join(output, 'index.html'), index);
    fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summaries, null, 2));
  } finally { await browser.close(); }
}

module.exports = { renderEvidence };
