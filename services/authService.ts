import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

// Secret key dari .env (wajib ada)
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key');

// BIKIN INTERFACE UNTUK MENGGANTIKAN 'any'
export interface RegisterPayload {
  email: string;
  password: string;
  role: 'STUDENT' | 'LECTURER' | 'ADMIN';
  fullName: string;
  studentId?: string;
  employeeId?: string;
  department?: string;
  faculty?: string;
  major?: string;
}

export interface UpdateProflilePayload {
  fullName?: string;
  faculty?: string;
  major?: string;
  department?: string;
  avatarUrl?: string; // 👉 TAMBAH INI
}

export const authService = {
  // Ganti tipe data 'any' menjadi 'RegisterPayload'
  async register(data: RegisterPayload) {
    const { email, password, role, fullName, studentId, employeeId, department, faculty, major } = data;

    // 1. Cek email apakah sudah dipakai
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('Email sudah terdaftar');

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Siapkan payload profile sesuai Role
    let profileData = {};
    if (role === 'STUDENT') {
      profileData = { studentProfile: { create: { fullName, studentId: studentId!, faculty: faculty!, major: major! } } };
    } else if (role === 'LECTURER') {
      profileData = { lecturerProfile: { create: { fullName, employeeId: employeeId!, faculty: faculty! } } };
    } else if (role === 'ADMIN') {
      profileData = { adminProfile: { create: { fullName, department: department! } } };
    }

    // 4. Insert ke database
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

    return newUser;
  },

  async login(email: string, password: string) {
    // 1. Cari user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Email atau password salah');

    // 2. Verifikasi password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new Error('Email atau password salah');

    // 3. Buat JWT Token (menggunakan jose agar kompatibel dengan Next.js Middleware)
    const token = await new SignJWT({ userId: user.id, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // Token berlaku 7 hari
      .sign(JWT_SECRET);

    return {
      user: { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified },
      token
    };
  },

 async updateProfile(userId: string, role: string, data: UpdateProfilePayload) {
      // 1. Siapkan antrean query dengan tipe khusus dari Prisma agar tidak jadi 'any'
      const queries: Prisma.PrismaPromise<unknown>[] = [];

      // 2. Jika ada update untuk tabel User (seperti ganti avatar)
      if (data.avatarUrl !== undefined) {
        queries.push(
          prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: data.avatarUrl },
          })
        );
      }

      // 3. Rakit data profil secara type-safe. 
      // Teknik spread bersyarat ini hanya memasukkan properti jika nilainya BUKAN undefined.
      const profileUpdateData = {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.faculty !== undefined && { faculty: data.faculty }),
        ...(data.major !== undefined && { major: data.major }),
        ...(data.department !== undefined && { department: data.department }),
      };

      // 4. Jika ada atribut profil yang di-update, dorong ke antrean query
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

      // 5. Eksekusi semua query secara bersamaan (Atomic & Aman)
      if (queries.length > 0) {
        await prisma.$transaction(queries);
      }

      // 6. Return response
      return { message: "Profil berhasil diperbarui" };
    }
};