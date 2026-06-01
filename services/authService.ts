import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key');
const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Karena linter, butuh bikin interface buat replace 'any'
export interface RegisterPayload {
  email: string;
  password: string; // Buat opsional karena user Google tidak punya password
  role: 'STUDENT' | 'LECTURER' | 'ADMIN';
  fullName: string;
  studentId?: string;
  employeeId?: string;
  department?: string;
  faculty?: string;
  major?: string;
  isGoogleAuth?: boolean; // Penanda apakah dari Google
}

export interface UpdateProfilePayload {
  fullName?: string;
  studentId?: string;
  faculty?: string;
  major?: string;
  department?: string;
  avatarUrl?: string; 
}

export const authService = {
  // Ganti tipe data 'any' jadi 'RegisterPayload'
  async register(data: RegisterPayload) {
  const { email, password, role, fullName, studentId, employeeId, department, faculty, major, isGoogleAuth } = data;
    // Cek email apakah sudah dipakai
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('Email sudah terdaftar');

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Siapkan payload profile sesuai Role
    let profileData = {};
    if (role === 'STUDENT') {
      profileData = { studentProfile: { create: { fullName, studentId: studentId!, faculty: faculty!, major: major! } } };
    } else if (role === 'LECTURER') {
      profileData = { lecturerProfile: { create: { fullName, employeeId: employeeId!, faculty: faculty! } } };
    } else if (role === 'ADMIN') {
      profileData = { adminProfile: { create: { fullName, department: department! } } };
    }

    // Insert ke database
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        ...profileData
      },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true
      }
    });
    // --- LOGIKA PENGIRIMAN EMAIL VERIFIKASI (HANYA UNTUK MANUAL REGISTER) ---
    if (!isGoogleAuth) {
      // 1. Buat Token Verifikasi khusus (berlaku 1 jam)
      const verifyToken = await new SignJWT({ userId: newUser.id, action: 'verify_email' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(JWT_SECRET);

      // 2. Buat URL Verifikasi
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${verifyToken}`;

      // 3. Kirim Email
      await transporter.sendMail({
        from: `"SuaraUnpad" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Verifikasi Email Akun SuaraUnpad",
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Selamat datang, ${fullName}!</h2>
            <p>Terima kasih telah mendaftar di SuaraUnpad. Tinggal satu langkah lagi untuk mengaktifkan akun Anda.</p>
            <a href="${verificationUrl}" style="background-color: #2682F9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 10px;">Verifikasi Email Saya</a>
            <p style="margin-top: 20px; font-size: 12px; color: gray;">Link ini hanya berlaku selama 1 jam.</p>
          </div>
        `,
      });
    }

    return newUser;
  },

  async login(email: string, password: string) {
    // Cari user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Email atau password salah');

    // Verifikasi passwordHash
    if (!user.passwordHash) {
      throw new Error('Akun ini terdaftar melalui Google. Silakan gunakan tombol "Login with Google".');
    }
    // Verifikasi password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new Error('Email atau password salah');

    // Buat JWT Token (menggunakan jose)
    const token = await new SignJWT({ userId: user.id, role: user.role, isVerified: user.isVerified })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // Token berlaku 7 hari
      .sign(JWT_SECRET);

    return {  
      user: { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified },
      token
    };
  },

  async googleLogin(idToken: string) {
    // 1. Verifikasi token ke server Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new Error('Token Google tidak valid');
    }

    // 2. Cek apakah user sudah terdaftar di database kita
    const user = await prisma.user.findUnique({ 
      where: { email: payload.email } 
    });

    // 3. SKENARIO A: User sudah ada -> Langsung Login!
    if (user) {
      // Pastikan isVerified jadi true karena dia berhasil login via Google
      if (!user.isVerified) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true }
        });
        user.isVerified = true; // Sinkronisasi objek lokal
      }

      // BUAT TOKEN DENGAN MENYERTAKAN isVerified
      const token = await new SignJWT({ 
          userId: user.id, 
          role: user.role, 
          isVerified: user.isVerified // <-- WAJIB MASUK KE SINI
        })  
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET);

      // Kalau avatar di DB masih kosong, kita update pakai foto profil Google
      if (!user.avatarUrl && payload.picture) {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: payload.picture }
        });
      }

      return {
        isNewUser: false, // Beritahu Frontend ini login biasa
        user: { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified },
        token
      };
    }

    // 4. SKENARIO B: User belum ada -> Lempar data dasar ke Frontend untuk form "Lengkapi Profil"
    return {
      isNewUser: true, // Beritahu Frontend untuk pindah ke halaman Pendaftaran
      googleData: {
        email: payload.email,
        fullName: payload.name,
        avatarUrl: payload.picture
      }
    };
  },

 async updateProfile(userId: string, role: string, data: UpdateProfilePayload) {
      // Antrean query dengan tipe khusus dari Prisma agar tidak jadi 'any'
      const queries: Prisma.PrismaPromise<unknown>[] = [];

      // Jika ada update untuk tabel User 
      if (data.avatarUrl !== undefined) {
        queries.push(
          prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: data.avatarUrl },
          })
        );
      }

      // Rakit data profil secara type-safe. 
      // Teknik spread bersyarat ini hanya memasukkan properti jika nilainya BUKAN undefined.
      const profileUpdateData = {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.faculty !== undefined && { faculty: data.faculty }),
        ...(data.major !== undefined && { major: data.major }),
        ...(data.department !== undefined && { department: data.department }),
      };

const npmRegex = /^[0-9]{10}$/;
    if (role === 'STUDENT' && data.studentId !== undefined) {
      if (!npmRegex.test(data.studentId)) {
        throw new Error('Format NPM tidak valid');
      }
      Object.assign(profileUpdateData, { studentId: data.studentId });
    }

    // Jika ada atribut profil yang di-update, dorong ke antrean query
      if (Object.keys(profileUpdateData).length > 0) {
        if (role === 'STUDENT') {
          queries.push(prisma.studentProfile.update({ where: { userId }, data: profileUpdateData }));
        } else if (role === 'LECTURER') {
          queries.push(prisma.lecturerProfile.update({ where: { userId }, data: profileUpdateData }));
        } else if (role === 'ADMIN') {
          queries.push(prisma.adminProfile.update({ where: { userId }, data: profileUpdateData }));
        } else {
          throw new Error('Role tidak valid');
        }
      }

      //  Eksekusi semua query secara bersamaan
      if (queries.length > 0) {
        await prisma.$transaction(queries);
      }

      // Return response
      return { message: "Profil berhasil diperbarui" };
    }
};