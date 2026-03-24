import { prisma } from '@/lib/prisma';

export interface CreateCommentPayload {
  content: string;
  postId?: string;   // Opsional (Jika mengomentari postingan)
  policyId?: string; // Opsional (Jika mengomentari kebijakan)
  parentId?: string; // Opsional (Jika ini adalah balasan/reply)
}

export interface GetCommentsFilter {
  postId?: string;
  policyId?: string;
  page?: number;
  limit?: number;
}

export const commentService = {
  async createComment(authorId: string, data: CreateCommentPayload) {
    // BUSINESS LOGIC: Harus ada tujuannya (Minimal salah satu)
    if (!data.postId && !data.policyId) {
      throw new Error('Komentar harus ditautkan ke sebuah Postingan atau Kebijakan');
    }

    // BUSINESS LOGIC: Jika ini adalah balasan, pastikan komentar induknya benar-benar ada
    if (data.parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: data.parentId } });
      if (!parent) throw new Error('Komentar yang ingin dibalas tidak ditemukan');
    }

  const newComment = await prisma.comment.create({
      data: {
        authorId: authorId,
        content: data.content,
        postId: data.postId || null,
        policyId: data.policyId || null,
        parentId: data.parentId || null,
      },
    });

    try {
      if (data.parentId) {
        // SKENARIO 1: INI ADALAH BALASAN (REPLY)
        const parentComment = await prisma.comment.findUnique({ where: { id: data.parentId } });
        if (parentComment && parentComment.authorId !== authorId) {
          await prisma.notification.create({
            data: {
              recipientId: parentComment.authorId, // Kirim ke orang yang komentarnya dibalas
              actorId: authorId,
              type: 'REPLY_ON_COMMENT',
              commentId: data.parentId, 
            }
          });
        }
      } else if (data.postId) {
        // SKENARIO 2: INI ADALAH KOMENTAR UTAMA DI POSTINGAN
        const post = await prisma.post.findUnique({ where: { id: data.postId } });
        if (post && post.authorId !== authorId) {
          await prisma.notification.create({
            data: {
              recipientId: post.authorId,
              actorId: authorId,
              type: 'COMMENT_ON_POST',
              postId: data.postId,
            }
          });
        }
      }
    } catch (error) {
      console.error("Gagal mengirim notifikasi komentar/reply:", error);
    }
    // ==========================================

    return newComment;
  },

  // 3. FUNGSI GET ALL: Mengambil Daftar Komentar Induk + Balasannya
  async getComments(filter: GetCommentsFilter) {
    if (!filter.postId && !filter.policyId) {
      throw new Error('Parameter postId atau policyId wajib diisi untuk melihat komentar');
    }

    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const comments = await prisma.comment.findMany({
      where: {
        ...(filter.postId && { postId: filter.postId }),
        ...(filter.policyId && { policyId: filter.policyId }),
        // SANGAT PENTING: Hanya ambil komentar UTAMA (yang tidak punya parent)
        parentId: null, 
      },
      skip: skip,
      take: limit,
      orderBy: { createdAt: 'desc' }, // Komentar utama urut dari yang paling baru
      include: {
        // A. Ambil profil penulis komentar utama
        author: {
          select: {
            id: true,
            avatarUrl: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
            adminProfile: { select: { fullName: true } },
          }
        },
        // B. Ambil jumlah like komentar
        _count: {
          select: { commentUpvotes: true }
        },
        // C. AMBIL BALASANNYA (Nested Replies)
        replies: {
          include: {
            author: { // Profil penulis balasan
              select: {
                id: true,
                avatarUrl: true,
                studentProfile: { select: { fullName: true } },
                lecturerProfile: { select: { fullName: true } },
              }
            }
          },
          orderBy: { createdAt: 'asc' } // Balasan urut dari yang paling lama ke terbaru (seperti WhatsApp)
        }
      }
    });

    const totalItems = await prisma.comment.count({
      where: {
        ...(filter.postId && { postId: filter.postId }),
        ...(filter.policyId && { policyId: filter.policyId }),
        parentId: null,
      }
    });

    return {
      data: comments,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limit),
      }
    };
  },

  // 4. FUNGSI UPDATE (Mengedit Komentar)
  async updateComment(id: string, userId: string, content: string) {
    const existingComment = await prisma.comment.findUnique({ where: { id } });
    if (!existingComment) throw new Error('Komentar tidak ditemukan');

    // BUSINESS LOGIC: Hanya penulis asli yang boleh mengedit
    if (existingComment.authorId !== userId) {
      throw new Error('Akses ditolak. Anda hanya dapat mengubah komentar Anda sendiri.');
    }

    // BUSINESS LOGIC: Jangan izinkan edit kalau komentarnya sudah di-Soft Delete
    if (existingComment.content === '[Komentar ini telah dihapus]') {
      throw new Error('Komentar yang sudah dihapus tidak dapat diedit kembali.');
    }

    const updatedComment = await prisma.comment.update({
      where: { id: id },
      data: { content: content }
    });

    return updatedComment;
  },

  // 5. FUNGSI SOFT DELETE (Hapus Halus Komentar)
  async deleteComment(id: string, userId: string, userRole: string) {
    const existingComment = await prisma.comment.findUnique({ where: { id } });
    if (!existingComment) throw new Error('Komentar tidak ditemukan');

    // BUSINESS LOGIC: Yang boleh hapus hanya Penulis asli ATAU Admin
    if (userRole !== 'ADMIN' && existingComment.authorId !== userId) {
      throw new Error('Akses ditolak. Anda tidak berhak menghapus komentar ini.');
    }

    // TEKNIK SOFT DELETE: Ubah teksnya, bukan hapus datanya
    await prisma.comment.update({
      where: { id: id },
      data: { content: '[Komentar ini telah dihapus]' }
    });

    return { message: 'Komentar berhasil dihapus' };
  },
  async toggleUpvote(commentId: string, userId: string) {
    // A. Cek keberadaan komentar
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error('Komentar tidak ditemukan');

    // B. Cek apakah user INI sudah upvote komentar INI
    const existingUpvote = await prisma.commentUpvote.findUnique({
      where: {
        userId_commentId: { 
          userId: userId,
          commentId: commentId
        }
      }
    });

    if (existingUpvote) {
      // KONDISI 1: SUDAH UPVOTE -> Cabut Like-nya (Delete)
      await prisma.commentUpvote.delete({
        where: { id: existingUpvote.id }
      });
      return { action: 'unvoted', message: 'Upvote ditarik dari komentar' };
    } else {
      // KONDISI 2: BELUM UPVOTE -> Berikan Like (Create)
      await prisma.commentUpvote.create({
        data: { userId: userId, commentId: commentId }
      });

      if (comment.authorId !== userId) {
        await prisma.notification.create({
          data: {
            recipientId: comment.authorId,
            actorId: userId,
            type: 'UPVOTE_COMMENT',
            commentId: commentId,
          }
        });
      }
      
      return { action: 'upvoted', message: 'Komentar berhasil di-upvote' };
    }
  }
};