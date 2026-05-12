export interface Author {
  id: string;
  email?: string;
  avatarUrl?: string | null;
  studentProfile?: { fullName: string } | null;
  lecturerProfile?: { fullName: string } | null;
  adminProfile?: { fullName: string } | null;
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
  author: Author;
  hasUpvoted?: boolean;
  _count?: { commentUpvotes: number };
  commentUpvotes?: { userId: string }[];
  replies?: CommentData[];
}

export type ActiveAction = { type: "reply" | "edit"; commentId: string } | null;
