import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Secret key harus sama dengan yang ada di authService
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_key"
);

// Daftar endpoint API yang bisa diakses tanpa login (Kodingan BE Asli)
const publicApiPaths = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/donations/webhook",
  "/api/auth/google",
  "/api/webhooks/midtrans" 
];

// Daftar halaman UI/Frontend yang boleh diakses TANPA login
const publicUIPaths = [
  "/login",
  "/register",
  "/complete-profile",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ========================================================
  // 1. LOGIKA FRONTEND (UI ROUTING & REDIRECT)
  // ========================================================
  // Kita cek token dari cookies browser
  const tokenCookie = request.cookies.get("token")?.value;

  // Pastikan logika redirect ini HANYA jalan untuk halaman UI, BUKAN untuk /api/
  if (!pathname.startsWith("/api/")) {
    const isPublicUI = publicUIPaths.some((path) => pathname.startsWith(path));

    // Jika user belum login & mencoba akses halaman SELAIN /login atau /register
    if (!tokenCookie && !isPublicUI) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    // Jika user SUDAH login tapi mencoba akses /login atau /register lagi
    if (tokenCookie && isPublicUI) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/home"; 
      return NextResponse.redirect(homeUrl);
    }
  }

  // ========================================================
  // 2. LOGIKA BACKEND (API PROTECTION) - TIDAK DIOTAK-ATIK
  // ========================================================
  
  // Abaikan pengecekan untuk endpoint publik
  if (publicApiPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Terapkan proteksi hanya untuk rute /api/
  if (pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak. Token tidak ditemukan." },
        { status: 401 }
      );
    }

    // Ambil string token setelah kata "Bearer "
    const token = authHeader.split(" ")[1];

    try {
      // Verifikasi token menggunakan library jose
      const { payload } = await jwtVerify(token, JWT_SECRET);

      // Sisipkan data user ke dalam header agar bisa dibaca oleh file route.ts nanti
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", payload.userId as string);
      requestHeaders.set("x-user-role", payload.role as string);

      return NextResponse.next({
        request: {
          headers: requestHeaders
        }
      });
    } catch (error) {
      return NextResponse.json(
        { status: "error", message: "Sesi tidak valid atau telah kadaluarsa." },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

// ========================================================
// 3. KONFIGURASI MATCHER (WAJIB DIUBAH)
// ========================================================
// Middleware sekarang berjalan di SEMUA path (termasuk UI), 
// KECUALI file statis bawaan Next.js agar performa aplikasi tetap ngebut.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};