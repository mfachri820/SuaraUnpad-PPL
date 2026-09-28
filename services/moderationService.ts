import type { FlagReason, FlagStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authorSelect, toPublicAuthor } from '@/lib/author';
import { badRequest, conflict, isUniqueViolation, notFound } from '@/lib/http';

export const CLOSE_REASON_MIN = 10;
export const CLOSE_REASON_MAX = 500;
export const FLAG_NOTE_MAX = 300;

export type FlagTarget = { postId: string; commentId?: undefined } | { commentId: string; postId?: undefined };

export interface CreateFlagPayload {
  reason: FlagReason;
  note?: string;
  postId?: string;
  commentId?: string;
}

const SNIPPET_LENGTH = 200;
const QUEUE_LIMIT = 100;

function snippet(text: string) {
  return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
}

function summarizeFlags(flags: { reason: FlagReason; note: string | null; createdAt: Date }[]) {
  const reasons = {} as Partial<Record<FlagReason, number>>;
  for (const flag of flags) reasons[flag.reason] = (reasons[flag.reason] ?? 0) + 1;
  return {
    flagCount: flags.length,
    reasons,
    notes: flags
      .filter((flag) => flag.note)
      .map((flag) => ({ note: flag.note as string, createdAt: flag.createdAt })),
    latestFlagAt: flags.reduce<Date | null>(
      (latest, flag) => (!latest || flag.createdAt > latest ? flag.createdAt : latest),
      null
    )
  };
}

function reviewData(status: FlagStatus, adminId: string) {
  return { status, reviewedById: adminId, reviewedAt: new Date() };
}

const pendingFlagsSelect = {
  where: { status: 'PENDING' },
  select: { reason: true, note: true, createdAt: true }
} satisfies Prisma.Post$flagsArgs;

