import { test, expect, api, aspiration, screenshot } from '../support/fixtures';

test('E2E-HTTP-01 proxy menolak non-admin, token tidak valid, belum verifikasi, dan pemalsuan header identitas', async ({ actors, request }, info) => {
  info.annotations.push({ type: 'scope', description: 'HTTP authorization checks through the real running application.' });
  const post = await aspiration(actors.author, 'HTTP E2E01 Konten perlindungan akses');
  for (const actor of [actors.reporter, actors.lecturer]) {
    expect((await api(actor, 'GET', '/api/admin/flags')).status()).toBe(403);
    expect((await api(actor, 'POST', '/api/posts', { kind: 'ANNOUNCEMENT', title: 'Pengumuman tidak sah', content: 'Harus ditolak.' })).status()).toBe(403);
    expect((await api(actor, 'POST', `/api/admin/posts/${post.id}/close`, { reason: 'Tidak boleh dilakukan non-admin.' })).status()).toBe(403);
  }
  expect((await request.get('/api/admin/flags')).status()).toBe(401);
  expect((await request.get('/api/admin/flags', { headers: { Authorization: 'Bearer invalid' } })).status()).toBe(401);
  expect((await api(actors.unverified, 'GET', '/api/posts')).status()).toBe(403);
  expect((await actors.reporter.context.request.get('/api/admin/flags', {
    headers: { Authorization: `Bearer ${actors.reporter.token}`, 'x-user-id': actors.admin.id, 'x-user-role': 'ADMIN' },
  })).status()).toBe(403);
  await actors.reporter.page.goto('/admin');
  await expect(actors.reporter.page).toHaveURL(/\/home$/);
  await expect(actors.reporter.page.getByRole('heading', { name: 'Antrean moderasi', exact: true })).toHaveCount(0);
  await screenshot(actors.reporter.page, info, 'HTTP-01-non-admin-diarahkan-ke-beranda');
});

test('E2E-HTTP-02 upload pengumuman menolak MIME salah, gambar palsu, dan ukuran di atas 5 MiB', async ({ actors }, info) => {
  info.annotations.push({ type: 'scope', description: 'Real HTTP upload validation; no successful Cloudinary upload is claimed.' });
  const outcomes = [];
  for (const sample of [
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Bukan gambar') },
    { name: 'fake.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('Bukan JPEG asli') },
    { name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) },
  ]) {
    const response = await actors.admin.context.request.post('/api/uploads', {
      headers: { Authorization: `Bearer ${actors.admin.token}` },
      multipart: { file: sample, folder: 'announcements' },
    });
    expect(response.status()).toBe(400);
    outcomes.push({ file: sample.name, status: response.status(), response: await response.json() });
  }
  await info.attach('HTTP-upload-validation.json', { body: JSON.stringify(outcomes, null, 2), contentType: 'application/json' });
});
