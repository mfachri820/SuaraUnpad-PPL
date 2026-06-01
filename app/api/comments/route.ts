import { commentService, CreateCommentPayload, GetCommentsFilter } from '@/services/commentService';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// 1. GET: Ambil Komentar Berdasarkan Postingan/Kebijakan (Public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Tangkap parameter opsional dari URL
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    
    const filter: GetCommentsFilter = {
      postId: searchParams.get('postId') || undefined,
      policyId: searchParams.get('policyId') || undefined,
      page: pageParam ? parseInt(pageParam) : undefined,
      limit: limitParam ? parseInt(limitParam) : undefined,
    };

    const result = await commentService.getComments(filter);
    return successResponse(result, 'Berhasil mengambil daftar komentar', 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    // Jika user tidak mengirim postId/policyId, ini adalah kesalahan mereka (400 Bad Request)
    const statusCode = errorMessage.includes('wajib diisi') ? 400 : 500;
    return errorResponse(errorMessage, statusCode);
  }
}

// 2. POST: Buat Komentar atau Balasan (Wajib Login)
export async function POST(request: Request) {
  try {
    const currentUserId = request.headers.get('x-user-id');
    if (!currentUserId) {
      return errorResponse('Akses ditolak. Silakan login terlebih dahulu.', 401);
    }

    const body = (await request.json()) as CreateCommentPayload;

    if (!body.content) {
      return errorResponse('Isi komentar tidak boleh kosong.', 400);
    }

    const newComment = await commentService.createComment(currentUserId, body);
    return successResponse(newComment, 'Komentar berhasil dikirim', 201);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    const statusCode = errorMessage.includes('tidak ditemukan') ? 404 : 400;
    return errorResponse(errorMessage, statusCode);
  }
}