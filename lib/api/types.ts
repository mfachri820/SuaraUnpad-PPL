// Tipe TypeScript siap pakai untuk FE, mengikuti docs/API_CONTRACT_FE.md §9.
// Sumber kebenaran adalah kontrak itu; file ini hanya salinan yang dipakai langsung oleh komponen.

export type Role = 'STUDENT' | 'LECTURER' | 'ADMIN';
export type PostKind = 'ASPIRASI' | 'ANNOUNCEMENT';
export type FlagReason = 'SPAM' | 'UJARAN_KEBENCIAN' | 'PELECEHAN' | 'HOAKS' | 'TIDAK_RELEVAN' | 'LAINNYA';

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  SPAM: 'Spam',
  UJARAN_KEBENCIAN: 'Ujaran kebencian',
  PELECEHAN: 'Pelecehan',
  HOAKS: 'Hoaks / informasi palsu',
  TIDAK_RELEVAN: 'Tidak relevan',
  LAINNYA: 'Lainnya'
};

export interface ApiSuccess<T> { status: 'success'; message: string; data: T }
export interface ApiError {
  status: 'error'; message: string; code?: string;
  errors?: { path: string; message: string }[];
}
export interface Paginated<T> {
  data: T[];
  meta: { currentPage: number; itemsPerPage: number; totalItems: number; totalPages: number };
}

export interface PublicAuthor {
  id: string; role: Role; avatarUrl: string | null; displayName: string;
  studentProfile: { fullName: string } | null;
  lecturerProfile: { fullName: string } | null;
  adminProfile: { fullName: string } | null;
}

export interface Post {
  id: string; authorId: string; policyId: string | null;
  kind: PostKind; title: string; content: string; imageUrl: string | null;
  pinnedUntil: string | null; closedAt: string | null; closedReason: string | null; closedById: string | null;
  createdAt: string; updatedAt: string;
  author: PublicAuthor; closedBy: PublicAuthor | null;
  policy: { id: string; title: string } | null;
  _count: { postUpvotes: number; comments: number };
  isClosed: boolean; isPinned: boolean; hasUpvoted: boolean;
}

export interface Comment {
  id: string; authorId: string; postId: string | null; policyId: string | null; parentId: string | null;
  createdAt: string; content: string; isDeleted: boolean;
  author: PublicAuthor; _count: { commentUpvotes: number }; hasUpvoted: boolean;
  replies?: Comment[];
}

export interface FlagSummary {
  id: string; author: PublicAuthor; postId: string | null; createdAt: string; contentSnippet: string;
  flagCount: number; reasons: Partial<Record<FlagReason, number>>;
  notes: { note: string; createdAt: string }[]; latestFlagAt: string | null; oldestFlagAt: string | null;
}
export type FlagQueueItem =
  | (FlagSummary & { type: 'comment'; isDeleted: boolean; policyId: string | null; contextTitle: string | null })
  | (FlagSummary & { type: 'post'; kind: PostKind; title: string; isClosed: boolean });

export interface AdminStats {
  totalPosts: number; totalAnnouncements: number; totalPolicies: number; totalReports: number;
  pendingFlags: { posts: number; comments: number; total: number };
  sla: SlaSummary;
}

export type ReportStatus = 'SUBMITTED' | 'VERIFIED' | 'IN_PROGRESS' | 'RESOLVED';
export type ReportCategory = 'POTHOLE' | 'CRACK' | 'CORROSION' | 'SAMPAH' | 'OTHER';

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  SUBMITTED: 'Diajukan',
  VERIFIED: 'Terverifikasi',
  IN_PROGRESS: 'Diproses',
  RESOLVED: 'Selesai'
};

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  POTHOLE: 'Jalan berlubang',
  CRACK: 'Retakan',
  CORROSION: 'Korosi',
  SAMPAH: 'Sampah',
  OTHER: 'Lainnya'
};

export interface SlaSummary {
  windowDays: number;
  reports: {
    byStatus: Record<ReportStatus, number>; open: number; oldestOpenAt: string | null;
    resolvedLast7Days: number; avgVerifyMs: number | null; avgResolveMs: number | null; resolvedSample: number;
    daily: { day: string; created: number; resolved: number }[];
    byCategory: Partial<Record<ReportCategory, number>>;
    openAge: { under1d: number; d1to3: number; d3to7: number; over7d: number };
  };
  flags: { pending: number; oldestPendingAt: string | null; avgReviewMs: number | null; reviewedSample: number };
}

export interface AdminReportItem {
  id: string; title: string; description: string; category: ReportCategory; location: string;
  imageUrl: string; status: ReportStatus; upvoteCount: number; author: PublicAuthor;
  createdAt: string; verifiedAt: string | null; inProgressAt: string | null; resolvedAt: string | null;
}

export type NotificationType =
  | 'COMMENT_ON_POST' | 'COMMENT_ON_POLICY' | 'REPLY_ON_COMMENT'
  | 'UPVOTE_POST' | 'UPVOTE_REPORT' | 'UPVOTE_COMMENT' | 'REPORT_STATUS_CHANGED'
  | 'POST_CLOSED' | 'CONTENT_REMOVED' | 'NEW_ANNOUNCEMENT';

export const ANNOUNCEMENT_PIN_DAYS = [1, 3, 7, 30] as const;
export type AnnouncementPinDays = (typeof ANNOUNCEMENT_PIN_DAYS)[number];

export const UPLOAD_FOLDERS = ['posts', 'announcements', 'reports', 'avatars', 'campaigns', 'general'] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];
