import type { Prisma } from '@prisma/client';

export const authorSelect = {
  id: true,
  role: true,
  avatarUrl: true,
  studentProfile: { select: { fullName: true } },
  lecturerProfile: { select: { fullName: true } },
  adminProfile: { select: { fullName: true } }
} satisfies Prisma.UserSelect;

export type AuthorRecord = Prisma.UserGetPayload<{ select: typeof authorSelect }>;

export function getDisplayName(author: Partial<AuthorRecord> | null | undefined) {
  return (
    author?.studentProfile?.fullName ||
    author?.lecturerProfile?.fullName ||
    author?.adminProfile?.fullName ||
    'Pengguna'
  );
}

export function toPublicAuthor<T extends Partial<AuthorRecord>>(author: T) {
  return { ...author, displayName: getDisplayName(author) };
}
