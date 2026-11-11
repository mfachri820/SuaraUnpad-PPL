import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    studentProfile: { findUnique: vi.fn(), update: vi.fn() },
    lecturerProfile: { update: vi.fn() },
    adminProfile: { update: vi.fn() },
    $transaction: vi.fn()
  }
}));

import { prisma } from '@/lib/prisma';
import { authService } from '@/services/authService';
import { isFmipaNpm, majorFromNpm } from '@/lib/fmipa';

const db = vi.mocked(prisma, true);
const FMIPA_NPM = '140810230041';

describe('Suara MIPA: prodi otomatis dari NPM', () => {
  it('hanya NPM 12 digit berkode fakultas 14 yang dianggap FMIPA', () => {
    expect(isFmipaNpm(FMIPA_NPM)).toBe(true);
    expect(isFmipaNpm('180110240011')).toBe(false);
    expect(isFmipaNpm('1408102300')).toBe(false);
  });

  it('memetakan 2 digit setelah 14 ke program studi', () => {
    const cases: Record<string, string> = {
      '140110230001': 'Matematika',
      '140210230001': 'Kimia',
      '140310230001': 'Fisika',
      '140410230001': 'Biologi',
      '140610230001': 'Statistika',
      '140710230001': 'Geofisika',
      '140810230041': 'Teknik Informatika',
      '140910230001': 'Teknik Elektro',
      '141010230001': 'Ilmu Aktuaria'
    };
    for (const [npm, major] of Object.entries(cases)) expect(majorFromNpm(npm), npm).toBe(major);
  });

  it('kode prodi yang tidak dikenal atau NPM non-FMIPA menghasilkan null', () => {
    expect(majorFromNpm('140510230001')).toBeNull();
    expect(majorFromNpm('141110230001')).toBeNull();
    expect(majorFromNpm('180110240011')).toBeNull();
  });
});

