import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { snap } from '@/lib/midtrans';

// Helper kecil untuk mengatasi masalah BigInt ke JSON
// Menggunakan Generic Type <T> agar TypeScript tahu bentuk asli datanya
const serializeBigInt = <T>(obj: T) => {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => (typeof value === 'bigint' ? Number(value) : value))
  );
};
export interface MidtransNotificationPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  // Kita tambahkan index signature di bawah ini kalau-kalau Midtrans mengirim data ekstra 
  // agar TypeScript tidak kaget, tapi tetap aman dari error 'any'
  [key: string]: unknown; 
}

export interface CreateCampaignPayload {
  title: string;
  description: string;
  targetAmount: number;
  bannerUrl: string;
}

export const donationService = {
  // 1. FUNGSI ADMIN: Membuat Kampanye Donasi Baru
  async createCampaign(data: CreateCampaignPayload) {
    const newCampaign = await prisma.donationCampaign.create({
      data: {
        title: data.title,
        description: data.description,
        targetAmount: data.targetAmount, // Otomatis dikonversi ke BigInt oleh Prisma
        bannerUrl: data.bannerUrl,
      }
    });
    return serializeBigInt(newCampaign);
  },

  // 2. FUNGSI GET ALL: Mengambil daftar Kampanye (Public)
  async getCampaigns() {
    const campaigns = await prisma.donationCampaign.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return serializeBigInt(campaigns);
  },

  // 3. FUNGSI MAHASISWA: Melakukan Donasi (Tembak API Midtrans)
  async createTransaction(userId: string, campaignId: string, amount: number) {
    // A. Validasi Kampanye
    const campaign = await prisma.donationCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Kampanye donasi tidak ditemukan');
    if (campaign.status !== 'ACTIVE') throw new Error('Kampanye donasi ini sudah ditutup');
    if (amount < 10000) throw new Error('Minimal donasi adalah Rp 10.000');

    // B. Ambil data user untuk dikirim ke Midtrans (agar invoice-nya rapi)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true, lecturerProfile: true, adminProfile: true }
    });
    
    const userName = user?.studentProfile?.fullName 
                  || user?.lecturerProfile?.fullName 
                  || user?.adminProfile?.fullName 
                  || 'Hamba Allah';

    // C. Buat Order ID Unik (Syarat mutlak Midtrans)
    // Format: DON-CampaignID(5 huruf)-Timestamp
    const uniqueOrderId = `DON-${campaignId.substring(0, 5).toUpperCase()}-${Date.now()}`;

    // D. Susun Payload untuk Midtrans Snap API
    const parameter = {
      transaction_details: {
        order_id: uniqueOrderId,
        gross_amount: amount
      },
      customer_details: {
        first_name: userName,
        email: user?.email,
      },
      item_details: [{
        id: campaignId.substring(0, 10), // ID item singkat
        price: amount,
        quantity: 1,
        name: `Donasi: ${campaign.title.substring(0, 30)}...` // Max 50 karakter
      }]
    };

    // E. Tembak API Midtrans
    const midtransResponse = await snap.createTransaction(parameter);
    const paymentUrl = midtransResponse.redirect_url; // 👈 INI YANG DIBUTUHKAN FRONTEND!

    // F. Simpan ke Database kita (Status masih PENDING)
    const newTransaction = await prisma.transaction.create({
      data: {
        userId: userId,
        campaignId: campaignId,
        orderId: uniqueOrderId,
        amount: amount,
        paymentUrl: paymentUrl,
        paymentStatus: 'PENDING',
      }
    });

    return serializeBigInt(newTransaction);
  },

 async handleMidtransWebhook(payload: MidtransNotificationPayload) { // 👉 UBAH DI SINI
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = payload;
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';

    // A. VALIDASI KEAMANAN (SANGAT PENTING!)
    // Kita harus memastikan yang nembak API ini benar-benar Midtrans, bukan hacker.
    // Caranya: Kita racik ulang signature_key menggunakan rumus Midtrans.
    const hash = crypto.createHash('sha512');
    hash.update(`${order_id}${status_code}${gross_amount}${serverKey}`);
    const expectedSignature = hash.digest('hex');

    if (expectedSignature !== signature_key) {
      throw new Error('Akses Ditolak: Signature Key tidak valid. Anda bukan Midtrans!');
    }

    // B. Cari transaksi kita di database berdasarkan order_id dari Midtrans
    const transaction = await prisma.transaction.findUnique({ where: { orderId: order_id } });
    if (!transaction) throw new Error('Transaksi tidak ditemukan di database');

    // Cek Idempotency: Kalau statusnya sudah SUCCESS, jangan diproses dua kali
    if (transaction.paymentStatus === 'SUCCESS') {
      return { message: 'Transaksi sudah sukses sebelumnya, diabaikan.' };
    }

    // C. Tentukan status baru berdasarkan laporan Midtrans
    let newStatus: string = transaction.paymentStatus as string;
    
    // 'settlement' artinya uang sudah benar-benar masuk ke rekening (Sukses)
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      newStatus = 'SUCCESS';
    } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
      newStatus = 'FAILED';
    }

    // D. Update Database (Interactive Transaction!)
    // Jika sukses, kita ubah status transaksi JADI SUCCESS, dan kita TAMBAH uang terkumpul di Kampanye
    if (newStatus === 'SUCCESS') {
      await prisma.$transaction(async (tx) => {
        // 1. Ubah status struk transaksi
        await tx.transaction.update({
          where: { orderId: order_id },
          data: { paymentStatus: 'SUCCESS' }
        });

        // 2. Tambahkan saldo ke Kampanye donasi
        await tx.donationCampaign.update({
          where: { id: transaction.campaignId },
          data: { collectedAmount: { increment: transaction.amount } }
        });
      });
    } else if (newStatus === 'FAILED') {
      // Kalau gagal, cukup ubah status transaksi saja (saldo kampanye tidak berubah)
      await prisma.transaction.update({
        where: { orderId: order_id },
        data: { paymentStatus: 'FAILED' }
      });
    }

    return { message: `Webhook diproses. Status transaksi: ${newStatus}` };
  }
};