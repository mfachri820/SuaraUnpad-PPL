import type { PostKind, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authorSelect, toPublicAuthor } from '@/lib/author';
import {
  badRequest,
  forbidden,
  isUniqueViolation,
  notFound,
  postClosedError,
  type UserRole
} from '@/lib/http';

export const ANNOUNCEMENT_PIN_DAYS = [1, 3, 7, 30] as const;
const NOTIFICATION_CHUNK_SIZE = 1000;

export interface CreatePostPayload {
  title: string;
  content: string;
  policyId?: string;
  imageUrl?: string;
  kind?: PostKind;
  pinDays?: (typeof ANNOUNCEMENT_PIN_DAYS)[number];
}

export interface GetPostsFilter {
  page?: number;
  limit?: number;
  policyId?: string;
  authorId?: string;
  kind?: PostKind;
  pinned?: boolean;
  excludePinned?: boolean;
}

const postInclude = {
  author: { select: authorSelect },
  closedBy: { select: authorSelect },
  policy: { select: { id: true, title: true } },
  _count: { select: { postUpvotes: true, comments: true } }
} satisfies Prisma.PostInclude;

type PostWithRelations = Prisma.PostGetPayload<{ include: typeof postInclude }>;

function toPostDto(post: PostWithRelations, upvotedPostIds: Set<string>, now = new Date()) {
  return {
    ...post,
    author: toPublicAuthor(post.author),
    closedBy: post.closedBy ? toPublicAuthor(post.closedBy) : null,
    isClosed: post.closedAt != null,
    isPinned: post.kind === 'ANNOUNCEMENT' && post.pinnedUntil != null && post.pinnedUntil > now,
    hasUpvoted: upvotedPostIds.has(post.id)
  };
}

async function getUpvotedPostIds(viewerId: string | undefined, postIds: string[]) {
  if (!viewerId || postIds.length === 0) return new Set<string>();
  const upvotes = await prisma.postUpvote.findMany({
    where: { userId: viewerId, postId: { in: postIds } },
    select: { postId: true }
  });
  return new Set(upvotes.map((upvote) => upvote.postId));
}

