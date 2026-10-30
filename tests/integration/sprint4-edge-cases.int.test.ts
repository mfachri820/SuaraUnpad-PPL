import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiRequest, createUser, ctx, prisma, readJson, resetDatabase, type TestUser } from './helpers';
import { POST as createPost } from '@/app/api/posts/route';
import { POST as createComment } from '@/app/api/comments/route';
import { POST as createFlag } from '@/app/api/flags/route';
import { POST as closePost } from '@/app/api/admin/posts/[id]/close/route';
import { POST as removeComment } from '@/app/api/admin/comments/[id]/remove/route';

describe('Sprint 4 — boundary dan concurrency pengumuman/moderasi (DB asli)', () => {
  let admin: TestUser;
  let author: TestUser;
  let reporter: TestUser;
  let lecturer: TestUser;
  let unverified: TestUser;

  beforeAll(async () => {
    await resetDatabase();
    admin = await createUser('ADMIN');
    author = await createUser('STUDENT');
    reporter = await createUser('STUDENT');
    lecturer = await createUser('LECTURER');
    unverified = await createUser('STUDENT', { isVerified: false });
  });

  afterAll(async () => { await prisma.$disconnect(); });

  const announcement = (body: Record<string, unknown>, user: TestUser = admin) => createPost(
    apiRequest('POST', '/api/posts', { user, body: { kind: 'ANNOUNCEMENT', title: 'Informasi resmi FMIPA', content: 'Isi pengumuman.', ...body } })
  );

  async function aspiration() {
    const response = await readJson(await createPost(apiRequest('POST', '/api/posts', { user: author, body: { content: 'Konten aspirasi untuk pengujian moderasi.' } })));
    expect(response.status).toBe(201);
    return response.body.data.id as string;
  }

  describe('REQ-03 Pengumuman', () => {
    it.each([
      { label: 'kosong', title: '', status: 400 },
      { label: 'spasi', title: '     ', status: 400 },
      { label: '4 karakter', title: 'a'.repeat(4), status: 400 },
      { label: '5 karakter', title: 'a'.repeat(5), status: 201 },
      { label: '150 karakter', title: 'a'.repeat(150), status: 201 },
      { label: '151 karakter', title: 'a'.repeat(151), status: 400 },
    ])('ANN-B01 judul $label menghasilkan $status', async ({ title, status }) => {
      expect((await announcement({ title })).status).toBe(status);
    });

    it.each([
      { label: 'kosong', content: '', status: 400 },
      { label: 'spasi', content: '   ', status: 400 },
      { label: '1 karakter', content: 'a', status: 201 },
      { label: '5000 karakter', content: 'a'.repeat(5000), status: 201 },
      { label: '5001 karakter', content: 'a'.repeat(5001), status: 400 },
    ])('ANN-B02 isi $label menghasilkan $status', async ({ content, status }) => {
      expect((await announcement({ content })).status).toBe(status);
    });

    it.each([1, 3, 7, 30])('ANN-B03 pin %i hari tersimpan sesuai durasi', async days => {
      const start = Date.now();
      const { status, body } = await readJson(await announcement({ pinDays: days }));
      expect(status).toBe(201);
      expect(body.data.isPinned).toBe(true);
      expect(Math.abs(new Date(body.data.pinnedUntil).getTime() - start - days * 86400000)).toBeLessThan(5000);
    });

    it.each([0, 5, -1, '3', null])('ANN-B04 nilai pin %j ditolak', async pinDays => {
      expect((await announcement({ pinDays })).status).toBe(400);
    });

    it('ANN-B05 dosen ditolak membuat pengumuman', async () => {
      expect((await announcement({}, lecturer)).status).toBe(403);
    });

    it('ANN-B06 notifikasi mencakup mahasiswa/dosen terverifikasi, mengecualikan pembuat dan user belum terverifikasi', async () => {
      const { body } = await readJson(await announcement({}));
      const recipients = await prisma.notification.findMany({ where: { postId: body.data.id, type: 'NEW_ANNOUNCEMENT' } });
      expect(recipients.map(n => n.recipientId).sort()).toEqual([author.id, reporter.id, lecturer.id].sort());
      expect(recipients.some(n => n.recipientId === admin.id || n.recipientId === unverified.id)).toBe(false);
    });

    it('ANN-B07 penolakan input tidak menyimpan pengumuman atau notifikasi', async () => {
      const postsBefore = await prisma.post.count();
      const notificationsBefore = await prisma.notification.count();
      expect((await announcement({ title: 'x' })).status).toBe(400);
      expect(await prisma.post.count()).toBe(postsBefore);
      expect(await prisma.notification.count()).toBe(notificationsBefore);
    });

    it('ANN-B08 pengumuman tidak dapat dikaitkan dengan wacana', async () => {
      const policy = await prisma.policy.create({ data: { authorId: lecturer.id, title: 'Wacana uji', content: 'Isi', status: 'ACTIVE' } });
      expect((await announcement({ policyId: policy.id })).status).toBe(400);
    });
  });

  describe('REQ-04 Moderasi', () => {
    it.each(['SPAM', 'UJARAN_KEBENCIAN', 'PELECEHAN', 'HOAKS', 'TIDAK_RELEVAN', 'LAINNYA'])('MOD-B01 alasan %s diterima', async reason => {
      const postId = await aspiration();
      expect((await createFlag(apiRequest('POST', '/api/flags', { user: reporter, body: { postId, reason } }))).status).toBe(201);
    });

    it.each([
      { label: 'tanpa catatan', note: undefined, status: 201 },
      { label: '300 karakter', note: 'a'.repeat(300), status: 201 },
      { label: '301 karakter', note: 'a'.repeat(301), status: 400 },
    ])('MOD-B02 catatan $label menghasilkan $status', async ({ note, status }) => {
      const postId = await aspiration();
      expect((await createFlag(apiRequest('POST', '/api/flags', { user: reporter, body: { postId, reason: 'SPAM', note } }))).status).toBe(status);
    });

    it.each([
      { label: 'kosong', reason: '', status: 400 },
      { label: 'spasi', reason: '          ', status: 400 },
      { label: '9 karakter', reason: 'a'.repeat(9), status: 400 },
      { label: '10 karakter', reason: 'a'.repeat(10), status: 200 },
      { label: '500 karakter', reason: 'a'.repeat(500), status: 200 },
      { label: '501 karakter', reason: 'a'.repeat(501), status: 400 },
    ])('MOD-B03 alasan penutupan $label menghasilkan $status', async ({ reason, status }) => {
      const postId = await aspiration();
      expect((await closePost(apiRequest('POST', '/close', { user: admin, body: { reason } }), ctx(postId))).status).toBe(status);
      const post = await prisma.post.findUniqueOrThrow({ where: { id: postId } });
      expect(post.closedAt !== null).toBe(status === 200);
    });

    it('MOD-B04 dua laporan bersamaan dari user sama menghasilkan satu flag', async () => {
      const postId = await aspiration();
      const responses = await Promise.all([1, 2].map(() => createFlag(apiRequest('POST', '/api/flags', { user: reporter, body: { postId, reason: 'SPAM' } }))));
      expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
      expect(await prisma.contentFlag.count({ where: { postId, reporterId: reporter.id } })).toBe(1);
    });

    it('MOD-B05 penutupan bersamaan tidak membuat notifikasi ganda', async () => {
      const postId = await aspiration();
      const responses = await Promise.all([1, 2].map(() => closePost(apiRequest('POST', '/close', { user: admin, body: { reason: 'Konten melanggar aturan kampus.' } }), ctx(postId))));
      expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
      expect(await prisma.notification.count({ where: { postId, type: 'POST_CLOSED' } })).toBe(1);
    });

    it('MOD-B06 hapus komentar bersamaan tetap idempoten dan notifikasi hanya satu', async () => {
      const postId = await aspiration();
      const comment = await readJson(await createComment(apiRequest('POST', '/api/comments', { user: author, body: { postId, content: 'Komentar yang dihapus.' } })));
      const commentId = comment.body.data.id;
      const responses = await Promise.all([1, 2].map(() => removeComment(apiRequest('POST', '/remove', { user: admin }), ctx(commentId))));
      expect(responses.map(r => r.status)).toEqual([200, 200]);
      expect(await prisma.notification.count({ where: { commentId, type: 'CONTENT_REMOVED' } })).toBe(1);
    });
  });
});
