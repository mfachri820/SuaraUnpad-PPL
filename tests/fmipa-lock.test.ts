import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    studentProfile: { update: vi.fn() },
    lecturerProfile: { update: vi.fn() },
    adminProfile: { update: vi.fn() },
    $transaction: vi.fn()
  }
}));

import { prisma } from '@/lib/prisma';
import { authService } from '@/services/authService';

const db = vi.mocked(prisma, true);

describe('Suara MIPA: kunci fakultas & program studi (authService.register)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.user.findUnique.mockResolvedValue(null);
  });

  it('menolak registrasi mahasiswa dengan program studi di luar FMIPA', async () => {
    await expect(
      authService.register({
        email: 'mhs@mail.unpad.ac.id',
        password: 'Password123!',
        role: 'STUDENT',
        fullName: 'Mahasiswa Uji',
        studentId: '1234567890',
        faculty: 'Fakultas Lain',
        major: 'Teknik Sipil',
        isGoogleAuth: true
      })
    ).rejects.toThrow('Program studi tidak valid');

    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('mengunci faculty ke FMIPA meskipun client mengirim nilai lain', async () => {
    db.user.create.mockResolvedValue({
      id: 'u-1',
      email: 'mhs@mail.unpad.ac.id',
      role: 'STUDENT',
      isVerified: false,
      createdAt: new Date()
    } as never);

    await authService.register({
      email: 'mhs@mail.unpad.ac.id',
      password: 'Password123!',
      role: 'STUDENT',
      fullName: 'Mahasiswa Uji',
      studentId: '1234567890',
      faculty: 'Fakultas Lain',
      major: 'Matematika',
      isGoogleAuth: true
    });

    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentProfile: {
            create: expect.objectContaining({ faculty: 'FMIPA', major: 'Matematika' })
          }
        })
      })
    );
  });
});

describe('Suara MIPA: kunci fakultas & program studi (authService.updateProfile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('menolak program studi di luar FMIPA', async () => {
    await expect(
      authService.updateProfile('user-1', 'STUDENT', { major: 'Teknik Sipil' })
    ).rejects.toThrow('Program studi tidak valid');

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('mengunci faculty ke FMIPA saat diperbarui', async () => {
    await authService.updateProfile('user-1', 'STUDENT', { faculty: 'Fakultas Lain' });

    expect(db.studentProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { faculty: 'FMIPA' }
    });
    expect(db.$transaction).toHaveBeenCalled();
  });
});
