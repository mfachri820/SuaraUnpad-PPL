import crypto from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiRequest, createUser, ctx, prisma, readJson, resetDatabase, type TestUser } from './helpers';
import { GET as listComments, POST as createComment } from '@/app/api/comments/route';
import { DELETE as deleteComment } from '@/app/api/comments/[id]/route';
import { POST as upvoteComment } from '@/app/api/comments/[id]/upvote/route';
import { POST as upvotePost } from '@/app/api/posts/[id]/upvote/route';
import { GET as getPost } from '@/app/api/posts/[id]/route';
import { PATCH as readOne } from '@/app/api/notifications/[id]/read/route';
import { GET as getUser } from '@/app/api/users/[id]/route';
import { GET as health } from '@/app/api/health/route';
import { POST as midtransWebhook } from '@/app/api/webhooks/midtrans/route';

describe('Perbaikan inti (DB asli)', () => {
  let alice: TestUser;
  let bob: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    await resetDatabase();
    alice = await createUser('STUDENT', { name: 'Alice' });
    bob = await createUser('STUDENT', { name: 'Bob' });
    admin = await createUser('ADMIN', { name: 'Admin Satu' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('komentar', () => {
    let postId: string;
    let otherPostId: string;
    let rootId: string;

    beforeAll(async () => {
      postId = (await prisma.post.create({ data: { authorId: alice.id, title: 'a', content: 'a' } })).id;
      otherPostId = (await prisma.post.create({ data: { authorId: alice.id, title: 'b', content: 'b' } })).id;
      rootId = (await readJson(await createComment(apiRequest('POST', '/api/comments', { user: bob, body: { postId, content: 'root' } })))).body.data.id;
    });

    it('balasan hanya 1 level dan harus di diskusi yang sama', async () => {
      const reply = await readJson(await createComment(apiRequest('POST', '/api/comments', { user: alice, body: { postId, parentId: rootId, content: 'reply' } })));
      expect(reply.status).toBe(201);

      const replyToReply = await createComment(
        apiRequest('POST', '/api/comments', { user: bob, body: { postId, parentId: reply.body.data.id, content: 'nested' } })
      );
      const crossPost = await createComment(
        apiRequest('POST', '/api/comments', { user: bob, body: { postId: otherPostId, parentId: rootId, content: 'x' } })
      );
      const twoTargets = await createComment(
        apiRequest('POST', '/api/comments', { user: bob, body: { postId, policyId: postId, content: 'x' } })
      );
      const missingPost = await createComment(
        apiRequest('POST', '/api/comments', { user: bob, body: { postId: '00000000-0000-4000-8000-000000000000', content: 'x' } })
      );
      expect([replyToReply.status, crossPost.status, twoTargets.status, missingPost.status]).toEqual([400, 400, 400, 404]);
    });

    it('author balasan admin punya displayName & role (bukan "Anonim")', async () => {
      await createComment(apiRequest('POST', '/api/comments', { user: admin, body: { postId, parentId: rootId, content: 'dari admin' } }));
      const { body } = await readJson(await listComments(apiRequest('GET', `/api/comments?postId=${postId}`, { user: bob })));
      const adminReply = body.data.data[0].replies.find((r: { content: string }) => r.content === 'dari admin');
      expect(adminReply.author).toMatchObject({ displayName: 'Admin Satu', role: 'ADMIN' });
      expect(adminReply.author.email).toBeUndefined();
    });

    it('upvote paralel tidak menghasilkan 500 dan notifikasi tidak dobel saat di-toggle', async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () => upvoteComment(apiRequest('POST', '/x', { user: alice }), ctx(rootId)))
      );
      expect(results.every((r) => r.status === 200)).toBe(true);

      for (let i = 0; i < 3; i++) await upvoteComment(apiRequest('POST', '/x', { user: alice }), ctx(rootId));
      const notifs = await prisma.notification.count({ where: { type: 'UPVOTE_COMMENT', commentId: rootId, actorId: alice.id } });
      expect(notifs).toBe(1);

      const upvotes = await prisma.commentUpvote.count({ where: { commentId: rootId } });
      const { body } = await readJson(await listComments(apiRequest('GET', `/api/comments?postId=${postId}`, { user: alice })));
      const root = body.data.data.find((c: { id: string }) => c.id === rootId);
      expect(root._count.commentUpvotes).toBe(upvotes);
      expect(root.hasUpvoted).toBe(upvotes === 1);
      expect(root.commentUpvotes).toBeUndefined();
    });

    it('upvote post memberi hasUpvoted per user', async () => {
      await upvotePost(apiRequest('POST', '/x', { user: bob }), ctx(postId));
      const asBob = await readJson(await getPost(apiRequest('GET', '/x', { user: bob }), ctx(postId)));
      const asAlice = await readJson(await getPost(apiRequest('GET', '/x', { user: alice }), ctx(postId)));
      expect(asBob.body.data.hasUpvoted).toBe(true);
      expect(asAlice.body.data.hasUpvoted).toBe(false);
      expect(asBob.body.data._count.postUpvotes).toBe(1);
    });

    it('author menghapus komentarnya sendiri: soft delete, konten asli tetap di DB', async () => {
      const res = await deleteComment(apiRequest('DELETE', '/x', { user: bob }), ctx(rootId));
      expect(res.status).toBe(200);
      const row = await prisma.comment.findUniqueOrThrow({ where: { id: rootId } });
      expect(row.deletedAt).not.toBeNull();
      expect(row.content).toBe('root');

      const forbidden = await deleteComment(apiRequest('DELETE', '/x', { user: alice }), ctx(rootId));
      expect(forbidden.status).toBe(403);
    });
  });

  describe('notifikasi', () => {
    it('PATCH /api/notifications/:id/read hanya menandai satu notifikasi milik sendiri', async () => {
      const [n1, n2] = await Promise.all([
        prisma.notification.create({ data: { recipientId: alice.id, actorId: bob.id, type: 'UPVOTE_POST' } }),
        prisma.notification.create({ data: { recipientId: alice.id, actorId: bob.id, type: 'UPVOTE_POST' } })
      ]);

      expect((await readOne(apiRequest('PATCH', '/x', { user: bob }), ctx(n1.id))).status).toBe(403);
      expect((await readOne(apiRequest('PATCH', '/x', { user: alice }), ctx(n1.id))).status).toBe(200);

      const rows = await prisma.notification.findMany({ where: { id: { in: [n1.id, n2.id] } } });
      expect(rows.find((n) => n.id === n1.id)?.isRead).toBe(true);
      expect(rows.find((n) => n.id === n2.id)?.isRead).toBe(false);
    });
  });

  describe('users', () => {
    it('profil lengkap user lain hanya bisa dilihat admin', async () => {
      expect((await getUser(apiRequest('GET', '/x', { user: alice }), ctx(bob.id))).status).toBe(403);
      expect((await getUser(apiRequest('GET', '/x', { user: alice }), ctx(alice.id))).status).toBe(200);
      expect((await getUser(apiRequest('GET', '/x', { user: admin }), ctx(bob.id))).status).toBe(200);
    });
  });

  describe('health', () => {
    it('benar-benar mengecek database', async () => {
      const { status, body } = await readJson(await health());
      expect(status).toBe(200);
      expect(body).toMatchObject({ status: 'ok', database: 'connected' });
    });
  });

  describe('webhook Midtrans', () => {
    it('notifikasi settlement paralel hanya menambah saldo kampanye sekali', async () => {
      process.env.MIDTRANS_SERVER_KEY = 'integration-server-key';
      const campaign = await prisma.donationCampaign.create({
        data: { title: 'Kampanye', description: 'd', targetAmount: BigInt(1_000_000), bannerUrl: 'https://res.cloudinary.com/x/y.jpg' }
      });
      await prisma.transaction.create({
        data: { userId: alice.id, campaignId: campaign.id, orderId: 'ORDER-INT-1', amount: BigInt(50_000) }
      });

      const payload = { order_id: 'ORDER-INT-1', status_code: '200', gross_amount: '50000.00', transaction_status: 'settlement' };
      const signature_key = crypto
        .createHash('sha512')
        .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
        .digest('hex');
      const send = () =>
        midtransWebhook(new Request('http://localhost/api/webhooks/midtrans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, signature_key })
        }));

      const responses = await Promise.all(Array.from({ length: 5 }, send));
      expect(responses.every((r) => r.status === 200)).toBe(true);

      const updated = await prisma.donationCampaign.findUniqueOrThrow({ where: { id: campaign.id } });
      expect(updated.collectedAmount).toBe(BigInt(50_000));
      const trx = await prisma.transaction.findUniqueOrThrow({ where: { orderId: 'ORDER-INT-1' } });
      expect(trx.paymentStatus).toBe('SUCCESS');
    });
  });
});
