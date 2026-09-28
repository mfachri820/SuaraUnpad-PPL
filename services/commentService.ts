import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorSelect, toPublicAuthor } from "@/lib/author";
import {
  badRequest,
  forbidden,
  isUniqueViolation,
  notFound,
  postClosedError
} from "@/lib/http";
import { moderationService } from "@/services/moderationService";

export const DELETED_COMMENT_PLACEHOLDER = "[Komentar ini telah dihapus]";

// Biasa, interface/payload supaya ga pke type "any"
export interface CreateCommentPayload {
  content: string;
  postId?: string;
  policyId?: string;
  parentId?: string;
}

export interface GetCommentsFilter {
  postId?: string;
  policyId?: string;
  page?: number;
  limit?: number;
}

const commentFields = {
  author: { select: authorSelect },
  _count: { select: { commentUpvotes: true } }
} satisfies Prisma.CommentInclude;

type CommentRecord = Prisma.CommentGetPayload<{ include: typeof commentFields }>;

function isDeleted(comment: { deletedAt: Date | null; content: string }) {
  return comment.deletedAt != null || comment.content === DELETED_COMMENT_PLACEHOLDER;
}

function toCommentDto(comment: CommentRecord, upvotedIds: Set<string>) {
  const deleted = isDeleted(comment);
  return {
    id: comment.id,
    authorId: comment.authorId,
    postId: comment.postId,
    policyId: comment.policyId,
    parentId: comment.parentId,
    createdAt: comment.createdAt,
    content: deleted ? DELETED_COMMENT_PLACEHOLDER : comment.content,
    isDeleted: deleted,
    author: toPublicAuthor(comment.author),
    _count: comment._count,
    hasUpvoted: upvotedIds.has(comment.id)
  };
}

async function assertPostOpen(postId: string | null) {
  if (!postId) return;
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { closedAt: true } });
  if (post?.closedAt) throw postClosedError();
}

