import { prisma } from '@/lib/prisma';
import { PolicyStatus } from '@prisma/client';
import { VoteChoice } from '@prisma/client';

// 1. INTERFACE: Cetakan Data Payload
export interface CreatePolicyPayload {
  title: string;
  content: string;
  // status tidak perlu dikirim saat create, karena defaultnya 'DRAFT' di database
}

export const policyService = {
  // 2. FUNGSI CREATE: Membuat Wacana Kebijakan Baru
  async createPolicy(authorId: string, data: CreatePolicyPayload) {
    const newPolicy = await prisma.policy.create({
      data: {
        authorId: authorId,
        title: data.title,
        content: data.content,
        // status otomatis DRAFT berkat skema Prisma
      },
    });

    return newPolicy;
  },

  // 3. FUNGSI GET ALL: Mengambil Daftar Kebijakan (Bisa difilter berdasarkan status)
  async getPolicies(statusFilter?: PolicyStatus) {
    const policies = await prisma.policy.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: 'desc' }, // Yang terbaru di atas
      include: {
        // Ambil data pembuat kebijakan (Admin/Dosen)
        author: {
          select: {
            id: true,
            email: true,
            avatarUrl: true,
            adminProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
          }
        },
        // Ambil total jumlah partisipasi vote (opsional tapi bagus untuk UI)
        _count: {
          select: { votes: true }
        }
      }
    });

    return policies;
  },

  async getPolicyById(id: string) {
    const policy = await prisma.policy.findUnique({
      where: { id: id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            avatarUrl: true,
            adminProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
          }
        },
        // Kita hitung statistik VOTE (Berapa yang setuju, berapa yang tidak)
        votes: {
          select: { choice: true }
        }
      }
    });

    if (!policy) throw new Error('Kebijakan tidak ditemukan');

    // Menghitung statistik agree/disagree sebelum dikirim ke Frontend
    const agreeCount = policy.votes.filter(v => v.choice === 'AGREE').length;
    const disagreeCount = policy.votes.filter(v => v.choice === 'DISAGREE').length;

    // Hapus array votes asli agar response JSON tidak terlalu berat
    const { votes, ...policyData } = policy;

    return {
      ...policyData,
      voteStats: {
        agree: agreeCount,
        disagree: disagreeCount,
        total: agreeCount + disagreeCount
      }
    };
  },

  // 5. FUNGSI UPDATE (Mengedit Judul, Konten, atau Mengubah Status jadi ACTIVE)
  async updatePolicy(id: string, data: { title?: string; content?: string; status?: PolicyStatus }) {
    const existingPolicy = await prisma.policy.findUnique({ where: { id } });
    if (!existingPolicy) throw new Error('Kebijakan tidak ditemukan');

    const updatedPolicy = await prisma.policy.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.status && { status: data.status }),
      }
    });

    return updatedPolicy;
  },

  // 6. FUNGSI DELETE (Hapus Kebijakan)
  async deletePolicy(id: string) {
    const existingPolicy = await prisma.policy.findUnique({ where: { id } });
    if (!existingPolicy) throw new Error('Kebijakan tidak ditemukan');

    // Berkat aturan SetNull di model Post dan Cascade di model Comment,
    // menghapus Policy akan aman bagi data lain yang terhubung.
    await prisma.policy.delete({ where: { id } });

    return { message: 'Kebijakan berhasil dihapus' };
  },

  async submitVote(policyId: string, userId: string, choice: VoteChoice) {
    // A. Cek keberadaan dan status kebijakan
    const policy = await prisma.policy.findUnique({ where: { id: policyId } });
    if (!policy) throw new Error('Kebijakan tidak ditemukan');
    
    // BUSINESS LOGIC: Voting hanya sah jika status kebijakan ACTIVE
    if (policy.status !== 'ACTIVE') {
      throw new Error('Voting ditolak. Kebijakan ini sedang DRAFT atau sudah CLOSED.');
    }

    // B. Teknik UPSERT (Update or Insert)
    // Memanfaatkan konstrain @@unique([userId, policyId]) di schema.prisma
    const vote = await prisma.vote.upsert({
      where: {
        userId_policyId: {
          userId: userId,
          policyId: policyId
        }
      },
      update: { choice: choice }, // Jika sudah pernah vote, cukup update pilihannya
      create: { // Jika belum pernah vote, buat baris data baru
        userId: userId,
        policyId: policyId,
        choice: choice
      }
    });

    return vote;
  },

  // 8. FUNGSI CABUT VOTE (Batal memilih / Golput)
  async removeVote(policyId: string, userId: string) {
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_policyId: { userId, policyId }
      }
    });

    if (!existingVote) throw new Error('Anda belum memberikan vote pada kebijakan ini.');

    await prisma.vote.delete({
      where: { id: existingVote.id }
    });

    return { message: 'Vote Anda berhasil dicabut' };
  }
};