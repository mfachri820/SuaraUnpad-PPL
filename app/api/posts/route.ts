import { postService, CreatePostPayload, GetPostsFilter } from '@/services/postService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// 1. GET: List Postingan (Public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    
    const filter: GetPostsFilter = {
      page: pageParam ? parseInt(pageParam) : undefined,
      limit: limitParam ? parseInt(limitParam) : undefined,
      policyId: searchParams.get('policyId') || undefined,
    };

    const result = await postService.getPosts(filter);
    return successResponse(result, 'Berhasil mengambil daftar postingan', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return errorResponse(errorMessage, 500);
  }
}

// 2. POST: Buat Postingan Baru (Semua User Login)
export async function POST(request: Request) {
  try {
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    const body = (await request.json()) as CreatePostPayload;

    if (!body.title || !body.content) {
      return errorResponse('Data tidak lengkap. title dan content wajib diisi.', 400);
    }

    const newPost = await postService.createPost(currentUserId, body);
    return successResponse(newPost, 'Postingan berhasil dibuat', 201);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage === 'Kebijakan yang dikaitkan tidak ditemukan' ? 404 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}