describe('Suara MIPA: login PAuS (authService.loginWithPaus)', () => {
  const originalAdmins = process.env.ADMIN_IDENTIFIERS;

  beforeEach(() => {
    vi.clearAllMocks();
    db.studentProfile.findUnique.mockResolvedValue(null);
    db.user.findUnique.mockResolvedValue(null);
    delete process.env.ADMIN_IDENTIFIERS;
  });

  afterEach(() => {
    if (originalAdmins === undefined) delete process.env.ADMIN_IDENTIFIERS;
    else process.env.ADMIN_IDENTIFIERS = originalAdmins;
  });

  it('user lama yang cocok lewat NPM langsung mendapat sesi tanpa membuat akun', async () => {
    db.studentProfile.findUnique.mockResolvedValue({
      user: { id: 'u-1', email: 'mhs@mail.unpad.ac.id', role: 'STUDENT', isVerified: true }
    } as never);

    const session = await authService.loginWithPaus({ npm: FMIPA_NPM, name: 'Mahasiswa', email: 'mhs@mail.unpad.ac.id' });

    expect(session.user.id).toBe('u-1');
    expect(session.token.split('.')).toHaveLength(3);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('mahasiswa FMIPA baru langsung dibuatkan akun dengan prodi dari NPM', async () => {
    db.user.create.mockResolvedValue({ id: 'u-2', email: 'mhs@mail.unpad.ac.id', role: 'STUDENT', isVerified: true } as never);

    const session = await authService.loginWithPaus({ npm: '140610230001', name: 'Mahasiswa Uji', email: 'MHS@mail.unpad.ac.id' });

    expect(session.user.role).toBe('STUDENT');
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'mhs@mail.unpad.ac.id',
          role: 'STUDENT',
          isVerified: true,
          studentProfile: {
            create: { fullName: 'Mahasiswa Uji', studentId: '140610230001', faculty: 'FMIPA', major: 'Statistika' }
          }
        })
      })
    );
  });

  it('memakai alamat pengganti saat PAuS tidak mengirim email', async () => {
    db.user.create.mockResolvedValue({ id: 'u-3', email: `${FMIPA_NPM}@paus.unpad.ac.id`, role: 'STUDENT', isVerified: true } as never);

    await authService.loginWithPaus({ npm: FMIPA_NPM, name: 'Mahasiswa', email: null });

    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: `${FMIPA_NPM}@paus.unpad.ac.id` }) })
    );
  });

  it('menolak NPM FMIPA dengan kode prodi yang tidak dikenal', async () => {
    await expect(
      authService.loginWithPaus({ npm: '140510230001', name: 'Mahasiswa', email: null })
    ).rejects.toMatchObject({ code: 'prodi_unknown', status: 403 });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('menolak mahasiswa di luar FMIPA', async () => {
    await expect(
      authService.loginWithPaus({ npm: '180110240011', name: 'Mahasiswa FIB', email: 'fib@mail.unpad.ac.id' })
    ).rejects.toMatchObject({ code: 'not_fmipa', status: 403 });
  });

  it('menolak akun tanpa NPM yang belum terdaftar', async () => {
    await expect(
      authService.loginWithPaus({ npm: null, name: 'Dosen', email: 'dosen@unpad.ac.id' })
    ).rejects.toMatchObject({ code: 'not_registered' });
  });

  it('tidak membuat akun jika JWT_SECRET terlalu pendek', async () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'short';
    try {
      await expect(authService.loginWithPaus({ npm: FMIPA_NPM, name: 'Mahasiswa', email: null })).rejects.toThrow(/JWT_SECRET/);
      expect(db.user.create).not.toHaveBeenCalled();
    } finally {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('NPM non-FMIPA tetap ditolak walaupun sudah punya akun lama', async () => {
    db.studentProfile.findUnique.mockResolvedValue({
      user: { id: 'u-x', email: 'fib@mail.unpad.ac.id', role: 'STUDENT', isVerified: true }
    } as never);
    db.user.findUnique.mockResolvedValue({ id: 'u-x', email: 'fib@mail.unpad.ac.id', role: 'STUDENT', isVerified: true } as never);

    await expect(
      authService.loginWithPaus({ npm: '180110240011', name: 'Mahasiswa FIB', email: 'fib@mail.unpad.ac.id' })
    ).rejects.toMatchObject({ code: 'not_fmipa' });
  });

  it('mahasiswa tidak pernah dicocokkan lewat email (akun lain dengan email sama tidak diambil alih)', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'korban', email: 'sama@mail.unpad.ac.id', role: 'ADMIN', isVerified: true } as never);
    db.user.create.mockResolvedValue({ id: 'baru', email: 'sama@mail.unpad.ac.id', role: 'STUDENT', isVerified: true } as never);

    const session = await authService.loginWithPaus({ npm: FMIPA_NPM, name: 'Mahasiswa', email: 'sama@mail.unpad.ac.id' });

    expect(session.user.id).toBe('baru');
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it('bentrok email saat membuat akun ditolak, bukan digabung ke akun lain', async () => {
    const { Prisma } = await import('@prisma/client');
    db.user.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' }));

    await expect(
      authService.loginWithPaus({ npm: FMIPA_NPM, name: 'Mahasiswa', email: 'dipakai@mail.unpad.ac.id' })
    ).rejects.toMatchObject({ code: 'account_conflict', status: 409 });
  });

  it('akun tanpa NPM boleh masuk hanya jika emailnya terdaftar sebagai dosen/admin', async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: 'd-1', email: 'dosen@unpad.ac.id', role: 'LECTURER', isVerified: true } as never);
    const lecturer = await authService.loginWithPaus({ npm: null, name: 'Dosen', email: 'dosen@unpad.ac.id' });
    expect(lecturer.user.id).toBe('d-1');

    db.user.findUnique.mockResolvedValueOnce({ id: 's-1', email: 'mhs@mail.unpad.ac.id', role: 'STUDENT', isVerified: true } as never);
    await expect(
      authService.loginWithPaus({ npm: null, name: 'Tanpa NPM', email: 'mhs@mail.unpad.ac.id' })
    ).rejects.toMatchObject({ code: 'not_registered' });
  });

  it('admin yang sudah punya akun memakai akun itu, tidak membuat akun baru', async () => {
    process.env.ADMIN_IDENTIFIERS = 'admin@unpad.ac.id';
    db.user.findUnique.mockResolvedValue({ id: 'a-lama', email: 'admin@unpad.ac.id', role: 'ADMIN', isVerified: true } as never);

    const session = await authService.loginWithPaus({ npm: null, name: 'Admin', email: 'admin@unpad.ac.id' });

    expect(session.user.id).toBe('a-lama');
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('membuat akun ADMIN untuk email di ADMIN_IDENTIFIERS', async () => {
    process.env.ADMIN_IDENTIFIERS = 'Admin.Fmipa@unpad.ac.id, 140810000001';
    db.user.create.mockResolvedValue({ id: 'a-1', email: 'admin.fmipa@unpad.ac.id', role: 'ADMIN', isVerified: true } as never);

    const session = await authService.loginWithPaus({ npm: null, name: 'Admin', email: 'admin.fmipa@unpad.ac.id' });

    expect(session.user.role).toBe('ADMIN');
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'ADMIN', email: 'admin.fmipa@unpad.ac.id' }) })
    );
  });
});

describe('Suara MIPA: kunci fakultas & program studi (authService.updateProfile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('program studi tidak bisa diubah lewat update profil (mengikuti NPM)', async () => {
    await authService.updateProfile('user-1', 'STUDENT', { major: 'Kimia', fullName: 'Nama' } as never);

    expect(db.studentProfile.update).toHaveBeenCalledWith({ where: { userId: 'user-1' }, data: { fullName: 'Nama' } });
  });

  it('foto profil wajib URL storage milik aplikasi', async () => {
    await expect(
      authService.updateProfile('user-1', 'STUDENT', { avatarUrl: 'https://evil.example/track.gif' })
    ).rejects.toThrow('URL foto profil tidak valid');
    expect(db.$transaction).not.toHaveBeenCalled();

    await authService.updateProfile('user-1', 'STUDENT', { avatarUrl: 'https://storage.test/suara-mipa-test/suara-mipa/avatars/a.png' });
    expect(db.$transaction).toHaveBeenCalledOnce();
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