export const commentService = {
  async createComment(authorId: string, data: CreateCommentPayload) {
    // Commentnya ada tujuan, ke post atau ke policy
    if (!data.postId === !data.policyId) {
      throw badRequest("Komentar harus ditautkan ke tepat satu Postingan atau Kebijakan");
    }

    let recipientId: string;
    if (data.postId) {
      const post = await prisma.post.findUnique({
        where: { id: data.postId },
        select: { authorId: true, closedAt: true }
      });
      if (!post) throw notFound("Postingan tidak ditemukan");
      if (post.closedAt) throw postClosedError();
      recipientId = post.authorId;
    } else {
      const policy = await prisma.policy.findUnique({
        where: { id: data.policyId },
        select: { authorId: true }
      });
      if (!policy) throw notFound("Kebijakan tidak ditemukan");
      recipientId = policy.authorId;
    }

    // Kalo ada parent artinya reply an
    let parentAuthorId: string | null = null;
    if (data.parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: data.parentId } });
      if (!parent) throw notFound("Komentar yang ingin dibalas tidak ditemukan");
      if (parent.parentId) throw badRequest("Hanya bisa membalas komentar utama, tidak bisa membalas balasan.");
      if (parent.postId !== (data.postId ?? null) || parent.policyId !== (data.policyId ?? null)) {
        throw badRequest("Komentar yang dibalas berada di diskusi yang berbeda.");
      }
      if (isDeleted(parent)) throw badRequest("Komentar yang sudah dihapus tidak dapat dibalas.");
      parentAuthorId = parent.authorId;
    }

    const newComment = await prisma.comment.create({
      data: {
        authorId,
        content: data.content,
        postId: data.postId ?? null,
        policyId: data.policyId ?? null,
        parentId: data.parentId ?? null
      },
      include: commentFields
    });

    try {
      if (parentAuthorId) {
        // Skenario ini reply an
        if (parentAuthorId !== authorId) {
          await prisma.notification.create({
            data: {
              recipientId: parentAuthorId,
              actorId: authorId,
              type: "REPLY_ON_COMMENT",
              commentId: data.parentId,
              postId: data.postId ?? null,
              policyId: data.policyId ?? null
            }
          });
        }
      } else if (recipientId !== authorId) {
        // Pastikan kita gak ngirim notif ke diri sendiri (misal Admin yg komen di kebijakannya sendiri)
        await prisma.notification.create({
          data: data.postId
            ? { recipientId, actorId: authorId, type: "COMMENT_ON_POST", postId: data.postId, commentId: newComment.id }
            : { recipientId, actorId: authorId, type: "COMMENT_ON_POLICY", policyId: data.policyId, commentId: newComment.id }
        });
      }
    } catch (error) {
      console.error("Gagal mengirim notifikasi komentar/reply:", error);
    }

    return toCommentDto(newComment, new Set());
  },

  // Get all komen (komen induk)
  async getComments(filter: GetCommentsFilter, viewerId?: string) {
    if (!filter.postId === !filter.policyId) {
      throw badRequest("Parameter postId atau policyId wajib diisi untuk melihat komentar");
    }

    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;
    const where: Prisma.CommentWhereInput = {
      ...(filter.postId && { postId: filter.postId }),
      ...(filter.policyId && { policyId: filter.policyId }),
      // Pastiin gapunya parent
      parentId: null
    };

    const comments = await prisma.comment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }, // Komentar utama urut dari yang paling baru
      include: {
        ...commentFields,
        replies: {
          include: commentFields,
          orderBy: { createdAt: "asc" } // Balasan urut dari yang paling lama ke terbaru (kayak WA)
        }
      }
    });

    const totalItems = await prisma.comment.count({ where });

    const allIds = comments.flatMap((comment) => [comment.id, ...comment.replies.map((reply) => reply.id)]);
    const upvoted = new Set<string>();
    if (viewerId && allIds.length > 0) {
      const upvotes = await prisma.commentUpvote.findMany({
        where: { userId: viewerId, commentId: { in: allIds } },
        select: { commentId: true }
      });
      upvotes.forEach((upvote) => upvoted.add(upvote.commentId));
    }

    return {
      data: comments.map((comment) => ({
        ...toCommentDto(comment, upvoted),
        replies: comment.replies.map((reply) => toCommentDto(reply, upvoted))
      })),
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    };
  },

  // Fungsi update comment
  async updateComment(id: string, userId: string, content: string) {
    const existingComment = await prisma.comment.findUnique({ where: { id } });
    if (!existingComment) throw notFound("Komentar tidak ditemukan");

    // Cuma yang nulis yang boleh edit
    if (existingComment.authorId !== userId) {
      throw forbidden("Akses ditolak. Anda hanya dapat mengubah komentar Anda sendiri.");
    }

    // Gabisa di edit kalo udah di softdelete
    if (isDeleted(existingComment)) {
      throw forbidden("Komentar yang sudah dihapus tidak dapat diedit kembali.");
    }
    await assertPostOpen(existingComment.postId);

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: commentFields
    });

    return toCommentDto(updatedComment, new Set());
  },

  // Delete (soft delete)
  async deleteComment(id: string, userId: string, userRole: string) {
    const existingComment = await prisma.comment.findUnique({ where: { id } });
    if (!existingComment) throw notFound("Komentar tidak ditemukan");

    if (existingComment.authorId !== userId) {
      if (userRole !== "ADMIN") {
        throw forbidden("Akses ditolak. Anda tidak berhak menghapus komentar ini.");
      }
      return moderationService.removeComment(id, userId);
    }

    if (!isDeleted(existingComment)) {
      await prisma.comment.update({
        where: { id },
        data: { deletedAt: new Date(), deletedById: userId }
      });
    }

    return { message: "Komentar berhasil dihapus" };
  },

  async toggleUpvote(commentId: string, userId: string) {
    //  Cek keberadaan komentar
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw notFound("Komentar tidak ditemukan");
    if (isDeleted(comment)) throw badRequest("Komentar yang sudah dihapus tidak dapat di-upvote.");
    await assertPostOpen(comment.postId);

    // Kalo udah upvote, di cabut
    const removed = await prisma.commentUpvote.deleteMany({ where: { userId, commentId } });
    if (removed.count > 0) {
      return { action: "unvoted", message: "Upvote ditarik dari komentar" };
    }

    // Kalo belom, create upvote
    try {
      await prisma.commentUpvote.create({ data: { userId, commentId } });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      return { action: "upvoted", message: "Komentar berhasil di-upvote" };
    }

    if (comment.authorId !== userId) {
      const alreadyNotified = await prisma.notification.findFirst({
        where: { recipientId: comment.authorId, actorId: userId, type: "UPVOTE_COMMENT", commentId },
        select: { id: true }
      });
      if (!alreadyNotified) {
        await prisma.notification.create({
          data: { recipientId: comment.authorId, actorId: userId, type: "UPVOTE_COMMENT", commentId }
        });
      }
    }

    return { action: "upvoted", message: "Komentar berhasil di-upvote" };
  }
};
