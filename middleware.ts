import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Secret key harus sama dengan yang ada di authService
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_key"
);

// Daftar endpoint yang bisa diakses tanpa login
const publicPaths = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/donations/webhook",
  "/api/auth/google",
  "/api/webhooks/midtrans" 
];

// ========================================================
// --- TAMBAHAN DARI FRONTEND (MULAI) ---
// Daftar halaman UI yang WAJIB login dan KHUSUS guest
const protectedPageRoutes = ["/home", "/aktivitas", "/report", "/notifikasi", "/profil", "/"]; 
const authPageRoutes = ["/login", "/register"];
// --- TAMBAHAN DARI FRONTEND (SELESAI) ---
// ========================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ========================================================
  // --- TAMBAHAN DARI FRONTEND (MULAI): LOGIKA REDIRECT UI ---
  // Kita ambil token dari cookies karena browser otomatis ngirim cookie saat buka halaman
  const tokenCookie = request.cookies.get("token")?.value;

  const isProtectedPage = protectedPageRoutes.some(
    (route) => pathname.startsWith(route) && pathname !== "/login"
  );
  const isAuthPage = authPageRoutes.some((route) => pathname.startsWith(route));

  // 1. Jika user belum login tapi buka halaman terproteksi -> Tendang ke /login
  // 1. Jika user belum login tapi buka halaman terproteksi -> Tendang ke /login
  if (isProtectedPage && !tokenCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    
    // --- TAMBAHAN UNTUK ALERT ---
    // Kita titipkan pesan error di URL (hasilnya jadi: /login?error=unauthorized)
    loginUrl.searchParams.set("error", "unauthorized");
    
    return NextResponse.redirect(loginUrl);
  }

  // 2. Jika user SUDAH login tapi iseng buka halaman /login -> Tendang ke /home
  if (isAuthPage && tokenCookie) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/home";
    return NextResponse.redirect(homeUrl);
  }
  // --- TAMBAHAN DARI FRONTEND (SELESAI) ---
  // ========================================================


  // ========================================================
  // LOGIKA BACKEND ASLI (PROTEKSI ENDPOINT API)
  // ========================================================
  
  // 1. Abaikan pengecekan untuk endpoint publik
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 2. Terapkan proteksi hanya untuk rute /api/
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
      // 3. Verifikasi token menggunakan library jose
      const { payload } = await jwtVerify(token, JWT_SECRET);

      // 4. Sisipkan data user ke dalam header agar bisa dibaca oleh file route.ts nanti
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
// --- TAMBAHAN DARI FRONTEND (MULAI): PERUBAHAN MATCHER ---
// Konfigurasi ini diubah agar middleware tidak hanya jalan di /api/, 
// tapi juga jalan saat user membuka halaman UI.
// Kita kecualikan file statis (gambar, css, dll) agar performa tetap ringan.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
// --- TAMBAHAN DARI FRONTEND (SELESAI) ---
// ========================================================