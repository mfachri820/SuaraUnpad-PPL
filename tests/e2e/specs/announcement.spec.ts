import { test, expect, api, publishAnnouncement, openPostMenu, screenshot } from '../support/fixtures';

test('E2E-ANN-01 admin menerbitkan pengumuman, mahasiswa membaca dan membuka notifikasi', async ({ actors }, info) => {
  const title = 'ANN E2E01 Jadwal layanan akademik';
  const content = 'Layanan akademik FMIPA dibuka pukul 08.00 sampai 15.00.';
  const post = await publishAnnouncement(actors.admin, title, content);
  await screenshot(actors.admin.page, info, 'ANN-01-admin-berhasil', actors.admin.page.locator('#pengumuman-baru'));
  await actors.reporter.page.goto('/home');
  await actors.reporter.page.getByRole('button', { name: 'Pengumuman', exact: true }).click();
  await expect(actors.reporter.page.getByText(title, { exact: true })).toBeVisible();
  await actors.reporter.page.getByText(title, { exact: true }).click();
  await expect(actors.reporter.page).toHaveURL(new RegExp(`/aspirasi/${post.id}$`));
  await expect(actors.reporter.page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(actors.reporter.page.getByText(content, { exact: true })).toBeVisible();
  await screenshot(actors.reporter.page, info, 'ANN-01-mahasiswa-detail');
  await actors.reporter.page.goto('/notif');
  const notification = actors.reporter.page.getByRole('heading', { name: `Pengumuman baru: "${title}"`, exact: true });
  await expect(notification).toBeVisible();
  await screenshot(actors.reporter.page, info, 'ANN-01-notifikasi');
  await notification.click();
  await expect(actors.reporter.page).toHaveURL(new RegExp(`/aspirasi/${post.id}$`));
  expect((await api(actors.reporter, 'POST', `/api/posts/${post.id}/upvote`)).status()).toBe(400);
});

test('E2E-ANN-02 pin tampil di beranda dan lepas pin tidak menghapus pengumuman', async ({ actors }, info) => {
  const title = 'ANN E2E02 Pemeliharaan jaringan kampus';
  const post = await publishAnnouncement(actors.admin, title, 'Jaringan kampus akan diperbaiki pada hari Sabtu.', 7);
  expect(post.isPinned).toBe(true);
  await actors.reporter.page.goto('/home');
  await expect(actors.reporter.page.getByText(title, { exact: true })).toBeVisible();
  await screenshot(actors.reporter.page, info, 'ANN-02-pin-beranda');
  await actors.admin.page.goto(`/aspirasi/${post.id}`);
  await openPostMenu(actors.admin.page);
  actors.admin.page.once('dialog', dialog => dialog.accept());
  const response = actors.admin.page.waitForResponse(res => res.url().endsWith(`/api/admin/posts/${post.id}/pin`) && res.request().method() === 'DELETE');
  await actors.admin.page.getByRole('button', { name: 'Lepas Pin', exact: true }).click();
  expect((await response).status()).toBe(200);
  const pinned = await api(actors.reporter, 'GET', '/api/posts?kind=ANNOUNCEMENT&pinned=true');
  expect((await pinned.json()).data.data.map((p: { id: string }) => p.id)).not.toContain(post.id);
  await actors.reporter.page.goto('/home');
  await actors.reporter.page.getByRole('button', { name: 'Pengumuman', exact: true }).click();
  await expect(actors.reporter.page.getByText(title, { exact: true })).toBeVisible();
  await screenshot(actors.reporter.page, info, 'ANN-02-setelah-lepas-pin');
});

test('E2E-ANN-03 validasi judul gagal menampilkan error dan mempertahankan input', async ({ actors }, info) => {
  const page = actors.admin.page;
  await page.goto('/admin');
  await page.getByLabel('Judul pengumuman', { exact: true }).fill('a'.repeat(151));
  await page.getByLabel('Isi pengumuman', { exact: true }).fill('Isi tetap tersimpan ketika server menolak judul.');
  const response = page.waitForResponse(res => res.url().endsWith('/api/posts') && res.request().method() === 'POST');
  await page.getByRole('button', { name: 'Buat pengumuman', exact: true }).click();
  expect((await response).status()).toBe(400);
  await expect(page.locator('#pengumuman-baru').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Judul pengumuman', { exact: true })).toHaveValue('a'.repeat(151));
  await expect(page.getByLabel('Isi pengumuman', { exact: true })).toHaveValue('Isi tetap tersimpan ketika server menolak judul.');
  await screenshot(page, info, 'ANN-03-error-validasi', page.locator('#pengumuman-baru'));
});

test('E2E-ANN-04 pengumuman dapat dibuat dan dibaca pada layar mobile', async ({ actors }, info) => {
  await actors.admin.page.setViewportSize({ width: 390, height: 844 });
  await actors.reporter.page.setViewportSize({ width: 390, height: 844 });
  const title = 'ANN E2E04 Informasi beasiswa FMIPA';
  const post = await publishAnnouncement(actors.admin, title, 'Pendaftaran beasiswa dibuka hingga akhir bulan.');
  await screenshot(actors.admin.page, info, 'ANN-04-mobile-admin', actors.admin.page.locator('#pengumuman-baru'));
  await actors.reporter.page.goto(`/aspirasi/${post.id}`);
  await expect(actors.reporter.page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  expect(await actors.reporter.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await screenshot(actors.reporter.page, info, 'ANN-04-mobile-mahasiswa');
});
