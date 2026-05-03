// components/features/home/HomeFetch.ts

export interface Author {
  id: string;
  email: string;
  avatarUrl: string | null;
  studentProfile: { fullName: string } | null;
  lecturerProfile: { fullName: string } | null;
  adminProfile: { fullName: string } | null;
}

// Tambahkan interface untuk data upvote dari backend
export interface ReportUpvote {
  userId: string;
  reportId: string;
}

export interface Report {
  id: string;
  authorId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  imageUrl: string;
  status: "SUBMITTED" | "VERIFIED" | "IN_PROGRESS" | "RESOLVED";
  upvoteCount: number;
  createdAt: string;
  updatedAt: string;
  author: Author;
  reportUpvotes?: ReportUpvote[]; // Tambahkan ini sesuai struktur DB
  hasUpvoted?: boolean;
}

// Interface untuk standard response API
export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T | { data: T };
}

// FUNGSI HELPER: Membongkar token
export const getUserIdFromToken = (token: string | undefined): string | null => {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload);
    const parsed = JSON.parse(decoded);
    return parsed.userId;
  } catch (error) {
    return null;
  }
};

// FUNGSI API: Ambil semua laporan
export const fetchHomeReports = async (
  token: string | undefined,
  currentUserId: string | null
): Promise<Report[]> => {
  const res = await fetch("/api/reports", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    }
  });

  if (!res.ok) throw new Error("Gagal mengambil data API");

  const json = await res.json();
  
  // Normalisasi data dari berbagai kemungkinan struktur backend
  const rawReports: Report[] = json?.data?.data || json?.data || json;

  if (Array.isArray(rawReports)) {
    return rawReports.map((report: Report) => {
      const hasUserVoted =
        report.reportUpvotes?.some(
          (vote: ReportUpvote) => vote.userId === currentUserId
        ) || false;

      return {
        ...report,
        hasUpvoted: hasUserVoted
      };
    });
  }
  return [];
};

// FUNGSI API: Toggle upvote
export interface ToggleUpvoteResponse {
  status: string;
  message: string;
  data: {
    action: "upvoted" | "unvoted" | string;
  };
}

export const toggleUpvoteApi = async (
  reportId: string,
  token: string | undefined
): Promise<ToggleUpvoteResponse> => {
  const res = await fetch(`/api/reports/${reportId}/upvote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    }
  });
  if (!res.ok) throw new Error("Gagal melakukan upvote");
  return res.json();
};