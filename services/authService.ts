import { prisma } from '@/lib/prisma';
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

export interface UpdateProfilePayload {
  fullName?: string;
  faculty?: string;
  major?: string;
  department?: string;
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
    // Kita pisahkan logika update berdasarkan role karena tabel profilnya beda-beda
    if (role === 'STUDENT') {
      return await prisma.studentProfile.update({
        where: { userId },
        data: {
          fullName: data.fullName,
          faculty: data.faculty,
          major: data.major,
          // studentId sengaja tidak dimasukkan agar NPM tidak bisa diubah sembarangan
        }
      });
    } else if (role === 'LECTURER') {
      return await prisma.lecturerProfile.update({
        where: { userId },
        data: {
          fullName: data.fullName,
          faculty: data.faculty,
          // employeeId tidak bisa diubah
        }
      });
    } else if (role === 'ADMIN') {
      return await prisma.adminProfile.update({
        where: { userId },
        data: {
          fullName: data.fullName,
          department: data.department,
        }
      });
    }

    throw new Error('Role tidak valid');
  }
};