export function buildPostsWhere(filter: GetPostsFilter, now = new Date()): Prisma.PostWhereInput {
  const and: Prisma.PostWhereInput[] = [];

  if (filter.policyId) and.push({ policyId: filter.policyId });
  if (filter.authorId) and.push({ authorId: filter.authorId });
  if (filter.kind) and.push({ kind: filter.kind });
  if (filter.pinned) and.push({ kind: 'ANNOUNCEMENT', pinnedUntil: { gt: now } });
  if (filter.excludePinned) {
    and.push({
      OR: [{ kind: { not: 'ANNOUNCEMENT' } }, { pinnedUntil: null }, { pinnedUntil: { lte: now } }]
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

async function notifyAllUsersAboutAnnouncement(postId: string, authorId: string) {
  try {
    const recipients = await prisma.user.findMany({
      where: { isVerified: true, id: { not: authorId } },
      select: { id: true }
    });
    for (let i = 0; i < recipients.length; i += NOTIFICATION_CHUNK_SIZE) {
      const chunk = recipients.slice(i, i + NOTIFICATION_CHUNK_SIZE);
      await prisma.notification.createMany({
        data: chunk.map((recipient) => ({
          recipientId: recipient.id,
          actorId: authorId,
          type: 'NEW_ANNOUNCEMENT' as const,
          postId
        }))
      });
    }
  } catch (error) {
    console.error('Gagal mengirim notifikasi pengumuman:', error);
  }
}

export const postService = {
  // Membuat Postingan Baru
  async createPost(authorId: string, role: UserRole, data: CreatePostPayload) {
    const kind = data.kind ?? 'ASPIRASI';
    const isAnnouncement = kind === 'ANNOUNCEMENT';

    if (isAnnouncement && role !== 'ADMIN') {
      throw forbidden('Akses ditolak. Hanya Admin yang dapat membuat pengumuman.');
    }
    if (isAnnouncement && data.policyId) {
      throw badRequest('Pengumuman tidak dapat dikaitkan dengan kebijakan.');
    }
    if (!isAnnouncement && data.pinDays) {
      throw badRequest('Hanya pengumuman yang dapat di-pin.');
    }

    // Validasi opsional: Jika user mengirim policyId, pastikan kebijakan itu benar-benar ada
    if (data.policyId) {
      const existingPolicy = await prisma.policy.findUnique({ where: { id: data.policyId } });
      if (!existingPolicy) throw notFound('Kebijakan yang dikaitkan tidak ditemukan');
    }

    const pinnedUntil = isAnnouncement && data.pinDays
      ? new Date(Date.now() + data.pinDays * 24 * 60 * 60 * 1000)
      : null;

    const newPost = await prisma.post.create({
      data: {
        authorId,
        kind,
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl ?? null,
        policyId: data.policyId ?? null,
        pinnedUntil
      },
      include: postInclude
    });

    if (isAnnouncement) {
      await notifyAllUsersAboutAnnouncement(newPost.id, authorId);
    }

    return toPostDto(newPost, new Set());
  },

  // Mengambil Daftar Postingan dengan Pagination
  async getPosts(filter: GetPostsFilter, viewerId?: string) {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;
    const now = new Date();
    const where = buildPostsWhere(filter, now);

    const posts = await prisma.post.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }, // Urutkan dari yang terbaru
      include: postInclude
    });

    const totalItems = await prisma.post.count({ where });
    const upvoted = await getUpvotedPostIds(viewerId, posts.map((post) => post.id));

    return {
      data: posts.map((post) => toPostDto(post, upvoted, now)),
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    };
  },

  // FUNGSI GET BY ID (Melihat Detail 1 Postingan)
  async getPostById(id: string, viewerId?: string) {
    const post = await prisma.post.findUnique({ where: { id }, include: postInclude });
    if (!post) throw notFound('Postingan tidak ditemukan');

    const upvoted = await getUpvotedPostIds(viewerId, [post.id]);
    return toPostDto(post, upvoted);
  },

  // FUNGSI UPDATE (Mengedit Postingan)
  async updatePost(id: string, userId: string, data: { title?: string; content?: string }) {
    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) throw notFound('Postingan tidak ditemukan');

    // Hanya pembuat postingan yang boleh mengedit tulisannya sendiri
    if (existingPost.authorId !== userId) {
      throw forbidden('Akses ditolak. Anda hanya dapat mengubah postingan Anda sendiri.');
    }
    if (existingPost.closedAt) throw postClosedError();

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content })
      },
      include: postInclude
    });

    return toPostDto(updatedPost, new Set());
  },

  // FUNGSI DELETE (Menghapus Postingan)
  async deletePost(id: string, userId: string, userRole: string) {
    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) throw notFound('Postingan tidak ditemukan');

    // Yang boleh hapus hanya Author aslinya ATAU Admin (sebagai moderator)
    if (userRole !== 'ADMIN') {
      if (existingPost.authorId !== userId) {
        throw forbidden('Akses ditolak. Anda tidak berhak menghapus postingan ini.');
      }
      if (existingPost.closedAt) {
        throw forbidden('Postingan yang sudah ditutup admin tidak dapat dihapus.', 'POST_CLOSED');
      }
    }

    // Cascade delete akan otomatis menghapus komentar & upvote yang terkait postingan ini
    await prisma.post.delete({ where: { id } });

    return { message: 'Postingan berhasil dihapus' };
  },

  async toggleUpvote(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, kind: true, closedAt: true }
    });
    if (!post) throw notFound('Postingan tidak ditemukan');
    if (post.kind === 'ANNOUNCEMENT') throw badRequest('Pengumuman tidak dapat di-upvote.');
    if (post.closedAt) throw postClosedError();

    const removed = await prisma.postUpvote.deleteMany({ where: { userId, postId } });
    if (removed.count > 0) {
      return { action: 'unvoted', message: 'Upvote ditarik dari postingan' };
    }

    try {
      await prisma.postUpvote.create({ data: { userId, postId } });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      return { action: 'upvoted', message: 'Postingan berhasil di-upvote' };
    }

    if (post.authorId !== userId) {
      const alreadyNotified = await prisma.notification.findFirst({
        where: { recipientId: post.authorId, actorId: userId, type: 'UPVOTE_POST', postId },
        select: { id: true }
      });
      if (!alreadyNotified) {
        await prisma.notification.create({
          data: { recipientId: post.authorId, actorId: userId, type: 'UPVOTE_POST', postId }
        });
      }
    }

    return { action: 'upvoted', message: 'Postingan berhasil di-upvote' };
  }
};
