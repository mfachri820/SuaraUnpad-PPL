import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolveTestDatabase } from '../../qa/environment.cjs';

export default async function setup() {
  const database = resolveTestDatabase();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: database.url }) });
  try {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    const passwordHash = await bcrypt.hash('Sprint4QaPassword!', 10);
    const fixtures: Record<string, { id: string; email: string; name: string }> = {};
    for (const [key, role, name, verified] of [
      ['admin', 'ADMIN', 'Admin QA Sprint 4', true],
      ['author', 'STUDENT', 'Penulis QA Sprint 4', true],
      ['reporter', 'STUDENT', 'Pelapor QA Sprint 4', true],
      ['lecturer', 'LECTURER', 'Dosen QA Sprint 4', true],
      ['unverified', 'STUDENT', 'Belum Verifikasi QA', false],
    ] as const) {
      const user = await prisma.user.create({
        data: {
          email: `${key}@sprint4.test`, role, isVerified: verified, passwordHash,
          ...(role === 'ADMIN'
            ? { adminProfile: { create: { fullName: name, department: 'FMIPA' } } }
            : role === 'LECTURER'
              ? { lecturerProfile: { create: { fullName: name, employeeId: 'QA-LECTURER-4', faculty: 'FMIPA' } } }
              : { studentProfile: { create: { fullName: name, studentId: `140810${String(Object.keys(fixtures).length).padStart(4, '0')}`, faculty: 'FMIPA', major: 'Matematika' } } }),
        },
      });
      fixtures[key] = { id: user.id, email: user.email, name };
    }
    const output = path.join(database.root, 'tests/results/sprint-4/playwright');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'fixtures.json'), JSON.stringify(fixtures, null, 2));
  } finally { await prisma.$disconnect(); }
}
