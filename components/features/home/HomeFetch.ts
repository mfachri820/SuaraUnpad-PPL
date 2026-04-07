// components/features/home/HomeFetch.ts

export interface Author {
  id: string;
  email: string;
  avatarUrl: string | null;
  studentProfile: { fullName: string } | null;
  lecturerProfile: { fullName: string } | null;
  adminProfile: { fullName: string } | null;
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
  hasUpvoted?: boolean;
}

// FUNGSI HELPER: Membongkar token
export const getUserIdFromToken = (token: string | undefined) => {
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
) => {
  const res = await fetch("/api/reports", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    }
  });

  if (!res.ok) throw new Error("Gagal mengambil data API");

  const json = await res.json();
  const rawReports = json?.data?.data || json?.data || json;

  if (Array.isArray(rawReports)) {
    // Looping pengecekan upvote dipindah ke sini agar UI component bersih
    return rawReports.map((report: any) => {
      const hasUserVoted =
        report.reportUpvotes?.some(
          (vote: any) => vote.userId === currentUserId
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
export const toggleUpvoteApi = async (
  reportId: string,
  token: string | undefined
) => {
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
