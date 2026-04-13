// components/features/auth/AuthFetch.ts

/**
 * 1. Definisi Interface sesuai Dokumentasi API (Postman)
 * Ini memastikan tidak ada error 'any' dan memudahkan autocompletion.
 */
export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  studentId: string;
  faculty: string;
  major: string;
  role: string; // "STUDENT"
}

export interface LoginPayload {
  email: string;
  password?: string;
}

interface AuthResponse {
  status: string;
  message: string;
  data?: any; // Data response dari backend (token, user info, dll)
}

/**
 * 2. Fungsi Registrasi Manual
 * Mengirim data lengkap sesuai kontrak API di Postman.
 */
export const registerManual = async (data: RegisterPayload): Promise<AuthResponse> => {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result: AuthResponse = await res.json();

  if (!res.ok) {
    // Jika Prisma error di backend, pesan error dari backend akan dilempar ke sini
    throw new Error(result.message || "Gagal daftar akun");
  }

  return result;
};

/**
 * 3. Fungsi Login Manual
 */
export const loginManual = async (data: LoginPayload): Promise<AuthResponse> => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result: AuthResponse = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Login gagal");
  }

  return result;
};

/**
 * 4. Fungsi Verifikasi Google Auth
 */
export const verifyGoogleAuth = async (idToken: string): Promise<AuthResponse> => {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const result: AuthResponse = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Gagal verifikasi Google");
  }

  return result;
};

/**
 * 5. Fungsi Lengkapi Profil (Google Users)
 */
export const completeGoogleProfile = async (data: RegisterPayload): Promise<AuthResponse> => {
  const payload = {
    ...data,
    password: "GOOGLE_AUTH_USER", // Penanda khusus untuk akun Google
    role: "STUDENT",
  };

  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result: AuthResponse = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Gagal melengkapi profil");
  }

  return result;
};