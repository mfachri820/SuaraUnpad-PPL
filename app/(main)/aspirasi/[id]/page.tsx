import CommentSection from "@/components/features/policies/CommentSection";
import { postService } from "@/services/postService";
import { FiArrowLeft, FiMessageSquare } from "react-icons/fi";

interface AuthorProfile {
  fullName: string;
}

interface PostDetail {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  authorId: string;
  author: {
    studentProfile?: AuthorProfile | null;
    lecturerProfile?: AuthorProfile | null;
    adminProfile?: AuthorProfile | null;
  };
  _count: {
    postUpvotes: number;
  };
}

export default async function AspirasiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let post: PostDetail | null = null;
  const { id } = await params;

  try {
    post = await postService.getPostById(id);
  } catch (error) {
    console.error("Failed to fetch aspirasi detail:", error);
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-sm">
            <h1 className="text-2xl font-black text-slate-900 mb-2">Postingan tidak ditemukan</h1>
            <p className="text-sm text-slate-500">Pastikan kembali tautannya atau kembali ke halaman aspirasi.</p>
            <a
              href="/aspirasi"
              className="mt-6 inline-flex items-center rounded-full bg-[#2682F9] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-600 transition"
            >
              Kembali ke Aspirasi
            </a>
          </div>
        </div>
      </div>
    );
  }

  const authorName =
    post.author.studentProfile?.fullName ||
    post.author.lecturerProfile?.fullName ||
    post.author.adminProfile?.fullName ||
    "Pengguna";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <a
          href="/aspirasi"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#2682F9] mb-6 transition"
        >
          <FiArrowLeft /> Kembali ke Aspirasi
        </a>

        <article className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-[#F99D26] font-bold text-lg uppercase">
              {authorName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-sm text-slate-500">
                <span className="font-bold text-slate-700">{authorName}</span>
                <span>·</span>
                <span>{new Date(post.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-3">{post.title}</h1>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{post.content}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4 text-slate-500">
            <FiMessageSquare className="text-lg" />
            <span className="text-sm font-bold">{post._count.postUpvotes} upvote</span>
          </div>
        </article>

        <CommentSection
          postId={post.id}
          title="Diskusi Aspirasi"
          placeholder="Bagikan pendapatmu mengenai aspirasi ini..."
        />
      </div>
    </div>
  );
}
