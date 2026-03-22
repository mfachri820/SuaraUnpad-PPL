import { prisma } from '@/lib/prisma';

// 1. INTERFACE: Cetakan Data Payload
export interface CreatePostPayload {
  title: string;
  content: string;
  policyId?: string; // Opsional (karena postingan tidak harus terikat kebijakan)
}

export interface GetPostsFilter {
  page?: number;
  limit?: number;
  policyId?: string; // Opsional (untuk memfilter postingan khusus 1 kebijakan)
}

export const postService = {
  // 2. FUNGSI CREATE: Membuat Postingan Baru
  async createPost(authorId: string, data: CreatePostPayload) {
    // Validasi opsional: Jika user mengirim policyId, pastikan kebijakan itu benar-benar ada
    if (data.policyId) {
      const existingPolicy = await prisma.policy.findUnique({ where: { id: data.policyId } });
      if (!existingPolicy) throw new Error('Kebijakan yang dikaitkan tidak ditemukan');
    }

    const newPost = await prisma.post.create({
      data: {
        authorId: authorId,
        title: data.title,
        content: data.content,
        policyId: data.policyId || null, // Jika undefined, jadikan null
      },
    });

    return newPost;
  },

  // 3. FUNGSI GET ALL: Mengambil Daftar Postingan (dengan Pagination)
  async getPosts(filter: GetPostsFilter) {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({
      where: {
        ...(filter.policyId && { policyId: filter.policyId }),
      },
      skip: skip,
      take: limit,
      orderBy: { createdAt: 'desc' }, // Urutkan dari yang terbaru
      include: {
        // Ambil data pembuat postingan
        author: {
          select: {
            id: true,
            email: true,
            avatarUrl: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
            adminProfile: { select: { fullName: true } },
          }
        },
        // Ambil info kebijakan (jika postingan ini terkait kebijakan tertentu)
        policy: {
          select: { id: true, title: true }
        },
        // Hitung total upvotes dan komentar tanpa menarik semua datanya
        _count: {
          select: { postUpvotes: true, comments: true }
        }
      }
    });

    const totalItems = await prisma.post.count({
      where: {
        ...(filter.policyId && { policyId: filter.policyId }),
      }
    });

    return {
      data: posts,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limit),
      }
    };
  },

  // 4. FUNGSI GET BY ID (Melihat Detail 1 Postingan)
  async getPostById(id: string) {
    const post = await prisma.post.findUnique({
      where: { id: id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            avatarUrl: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
            adminProfile: { select: { fullName: true } },
          }
        },
        policy: {
          select: { id: true, title: true }
        },
        // Hitung total like dan komentar
        _count: {
          select: { postUpvotes: true, comments: true }
        }
      }
    });

    if (!post) throw new Error('Postingan tidak ditemukan');
    return post;
  },

  // 5. FUNGSI UPDATE (Mengedit Postingan)
  async updatePost(id: string, userId: string, data: { title?: string; content?: string }) {
    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) throw new Error('Postingan tidak ditemukan');

    // BUSINESS LOGIC: Hanya pembuat postingan yang boleh mengedit tulisannya sendiri
    if (existingPost.authorId !== userId) {
      throw new Error('Akses ditolak. Anda hanya dapat mengubah postingan Anda sendiri.');
    }

    const updatedPost = await prisma.post.update({
      where: { id: id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
      }
    });

    return updatedPost;
  },

  // 6. FUNGSI DELETE (Menghapus Postingan)
  async deletePost(id: string, userId: string, userRole: string) {
    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) throw new Error('Postingan tidak ditemukan');

    // BUSINESS LOGIC: Yang boleh hapus hanya Author aslinya ATAU Admin (sebagai moderator)
    if (userRole !== 'ADMIN' && existingPost.authorId !== userId) {
      throw new Error('Akses ditolak. Anda tidak berhak menghapus postingan ini.');
    }

    // Cascade delete akan otomatis menghapus komentar & upvote yang terkait postingan ini
    await prisma.post.delete({ where: { id: id } });

    return { message: 'Postingan berhasil dihapus' };
  },

  async toggleUpvote(postId: string, userId: string) {
    // A. Cek keberadaan postingan
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Postingan tidak ditemukan');

    // B. Cek apakah user INI sudah upvote postingan INI
    // Menggunakan kombinasi kunci unik (userId_postId)
    const existingUpvote = await prisma.postUpvote.findUnique({
      where: {
        userId_postId: { 
          userId: userId,
          postId: postId
        }
      }
    });

    if (existingUpvote) {
      // KONDISI 1: SUDAH UPVOTE -> Cabut Like-nya (Delete)
      await prisma.postUpvote.delete({
        where: { id: existingUpvote.id }
      });
      return { action: 'unvoted', message: 'Upvote ditarik dari postingan' };
    } else {
      // KONDISI 2: BELUM UPVOTE -> Berikan Like (Create)
      await prisma.postUpvote.create({
        data: { userId: userId, postId: postId }
      });
      return { action: 'upvoted', message: 'Postingan berhasil di-upvote' };
    }
  }
};