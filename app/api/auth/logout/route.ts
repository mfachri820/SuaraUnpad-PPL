import { successResponse } from '@/lib/apiResponse';

export async function POST() {
  // Dalam arsitektur JWT Bearer murni, Backend tidak perlu melakukan query database untuk logout.
  // Frontend yang akan bertugas menghapus token dari perangkat user setelah menerima response ini.
  return successResponse(null, 'Logout berhasil. Silakan hapus token di sisi klien.', 200);
}