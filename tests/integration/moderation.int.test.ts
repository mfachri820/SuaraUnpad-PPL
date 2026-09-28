import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiRequest, createUser, ctx, prisma, readJson, resetDatabase, type TestUser } from './helpers';
import { POST as createPost } from '@/app/api/posts/route';
import { GET as getPost, PATCH as patchPost, DELETE as deletePost } from '@/app/api/posts/[id]/route';
import { POST as upvotePost } from '@/app/api/posts/[id]/upvote/route';
import { GET as listComments, POST as createComment } from '@/app/api/comments/route';
import { PATCH as patchComment } from '@/app/api/comments/[id]/route';
import { POST as upvoteComment } from '@/app/api/comments/[id]/upvote/route';
import { POST as createFlag } from '@/app/api/flags/route';
import { GET as getQueue } from '@/app/api/admin/flags/route';
import { POST as dismissFlags } from '@/app/api/admin/flags/dismiss/route';
import { POST as closePost, DELETE as reopenPost } from '@/app/api/admin/posts/[id]/close/route';
import { POST as removeComment } from '@/app/api/admin/comments/[id]/remove/route';
import { GET as getStats } from '@/app/api/admin/stats/route';

describe('Moderasi: laporan konten, hapus komentar, tutup postingan (DB asli)', () => {
  let admin: TestUser;
  let author: TestUser;
  let reporter: TestUser;
  let reporter2: TestUser;
  let postId: string;
  let commentId: string;

  beforeAll(async () => {
    await resetDatabase();
    admin = await createUser('ADMIN');
    author = await createUser('STUDENT', { name: 'Penulis Aspirasi' });
    reporter = await createUser('STUDENT');
    reporter2 = await createUser('LECTURER');

    const post = await readJson(
      await createPost(apiRequest('POST', '/api/posts', { user: author, body: { content: 'AC ruang kelas rusak parah' } }))
    );
    expect(post.status).toBe(201);
    postId = post.body.data.id;

    const comment = await readJson(
      await createComment(apiRequest('POST', '/api/comments', { user: author, body: { postId, content: 'Komentar yang nanti dilaporkan' } }))
    );
    expect(comment.status).toBe(201);
    commentId = comment.body.data.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/flags', () => {
    it('menerima laporan komentar dan postingan dari user lain', async () => {
      const r1 = await createFlag(apiRequest('POST', '/api/flags', { user: reporter, body: { commentId, reason: 'SPAM', note: 'promosi' } }));
      const r2 = await createFlag(apiRequest('POST', '/api/flags', { user: reporter2, body: { commentId, reason: 'UJARAN_KEBENCIAN' } }));
      const r3 = await createFlag(apiRequest('POST', '/api/flags', { user: reporter, body: { postId, reason: 'HOAKS' } }));
      expect([r1.status, r2.status, r3.status]).toEqual([201, 201, 201]);
    });

    it('menolak laporan dobel dari user yang sama (409)', async () => {
      const { status, body } = await readJson(
        await createFlag(apiRequest('POST', '/api/flags', { user: reporter, body: { commentId, reason: 'SPAM' } }))
      );
      expect(status).toBe(409);
      expect(body.code).toBe('DUPLICATE_FLAG');
    });

    it('menolak melaporkan konten sendiri (400)', async () => {
      const { status, body } = await readJson(
        await createFlag(apiRequest('POST', '/api/flags', { user: author, body: { postId, reason: 'SPAM' } }))
      );
      expect(status).toBe(400);
      expect(body.message).toMatch(/milikmu sendiri/);
    });

    it('menolak tanpa target / dua target sekaligus / alasan tidak valid (400)', async () => {
      const none = await createFlag(apiRequest('POST', '/api/flags', { user: reporter, body: { reason: 'SPAM' } }));
      const both = await createFlag(apiRequest('POST', '/api/flags', { user: reporter, body: { postId, commentId, reason: 'SPAM' } }));
      const bad = await createFlag(apiRequest('POST', '/api/flags', { user: reporter2, body: { postId, reason: 'NGAWUR' } }));
      expect([none.status, both.status, bad.status]).toEqual([400, 400, 400]);
    });

    it('404 untuk konten yang tidak ada, 401 tanpa login', async () => {
      const missing = await createFlag(
        apiRequest('POST', '/api/flags', { user: reporter, body: { postId: '00000000-0000-4000-8000-000000000000', reason: 'SPAM' } })
      );
      const anon = await createFlag(apiRequest('POST', '/api/flags', { body: { postId, reason: 'SPAM' } }));
      expect(missing.status).toBe(404);
      expect(anon.status).toBe(401);
    });

    it('CHECK constraint DB menolak flag tanpa target', async () => {
      await expect(
        prisma.contentFlag.create({ data: { reporterId: reporter.id, reason: 'SPAM' } })
      ).rejects.toThrow();
    });
  });

  describe('antrean admin', () => {
    it('hanya admin yang boleh membuka antrean', async () => {
      const res = await getQueue(apiRequest('GET', '/api/admin/flags?type=comment', { user: reporter }));
      expect(res.status).toBe(403);
    });

    it('mengelompokkan laporan per komentar beserta jumlah & alasan', async () => {
      const { status, body } = await readJson(await getQueue(apiRequest('GET', '/api/admin/flags?type=comment', { user: admin })));
      expect(status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({
        id: commentId,
        flagCount: 2,
        reasons: { SPAM: 1, UJARAN_KEBENCIAN: 1 },
        author: { displayName: 'Penulis Aspirasi' }
      });
      expect(body.data[0].notes).toEqual([expect.objectContaining({ note: 'promosi' })]);
    });

    it('statistik admin menghitung konten yang menunggu', async () => {
      const { body } = await readJson(await getStats(apiRequest('GET', '/api/admin/stats', { user: admin })));
      expect(body.data.pendingFlags).toEqual({ posts: 1, comments: 1, total: 2 });
    });
  });

  describe('hapus komentar oleh admin', () => {
    it('soft delete, laporan jadi ACTIONED, author dapat notifikasi', async () => {
      const { status } = await readJson(await removeComment(apiRequest('POST', '/x', { user: admin }), ctx(commentId)));
      expect(status).toBe(200);

      const comment = await prisma.comment.findUniqueOrThrow({ where: { id: commentId } });
      expect(comment.deletedAt).not.toBeNull();
      expect(comment.deletedById).toBe(admin.id);
      expect(comment.content).toBe('Komentar yang nanti dilaporkan');

      const flags = await prisma.contentFlag.findMany({ where: { commentId } });
      expect(flags.every((f) => f.status === 'ACTIONED' && f.reviewedById === admin.id)).toBe(true);

      const notif = await prisma.notification.findFirst({ where: { recipientId: author.id, type: 'CONTENT_REMOVED' } });
      expect(notif?.commentId).toBe(commentId);
    });

    it('konten komentar yang dihapus disamarkan saat dibaca', async () => {
      const { body } = await readJson(await listComments(apiRequest('GET', `/api/comments?postId=${postId}`, { user: reporter })));
      const item = body.data.data.find((c: { id: string }) => c.id === commentId);
      expect(item.isDeleted).toBe(true);
      expect(item.content).toBe('[Komentar ini telah dihapus]');
    });

    it('menghapus ulang tetap sukses (idempoten) tanpa notifikasi ganda', async () => {
      const res = await removeComment(apiRequest('POST', '/x', { user: admin }), ctx(commentId));
      expect(res.status).toBe(200);
      const count = await prisma.notification.count({ where: { recipientId: author.id, type: 'CONTENT_REMOVED' } });
      expect(count).toBe(1);
    });
  });

  describe('tutup postingan', () => {
    it('menolak alasan kurang dari 10 karakter', async () => {
      const { status, body } = await readJson(
        await closePost(apiRequest('POST', '/x', { user: admin, body: { reason: 'spam' } }), ctx(postId))
      );
      expect(status).toBe(400);
      expect(body.message).toMatch(/minimal 10/);
    });

    it('non-admin tidak bisa menutup', async () => {
      const res = await closePost(apiRequest('POST', '/x', { user: reporter, body: { reason: 'Alasan yang cukup panjang' } }), ctx(postId));
      expect(res.status).toBe(403);
    });

    it('menutup postingan, laporan jadi ACTIONED, author dapat notifikasi POST_CLOSED', async () => {
      const { status } = await readJson(
        await closePost(apiRequest('POST', '/x', { user: admin, body: { reason: '  Informasi tidak dapat diverifikasi.  ' } }), ctx(postId))
      );
      expect(status).toBe(200);

      const { body } = await readJson(await getPost(apiRequest('GET', `/api/posts/${postId}`, { user: reporter }), ctx(postId)));
      expect(body.data).toMatchObject({
        isClosed: true,
        closedReason: 'Informasi tidak dapat diverifikasi.',
        closedBy: { displayName: expect.any(String) }
      });

      const flags = await prisma.contentFlag.findMany({ where: { postId } });
      expect(flags.every((f) => f.status === 'ACTIONED')).toBe(true);
      expect(await prisma.notification.count({ where: { recipientId: author.id, type: 'POST_CLOSED', postId } })).toBe(1);
    });

    it('postingan tertutup read-only: komentar, balasan, upvote, edit, hapus oleh author → 403', async () => {
      const otherComment = await prisma.comment.create({ data: { authorId: reporter.id, postId, content: 'komentar lama' } });

      const results = await Promise.all([
        createComment(apiRequest('POST', '/api/comments', { user: reporter, body: { postId, content: 'halo' } })),
        createComment(apiRequest('POST', '/api/comments', { user: reporter, body: { postId, parentId: otherComment.id, content: 'balas' } })),
        upvotePost(apiRequest('POST', '/x', { user: reporter }), ctx(postId)),
        upvoteComment(apiRequest('POST', '/x', { user: author }), ctx(otherComment.id)),
        patchComment(apiRequest('PATCH', '/x', { user: reporter, body: { content: 'edit' } }), ctx(otherComment.id)),
        patchPost(apiRequest('PATCH', '/x', { user: author, body: { content: 'edit' } }), ctx(postId)),
        deletePost(apiRequest('DELETE', '/x', { user: author }), ctx(postId))
      ]);
      for (const res of results) {
        const { status, body } = await readJson(res);
        expect(status).toBe(403);
        expect(body.code).toBe('POST_CLOSED');
      }
    });

    it('menutup dua kali → 409, membuka kembali → komentar bisa lagi', async () => {
      const again = await closePost(apiRequest('POST', '/x', { user: admin, body: { reason: 'Alasan penutupan kedua' } }), ctx(postId));
      expect(again.status).toBe(409);

      expect((await reopenPost(apiRequest('DELETE', '/x', { user: admin }), ctx(postId))).status).toBe(200);
      expect((await reopenPost(apiRequest('DELETE', '/x', { user: admin }), ctx(postId))).status).toBe(409);

      const comment = await createComment(apiRequest('POST', '/api/comments', { user: reporter, body: { postId, content: 'sudah dibuka lagi' } }));
      expect(comment.status).toBe(201);
    });
  });

  describe('abaikan laporan', () => {
    it('mengubah laporan PENDING jadi DISMISSED, dan 404 kalau tidak ada yang menunggu', async () => {
      const flagged = await prisma.post.create({ data: { authorId: author.id, title: 'x', content: 'y' } });
      await createFlag(apiRequest('POST', '/api/flags', { user: reporter, body: { postId: flagged.id, reason: 'TIDAK_RELEVAN' } }));

      const first = await dismissFlags(apiRequest('POST', '/x', { user: admin, body: { postId: flagged.id } }));
      expect(first.status).toBe(200);
      const flag = await prisma.contentFlag.findFirstOrThrow({ where: { postId: flagged.id } });
      expect(flag.status).toBe('DISMISSED');

      const second = await dismissFlags(apiRequest('POST', '/x', { user: admin, body: { postId: flagged.id } }));
      expect(second.status).toBe(404);
    });
  });
});