export const moderationService = {
  async closePost(postId: string, adminId: string, rawReason: string) {
    const reason = rawReason.trim();
    if (reason.length < CLOSE_REASON_MIN || reason.length > CLOSE_REASON_MAX) {
      throw badRequest(`Alasan penutupan wajib ${CLOSE_REASON_MIN}-${CLOSE_REASON_MAX} karakter.`);
    }

    return prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: { id: true, authorId: true, closedAt: true }
      });
      if (!post) throw notFound('Postingan tidak ditemukan');

      const { count } = await tx.post.updateMany({
        where: { id: postId, closedAt: null },
        data: { closedAt: new Date(), closedReason: reason, closedById: adminId }
      });
      if (count === 0) throw conflict('Postingan sudah ditutup.', 'POST_ALREADY_CLOSED');

      const actioned = await tx.contentFlag.updateMany({
        where: { postId, status: 'PENDING' },
        data: reviewData('ACTIONED', adminId)
      });

      if (post.authorId !== adminId) {
        await tx.notification.create({
          data: { recipientId: post.authorId, actorId: adminId, type: 'POST_CLOSED', postId }
        });
      }

      return { postId, closedReason: reason, flagsActioned: actioned.count };
    });
  },

  async reopenPost(postId: string) {
    const { count } = await prisma.post.updateMany({
      where: { id: postId, closedAt: { not: null } },
      data: { closedAt: null, closedReason: null, closedById: null }
    });
    if (count === 0) {
      const exists = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
      if (!exists) throw notFound('Postingan tidak ditemukan');
      throw conflict('Postingan tidak sedang ditutup.', 'POST_NOT_CLOSED');
    }
    return { postId };
  },

  async unpinPost(postId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { kind: true, pinnedUntil: true }
    });
    if (!post) throw notFound('Postingan tidak ditemukan');
    if (post.kind !== 'ANNOUNCEMENT') throw badRequest('Hanya pengumuman yang dapat di-pin.');
    if (!post.pinnedUntil || post.pinnedUntil <= new Date()) {
      throw conflict('Pengumuman ini sedang tidak di-pin.', 'POST_NOT_PINNED');
    }
    await prisma.post.update({ where: { id: postId }, data: { pinnedUntil: null } });
    return { postId };
  },

  async removeComment(commentId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findUnique({
        where: { id: commentId },
        select: { id: true, authorId: true, postId: true, policyId: true, deletedAt: true }
      });
      if (!comment) throw notFound('Komentar tidak ditemukan');

      const { count: removed } = await tx.comment.updateMany({
        where: { id: commentId, deletedAt: null },
        data: { deletedAt: new Date(), deletedById: adminId }
      });

      const actioned = await tx.contentFlag.updateMany({
        where: { commentId, status: 'PENDING' },
        data: reviewData('ACTIONED', adminId)
      });

      if (removed > 0 && comment.authorId !== adminId) {
        await tx.notification.create({
          data: {
            recipientId: comment.authorId,
            actorId: adminId,
            type: 'CONTENT_REMOVED',
            commentId,
            postId: comment.postId,
            policyId: comment.policyId
          }
        });
      }

      return {
        message: removed > 0 ? 'Komentar berhasil dihapus oleh admin' : 'Komentar sudah dihapus sebelumnya',
        flagsActioned: actioned.count
      };
    });
  },

  async createFlag(reporterId: string, payload: CreateFlagPayload) {
    const { postId, commentId, reason } = payload;
    const note = payload.note?.trim() || null;
    if (!postId === !commentId) throw badRequest('Pilih tepat satu konten yang dilaporkan.');

    if (postId) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true, closedAt: true }
      });
      if (!post) throw notFound('Postingan tidak ditemukan');
      if (post.authorId === reporterId) throw badRequest('Kamu tidak dapat melaporkan konten milikmu sendiri.');
      if (post.closedAt) throw badRequest('Postingan ini sudah ditutup oleh admin.');
    } else {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { authorId: true, deletedAt: true }
      });
      if (!comment) throw notFound('Komentar tidak ditemukan');
      if (comment.authorId === reporterId) throw badRequest('Kamu tidak dapat melaporkan konten milikmu sendiri.');
      if (comment.deletedAt) throw badRequest('Komentar ini sudah dihapus.');
    }

    try {
      const flag = await prisma.contentFlag.create({
        data: { reporterId, postId: postId ?? null, commentId: commentId ?? null, reason, note },
        select: { id: true, reason: true, status: true, createdAt: true }
      });
      return flag;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict('Kamu sudah melaporkan konten ini.', 'DUPLICATE_FLAG');
      }
      throw error;
    }
  },

  async dismissFlags(target: FlagTarget, adminId: string) {
    const where: Prisma.ContentFlagWhereInput = target.postId
      ? { postId: target.postId, status: 'PENDING' }
      : { commentId: target.commentId, status: 'PENDING' };
    const { count } = await prisma.contentFlag.updateMany({ where, data: reviewData('DISMISSED', adminId) });
    if (count === 0) throw notFound('Tidak ada laporan yang menunggu untuk konten ini.');
    return { flagsDismissed: count };
  },

  async getFlagQueue(type: 'post' | 'comment') {
    if (type === 'comment') {
      const comments = await prisma.comment.findMany({
        where: { flags: { some: { status: 'PENDING' } } },
        include: {
          author: { select: authorSelect },
          post: { select: { id: true, title: true, closedAt: true } },
          policy: { select: { id: true, title: true } },
          flags: pendingFlagsSelect
        }
      });

      return comments
        .map((comment) => ({
          type: 'comment' as const,
          id: comment.id,
          contentSnippet: snippet(comment.content),
          isDeleted: comment.deletedAt != null,
          author: toPublicAuthor(comment.author),
          postId: comment.postId,
          policyId: comment.policyId,
          contextTitle: comment.post?.title ?? comment.policy?.title ?? null,
          createdAt: comment.createdAt,
          ...summarizeFlags(comment.flags)
        }))
        .sort((a, b) => b.flagCount - a.flagCount)
        .slice(0, QUEUE_LIMIT);
    }

    const posts = await prisma.post.findMany({
      where: { flags: { some: { status: 'PENDING' } } },
      include: {
        author: { select: authorSelect },
        flags: pendingFlagsSelect
      }
    });

    return posts
      .map((post) => ({
        type: 'post' as const,
        id: post.id,
        kind: post.kind,
        title: post.title,
        contentSnippet: snippet(post.content),
        isClosed: post.closedAt != null,
        author: toPublicAuthor(post.author),
        postId: post.id,
        createdAt: post.createdAt,
        ...summarizeFlags(post.flags)
      }))
      .sort((a, b) => b.flagCount - a.flagCount)
      .slice(0, QUEUE_LIMIT);
  },

  async countPendingFlags() {
    const [posts, comments] = await Promise.all([
      prisma.post.count({ where: { flags: { some: { status: 'PENDING' } } } }),
      prisma.comment.count({ where: { flags: { some: { status: 'PENDING' } } } })
    ]);
    return { posts, comments, total: posts + comments };
  }
};
