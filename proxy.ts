import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/jwt";
import { appUrl } from "@/lib/appUrl";

// Daftar endpoint API yang bisa diakses tanpa login (Kodingan BE Asli)
const publicApiPaths = new Set([
  "/api/auth/login", // mati kecuali PASSWORD_LOGIN_ENABLED=true (khusus development)
  "/api/auth/paus/redirect",
  "/api/auth/paus/callback",
  "/api/health",
]);

// Daftar halaman UI/Frontend yang boleh diakses TANPA login
const publicUIPaths = [
  "/login",
];

// Halaman UI khusus user (membuat laporan) yang tidak relevan untuk ADMIN
const adminBlockedUIPaths = [
  "/report",
  "/profil/my-report",
];

const IDENTITY_HEADERS = ["x-user-id", "x-user-role"];

// Redirect absolut dibangun dari APP_URL (bukan request.url) karena di belakang ingress
// standalone server melihat dirinya sebagai 0.0.0.0:3000. Lihat lib/appUrl.ts.
function redirectTo(request: NextRequest, pathname: string, error?: string) {
  const query = error ? `?error=${encodeURIComponent(error)}` : "";
  return NextResponse.redirect(appUrl(`${pathname}${query}`, request.nextUrl.origin));
}

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
      return redirectTo(request, "/login", "unauthorized");
    }

    // B. Jika user SUDAH login
    if (tokenCookie) {
      const secret = getJwtSecret();
      try {
        // Kita BONGKAR tokennya di sini untuk mengecek status isVerified
        const { payload } = await jwtVerify(tokenCookie, secret);
        const isVerified = payload.isVerified as boolean;
        const isAdmin = payload.role === "ADMIN";
        const homePath = isAdmin ? "/admin" : "/home";

        // B1. Jika user mengakses halaman Public UI (seperti /login) saat sudah login -> Tendang ke Home (admin ke panel admin)
        if (isPublicUI) {
          return redirectTo(request, homePath);
        }

        // B2. CEK VERIFIKASI: Jika belum verified & mencoba akses halaman SELAIN /verify-notice
        if (!isVerified && !pathname.startsWith("/verify-notice")) {
          return redirectTo(request, "/verify-notice");
        }

        // B3. CEK VERIFIKASI: Jika SUDAH verified tapi iseng buka /verify-notice -> Tendang ke Home
        if (isVerified && pathname.startsWith("/verify-notice")) {
          return redirectTo(request, homePath);
        }

        // B4. PEMISAHAN ROLE: Panel admin khusus ADMIN; admin tidak membuka halaman yang isinya hanya untuk membuat laporan
        const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
        const isUserOnlyPage = adminBlockedUIPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));
        if ((isAdminArea && !isAdmin) || (isUserOnlyPage && isAdmin)) {
          return redirectTo(request, homePath);
        }
      } catch {
        // Jika token kedaluwarsa atau diotak-atik: Hapus cookie & tendang ke login
        const response = redirectTo(request, "/login", "session_expired");
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
        { status: "error", message: "Akun belum aktif. Silakan hubungi admin." },
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
