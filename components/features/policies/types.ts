export type Role = "STUDENT" | "LECTURER" | "ADMIN";

export interface Author {
  id: string;
  role?: Role;
  avatarUrl?: string | null;
  displayName?: string;
  studentProfile?: { fullName: string } | null;
  lecturerProfile?: { fullName: string } | null;
  adminProfile?: { fullName: string } | null;
}

// Nama siap tampil dari server (author.displayName). Fallback dipakai kalau data lama/tidak lengkap.
export function getAuthorName(author: Author | null | undefined): string {
  return author?.displayName || "Pengguna";
}

export function isAdminAuthor(author: Author | null | undefined): boolean {
  return author?.role === "ADMIN";
}

export interface Policy {
  id: string;
  title: string;
  content: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  author: Author;
  userVote: "AGREE" | "DISAGREE" | null;
  agreeCount: number;
  disagreeCount: number;
  createdAt?: string;
}

export interface CommentData {
  id: string;
  content: string;
  authorId: string;
  postId?: string | null;
  policyId?: string | null;
  parentId?: string | null;
  author: Author;
  isDeleted?: boolean;
  hasUpvoted?: boolean;
  _count?: { commentUpvotes: number };
  replies?: CommentData[];
}

export type ActiveAction = { type: "reply" | "edit"; commentId: string } | null;
