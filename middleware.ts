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
  "/api/auth/verify",
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
  const tokenCookie = request.cookies.get("token")?.value;

  if (!pathname.startsWith("/api/")) {
    const isPublicUI = publicUIPaths.some((path) => pathname.startsWith(path));

    // A. Jika user BELUM login & mencoba akses halaman SELAIN public UI
    if (!tokenCookie && !isPublicUI) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    // B. Jika user SUDAH login
    if (tokenCookie) {
      try {
        // Kita BONGKAR tokennya di sini untuk mengecek status isVerified
        const { payload } = await jwtVerify(tokenCookie, JWT_SECRET);
        const isVerified = payload.isVerified as boolean;

        // B1. Jika user mengakses halaman Public UI (seperti /login) saat sudah login -> Tendang ke Home
        if (isPublicUI) {
          const homeUrl = request.nextUrl.clone();
          homeUrl.pathname = "/home"; 
          return NextResponse.redirect(homeUrl);
        }

        // B2. CEK VERIFIKASI: Jika belum verified & mencoba akses halaman SELAIN /verify-notice
        if (!isVerified && !pathname.startsWith("/verify-notice")) {
          const noticeUrl = request.nextUrl.clone();
          noticeUrl.pathname = "/verify-notice";
          return NextResponse.redirect(noticeUrl);
        }

        // B3. CEK VERIFIKASI: Jika SUDAH verified tapi iseng buka /verify-notice -> Tendang ke Home
        if (isVerified && pathname.startsWith("/verify-notice")) {
          const homeUrl = request.nextUrl.clone();
          homeUrl.pathname = "/home";
          return NextResponse.redirect(homeUrl);
        }


      } catch (error) {
        // Jika token kedaluwarsa atau diotak-atik: Hapus cookie & tendang ke login
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.searchParams.set("error", "session_expired");
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("token");
        return response;
      }
    }
  }

  // ========================================================
  // 2. LOGIKA BACKEND (API PROTECTION) - DITAMBAH PROTEKSI VERIFIKASI
  // ========================================================
  if (publicApiPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak. Token tidak ditemukan." },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // CEK VERIFIKASI DI API: Cegah user nembak API via Postman kalau belum verified
      if (!payload.isVerified) {
         return NextResponse.json(
           { status: "error", message: "Akun belum terverifikasi. Silakan cek email Anda." },
           { status: 403 } // 403 Forbidden (Login sukses, tapi hak akses ditolak)
         );
      }

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
// 3. KONFIGURASI MATCHER
// ========================================================
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};