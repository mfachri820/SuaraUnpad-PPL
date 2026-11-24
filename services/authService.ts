import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getJwtSecret } from '@/lib/jwt';
import { FMIPA_FACULTY, isFmipaNpm, majorFromNpm } from '@/lib/fmipa';
import { uploadedKeyFrom } from '@/lib/storage';
import type { PausProfile } from '@/lib/paus';

const SESSION_TTL = '7d';

export interface UpdateProfilePayload {
  fullName?: string;
  faculty?: string;
  department?: string;
  avatarUrl?: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  role: 'STUDENT' | 'LECTURER' | 'ADMIN';
  isVerified: boolean;
}

export interface PausSession {
  user: SessionUser;
  token: string;
}

/** Error yang aman ditampilkan ke user, dengan kode untuk query ?error= di halaman login. */
export class AuthFlowError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400
  ) {
    super(message);
    this.name = 'AuthFlowError';
  }
}

const sessionSelect = { id: true, email: true, role: true, isVerified: true } as const;

function parseAdminIdentifiers() {
  return new Set(
    (process.env.ADMIN_IDENTIFIERS ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isAdminIdentity(profile: PausProfile) {
  const admins = parseAdminIdentifiers();
  return [profile.email, profile.npm].some((value) => value && admins.has(value.toLowerCase()));
}

// PAuS belum tentu selalu mengirim email (lihat catatan di lib/paus.ts), padahal kolom
// users.email wajib & unik. Alamat pengganti ini tidak pernah dipakai untuk mengirim email.
function emailFor(profile: { npm: string | null; email: string | null }) {
  if (profile.email) return profile.email.toLowerCase();
  if (profile.npm) return `${profile.npm}@paus.unpad.ac.id`;
  throw new AuthFlowError('Akun PAuS tidak memiliki email maupun NPM.', 'paus_profile_incomplete', 400);
}

async function issueSessionToken(user: SessionUser) {
  return await new SignJWT({ userId: user.id, role: user.role, isVerified: user.isVerified })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getJwtSecret());
}

async function toSession(user: SessionUser): Promise<PausSession> {
  return { user, token: await issueSessionToken(user) };
}

// Mahasiswa dicocokkan HANYA lewat NPM (identitas resmi dari PAuS). Email tidak dipakai
// untuk mahasiswa supaya akun orang lain dengan email sama tidak bisa "diambil alih".
async function findStudentByNpm(npm: string) {
  const found = await prisma.studentProfile.findUnique({
    where: { studentId: npm },
    select: { user: { select: sessionSelect } }
  });
  return found?.user ?? null;
}

async function findUserByEmail(email: string | null) {
  if (!email) return null;
  return await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: sessionSelect });
}

