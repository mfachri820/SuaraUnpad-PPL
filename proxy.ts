import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/jwt";

// Daftar endpoint API yang bisa diakses tanpa login (Kodingan BE Asli)
const publicApiPaths = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify",
  "/api/auth/google",
  "/api/webhooks/midtrans",
  "/api/health",
]);

// Daftar halaman UI/Frontend yang boleh diakses TANPA login
const publicUIPaths = [
  "/login",
  "/register",
  "/complete-profile",
];

const IDENTITY_HEADERS = ["x-user-id", "x-user-role"];

function withoutIdentityHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  IDENTITY_HEADERS.forEach((name) => headers.delete(name));
  return headers;
}

export async function proxy(request: NextRequest) {
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
      const secret = getJwtSecret();
      try {
        // Kita BONGKAR tokennya di sini untuk mengecek status isVerified
        const { payload } = await jwtVerify(tokenCookie, secret);
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
      } catch {
        // Jika token kedaluwarsa atau diotak-atik: Hapus cookie & tendang ke login
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.searchParams.set("error", "session_expired");
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("token");
        return response;
      }
    }

    return NextResponse.next();
  }

  // ========================================================
  // 2. LOGIKA BACKEND (API PROTECTION) - DITAMBAH PROTEKSI VERIFIKASI
  // ========================================================
  if (publicApiPaths.has(pathname)) {
    return NextResponse.next({ request: { headers: withoutIdentityHeaders(request) } });
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { status: "error", message: "Akses ditolak. Token tidak ditemukan." },
      { status: 401 }
    );
  }

  const token = authHeader.split(" ")[1];
  const secret = getJwtSecret();

  try {
    const { payload } = await jwtVerify(token, secret);

    // CEK VERIFIKASI DI API: Cegah user nembak API via Postman kalau belum verified
    if (!payload.isVerified) {
      return NextResponse.json(
        { status: "error", message: "Akun belum terverifikasi. Silakan cek email Anda." },
        { status: 403 } // 403 Forbidden (Login sukses, tapi hak akses ditolak)
      );
    }

    if (pathname.startsWith("/api/admin") && payload.role !== "ADMIN") {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak. Hanya Admin yang diizinkan." },
        { status: 403 }
      );
    }

    const requestHeaders = withoutIdentityHeaders(request);
    requestHeaders.set("x-user-id", payload.userId as string);
    requestHeaders.set("x-user-role", payload.role as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Sesi tidak valid atau telah kadaluarsa." },
      { status: 401 }
    );
  }
}

// ========================================================
// 3. KONFIGURASI MATCHER
// ========================================================
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
