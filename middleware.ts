import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Secret key harus sama dengan yang ada di authService
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key');

// Daftar endpoint yang bisa diakses tanpa login
const publicPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/webhooks/midtrans' // Webhook midtrans tidak pakai JWT
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Abaikan pengecekan untuk endpoint publik
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 2. Terapkan proteksi hanya untuk rute /api/
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'error', message: 'Akses ditolak. Token tidak ditemukan.' },
        { status: 401 }
      );
    }

    // Ambil string token setelah kata "Bearer "
    const token = authHeader.split(' ')[1];

    try {
      // 3. Verifikasi token menggunakan library jose
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // 4. Sisipkan data user ke dalam header agar bisa dibaca oleh file route.ts nanti
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.userId as string);
      requestHeaders.set('x-user-role', payload.role as string);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      return NextResponse.json(
        { status: 'error', message: 'Sesi tidak valid atau telah kadaluarsa.' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

// Konfigurasi ini mengatur agar middleware hanya jalan di path /api/
export const config = {
  matcher: ['/api/:path*'],
};