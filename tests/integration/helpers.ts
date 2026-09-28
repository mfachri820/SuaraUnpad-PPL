import { prisma } from '@/lib/prisma';

type Role = 'STUDENT' | 'LECTURER' | 'ADMIN';

export interface TestUser {
  id: string;
  role: Role;
  email: string;
}

export async function resetDatabase() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

let counter = 0;

export async function createUser(role: Role = 'STUDENT', options: { isVerified?: boolean; name?: string } = {}) {
  counter += 1;
  const name = options.name ?? `${role.toLowerCase()} ${counter}`;
  const email = `${role.toLowerCase()}${counter}-${Date.now()}@test.local`;
  const profile =
    role === 'ADMIN'
      ? { adminProfile: { create: { fullName: name, department: 'FMIPA' } } }
      : role === 'LECTURER'
        ? { lecturerProfile: { create: { fullName: name, employeeId: `EMP-${counter}-${Date.now()}`, faculty: 'FMIPA' } } }
        : { studentProfile: { create: { fullName: name, studentId: `${Date.now()}${counter}`.slice(-12), faculty: 'FMIPA', major: 'Matematika' } } };

  const user = await prisma.user.create({
    data: { email, role, isVerified: options.isVerified ?? true, passwordHash: 'x', ...profile },
    select: { id: true, role: true, email: true },
  });
  return user as TestUser;
}

export function apiRequest(
  method: string,
  path: string,
  options: { user?: TestUser; body?: unknown } = {}
) {
  const headers = new Headers();
  if (options.user) {
    headers.set('x-user-id', options.user.id);
    headers.set('x-user-role', options.user.role);
  }
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

export const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

export async function readJson(response: Response) {
  return { status: response.status, body: await response.json() };
}

export { prisma };
