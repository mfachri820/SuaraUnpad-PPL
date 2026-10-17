import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    post: { findUnique: vi.fn(), updateMany: vi.fn() },
    comment: { findUnique: vi.fn(), create: vi.fn() },
    contentFlag: { create: vi.fn(), updateMany: vi.fn() },
    postUpvote: { deleteMany: vi.fn(), create: vi.fn() },
    notification: { create: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn()
  }
}));

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/http';
import { moderationService } from '@/services/moderationService';
import { commentService } from '@/services/commentService';
import { postService } from '@/services/postService';

const db = vi.mocked(prisma, true);

async function expectHttpError(promise: Promise<unknown>, status: number, code?: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
  if (code) expect((error as HttpError).code).toBe(code);
}

describe('moderationService (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closePost menolak alasan di bawah 10 karakter tanpa menyentuh DB', async () => {
    await expectHttpError(moderationService.closePost('post-1', 'admin-1', '  singkat  '), 400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('closePost menandai laporan PENDING sebagai ACTIONED dan memberi tahu author', async () => {
    const tx = {
      post: {
        findUnique: vi.fn().mockResolvedValue({ id: 'post-1', authorId: 'author-1', closedAt: null }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      contentFlag: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
      notification: { create: vi.fn() }
    };
    db.$transaction.mockImplementation(async (cb: unknown) => (cb as (t: typeof tx) => unknown)(tx));

    const result = await moderationService.closePost('post-1', 'admin-1', 'Konten tidak sesuai aturan');

    expect(result).toMatchObject({ flagsActioned: 2, closedReason: 'Konten tidak sesuai aturan' });
    expect(tx.contentFlag.updateMany).toHaveBeenCalledWith({
      where: { postId: 'post-1', status: 'PENDING' },
      data: expect.objectContaining({ status: 'ACTIONED', reviewedById: 'admin-1' })
    });
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: { recipientId: 'author-1', actorId: 'admin-1', type: 'POST_CLOSED', postId: 'post-1' }
    });
  });

  it('removeComment mengubah laporan jadi ACTIONED dan mengirim CONTENT_REMOVED', async () => {
    const tx = {
      comment: {
        findUnique: vi.fn().mockResolvedValue({ id: 'c-1', authorId: 'author-1', postId: 'post-1', policyId: null, deletedAt: null }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      contentFlag: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) },
      notification: { create: vi.fn() }
    };
    db.$transaction.mockImplementation(async (cb: unknown) => (cb as (t: typeof tx) => unknown)(tx));

    const result = await moderationService.removeComment('c-1', 'admin-1');

    expect(result.flagsActioned).toBe(3);
    expect(tx.comment.updateMany).toHaveBeenCalledWith({
      where: { id: 'c-1', deletedAt: null },
      data: expect.objectContaining({ deletedById: 'admin-1' })
    });
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ recipientId: 'author-1', type: 'CONTENT_REMOVED', commentId: 'c-1' })
    });
  });

  it('createFlag: melaporkan konten sendiri → 400', async () => {
    db.post.findUnique.mockResolvedValue({ authorId: 'user-1', closedAt: null } as never);
    await expectHttpError(moderationService.createFlag('user-1', { postId: 'post-1', reason: 'SPAM' }), 400);
    expect(db.contentFlag.create).not.toHaveBeenCalled();
  });

  it('createFlag: laporan dobel (P2002) → 409', async () => {
    db.comment.findUnique.mockResolvedValue({ authorId: 'author-1', deletedAt: null } as never);
    db.contentFlag.create.mockRejectedValue(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }));
    await expectHttpError(
      moderationService.createFlag('user-2', { commentId: 'c-1', reason: 'SPAM' }),
      409,
      'DUPLICATE_FLAG'
    );
  });
});

describe('penegakan postingan tertutup (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('komentar ke postingan tertutup ditolak 403 POST_CLOSED', async () => {
    db.post.findUnique.mockResolvedValue({ authorId: 'author-1', closedAt: new Date() } as never);
    await expectHttpError(commentService.createComment('user-2', { postId: 'post-1', content: 'halo' }), 403, 'POST_CLOSED');
    expect(db.comment.create).not.toHaveBeenCalled();
  });

  it('upvote postingan tertutup ditolak 403, pengumuman ditolak 400', async () => {
    db.post.findUnique.mockResolvedValueOnce({ id: 'p', authorId: 'a', kind: 'ASPIRASI', closedAt: new Date() } as never);
    await expectHttpError(postService.toggleUpvote('p', 'u'), 403, 'POST_CLOSED');

    db.post.findUnique.mockResolvedValueOnce({ id: 'p', authorId: 'a', kind: 'ANNOUNCEMENT', closedAt: null } as never);
    await expectHttpError(postService.toggleUpvote('p', 'u'), 400);

    expect(db.postUpvote.create).not.toHaveBeenCalled();
  });

  it('non-admin membuat pengumuman → 403', async () => {
    await expectHttpError(
      postService.createPost('user-1', 'STUDENT', { kind: 'ANNOUNCEMENT', title: 'Judul', content: 'isi' }),
      403
    );
    await expectHttpError(
      postService.createPost('dosen-1', 'LECTURER', { kind: 'ANNOUNCEMENT', title: 'Judul', content: 'isi' }),
      403
    );
  });
});
