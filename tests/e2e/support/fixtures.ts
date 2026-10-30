import fs from 'node:fs';
import path from 'node:path';
import { test as base, expect, type BrowserContext, type Page, type Locator, type TestInfo } from '@playwright/test';
import { root } from '../../qa/environment.cjs';

type Role = 'admin' | 'author' | 'reporter' | 'lecturer' | 'unverified';
export interface Actor {
  page: Page;
  context: BrowserContext;
  token: string;
  id: string;
  email: string;
  name: string;
}
type Actors = Record<Role, Actor>;

export const test = base.extend<{ actors: Actors }>({
  actors: async ({ browser, baseURL }, provide, info) => {
    const seed = JSON.parse(fs.readFileSync(path.join(root, 'tests/results/sprint-4/playwright/fixtures.json'), 'utf8'));
    const actors = {} as Actors;
    try {
      for (const role of ['admin', 'author', 'reporter', 'lecturer', 'unverified'] as const) {
        const context = await browser.newContext({ baseURL, viewport: { width: 1366, height: 900 } });
        const response = await context.request.post('/api/auth/login', { data: { email: seed[role].email, password: 'Sprint4QaPassword!' } });
        expect(response.status(), `Login fixture ${role}`).toBe(200);
        const json = await response.json();
        const token = json.data.token;
        expect(typeof token).toBe('string');
        await context.addCookies([{ name: 'token', value: token, url: baseURL! }]);
        const page = await context.newPage();
        // Third-party login widgets are outside this QA scope. Application APIs are never mocked.
        await page.route('https://accounts.google.com/**', route => route.abort());
        actors[role] = { context, page, token, ...seed[role] };
      }
      await provide(actors);
    } finally {
      if (info.status !== info.expectedStatus) {
        for (const [role, actor] of Object.entries(actors)) {
          await actor.page.screenshot({ path: info.outputPath(`failure-${role}.png`), fullPage: true }).catch(() => {});
        }
      }
      await Promise.all(Object.values(actors).map(actor => actor.context.close()));
    }
  },
});

export { expect };

export async function api(actor: Actor, method: string, url: string, data?: unknown) {
  return actor.context.request.fetch(url, { method, headers: { Authorization: `Bearer ${actor.token}` }, data });
}

export async function aspiration(actor: Actor, title: string) {
  const response = await api(actor, 'POST', '/api/posts', { title, content: `Isi ${title}.` });
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}

export async function comment(actor: Actor, postId: string, content: string) {
  const response = await api(actor, 'POST', '/api/comments', { postId, content });
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}

export async function screenshot(page: Page, info: TestInfo, name: string, target?: Locator) {
  const folder = path.join(root, 'tests/results/sprint-4/playwright/screenshots');
  fs.mkdirSync(folder, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  const destination = path.join(folder, `${name}.png`);
  if (target) await target.screenshot({ path: destination });
  else await page.screenshot({ path: destination, fullPage: true });
  await info.attach(name, { path: destination, contentType: 'image/png' });
}

export async function publishAnnouncement(admin: Actor, title: string, content: string, pinDays?: number) {
  await admin.page.goto('/admin/content');
  await admin.page.getByLabel('Judul pengumuman', { exact: true }).fill(title);
  await admin.page.getByLabel('Isi pengumuman', { exact: true }).fill(content);
  if (pinDays) {
    await admin.page.locator('#announcement-pin').click();
    await admin.page.getByRole('option', { name: `${pinDays} hari`, exact: true }).click();
  }
  const response = admin.page.waitForResponse(res => res.url().endsWith('/api/posts') && res.request().method() === 'POST');
  await admin.page.getByRole('button', { name: 'Buat pengumuman', exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(201);
  await expect(admin.page.locator('#pengumuman-baru').getByRole('status')).toContainText('berhasil');
  return (await result.json()).data;
}

export async function openPostMenu(page: Page) {
  await page.locator('article').getByRole('button').first().click();
}

export async function reportPost(actor: Actor, postId: string) {
  await actor.page.goto(`/aspirasi/${postId}`);
  await openPostMenu(actor.page);
  await actor.page.getByRole('button', { name: 'Laporkan', exact: true }).click();
  await actor.page.getByRole('radio', { name: 'Hoaks / informasi palsu', exact: true }).check();
  const response = actor.page.waitForResponse(res => res.url().endsWith('/api/flags') && res.request().method() === 'POST');
  await actor.page.getByRole('button', { name: 'Kirim Laporan', exact: true }).click();
  expect((await response).status()).toBe(201);
}