async function createStudentFromPaus(profile: PausProfile & { npm: string; name: string }, major: string) {
  // Validasi kunci penandatangan sebelum menulis ke database.
  getJwtSecret();

  try {
    return await prisma.user.create({
      data: {
        email: emailFor(profile),
        role: 'STUDENT',
        // Identitas sudah diverifikasi oleh PAuS.
        isVerified: true,
        studentProfile: {
          create: { fullName: profile.name, studentId: profile.npm, faculty: FMIPA_FACULTY, major }
        }
      },
      select: sessionSelect
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Dua tab menyelesaikan login bersamaan: akun dengan NPM ini baru saja dibuat request lain.
      const sameNpm = await findStudentByNpm(profile.npm);
      if (sameNpm) return sameNpm;
      // Selain itu: email PAuS ini sudah dipakai akun lain (NPM berbeda). Jangan digabung diam-diam.
      throw new AuthFlowError('Email akun PAuS ini sudah dipakai akun lain.', 'account_conflict', 409);
    }
    throw error;
  }
}

export const authService = {
  /**
   * Login email + password. HANYA untuk development lokal & test otomatis
   * (route-nya mati kecuali PASSWORD_LOGIN_ENABLED=true). Login produksi lewat PAuS.
   */
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) throw new Error('Email atau password salah');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new Error('Email atau password salah');

    const sessionUser: SessionUser = { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified };
    return { user: sessionUser, token: await issueSessionToken(sessionUser) };
  },

  /**
   * Dipanggil setelah profil PAuS berhasil diambil. Aturan masuk:
   * 1. Email/NPM di ADMIN_IDENTIFIERS -> admin (akun lama dipakai, atau dibuat sebagai ADMIN).
   * 2. Punya NPM -> WAJIB NPM FMIPA (14xx) dengan kode prodi yang dikenal; selain itu ditolak,
   *    termasuk bila kebetulan sudah ada akun lama. Akun dicocokkan lewat NPM, akun baru dibuat
   *    otomatis dengan prodi dari NPM.
   * 3. Tanpa NPM (dosen/staf) -> hanya boleh bila emailnya sudah terdaftar sebagai DOSEN/ADMIN.
   */
  async loginWithPaus(profile: PausProfile): Promise<PausSession> {
    if (!profile.name) {
      throw new AuthFlowError('Data nama dari PAuS kosong.', 'paus_profile_incomplete', 400);
    }

    if (isAdminIdentity(profile)) {
      const existingAdmin = (profile.npm && (await findStudentByNpm(profile.npm))) || (await findUserByEmail(profile.email));
      if (existingAdmin) return toSession(existingAdmin);

      const admin = await prisma.user.create({
        data: {
          email: emailFor(profile),
          role: 'ADMIN',
          isVerified: true,
          adminProfile: { create: { fullName: profile.name, department: FMIPA_FACULTY } }
        },
        select: sessionSelect
      });
      return toSession(admin);
    }

    if (profile.npm) {
      if (!isFmipaNpm(profile.npm)) {
        throw new AuthFlowError('Suara MIPA khusus mahasiswa FMIPA Universitas Padjadjaran.', 'not_fmipa', 403);
      }

      const major = majorFromNpm(profile.npm);
      if (!major) {
        throw new AuthFlowError(
          `Kode program studi pada NPM ${profile.npm} belum dikenali. Hubungi admin.`,
          'prodi_unknown',
          403
        );
      }

      const existing = await findStudentByNpm(profile.npm);
      if (existing) return toSession(existing);

      const student = await createStudentFromPaus({ ...profile, npm: profile.npm, name: profile.name }, major);
      return toSession(student);
    }

    const staff = await findUserByEmail(profile.email);
    if (staff && staff.role !== 'STUDENT') return toSession(staff);

    throw new AuthFlowError(
      'Akun PAuS ini tidak memiliki NPM. Akun dosen/staf perlu didaftarkan oleh admin.',
      'not_registered',
      403
    );
  },

  async updateProfile(userId: string, role: string, data: UpdateProfilePayload) {
    const queries: Prisma.PrismaPromise<unknown>[] = [];

    if (data.avatarUrl !== undefined) {
      // Foto profil wajib hasil /api/uploads (objek storage milik aplikasi); null = hapus foto.
      const avatarKey = data.avatarUrl === null ? null : uploadedKeyFrom(data.avatarUrl);
      if (data.avatarUrl !== null && avatarKey === null) {
        throw new Error('URL foto profil tidak valid. Unggah lewat fitur upload aplikasi.');
      }
      queries.push(
        prisma.user.update({
          where: { id: userId },
          data: { avatarUrl: avatarKey }
        })
      );
    }

    // NPM dan program studi sengaja tidak bisa diubah: keduanya berasal dari PAuS (prodi dari kode
    // di NPM) dan NPM dipakai untuk mencocokkan akun saat login. Fakultas selalu dikunci ke FMIPA.
    const profileUpdateData = {
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.faculty !== undefined && { faculty: FMIPA_FACULTY }),
      ...(data.department !== undefined && { department: data.department })
    };

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

    if (queries.length > 0) {
      await prisma.$transaction(queries);
    }

    return { message: 'Profil berhasil diperbarui' };
  }
};
