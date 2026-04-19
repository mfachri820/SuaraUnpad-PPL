// components/features/auth/AuthFetch.ts

// --- 1. DEFINISI INTERFACES ---

export interface LoginPayload {
  email: string;
  password?: string; // Optional karena Google Auth tidak butuh password di form
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  studentId: string;
  faculty: string;
  major: string;
  password?: string;
  role?: "STUDENT" | "ADMIN";
  isGoogleAuth?: boolean; // 🌟 TAMBAHKAN INI SESUAI PERMINTAAN BE
}

// 🌟 Buat cetakan khusus untuk menggantikan 'any' pada data
export interface AuthResponseData {
  token?: string;
  isNewUser?: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    isVerified: boolean;
  };
  googleData?: {
    email: string;
    fullName: string;
    avatarUrl?: string;
  };
  [key: string]: unknown; // Fleksibilitas ekstra jika backend nambah field, tanpa pakai any
}

// Interface untuk standard response API kamu
export interface AuthResponse {
  status: string;
  message: string;
  token?: string; // Tergantung backend, kadang di root
  data?: AuthResponseData; // 🌟 Ganti any menjadi AuthResponseData
}

// --- 2. FUNGSI FETCHING ---

// 🌟 Ganti Promise<any> menjadi Promise<AuthResponse>
export const verifyGoogleAuth = async (idToken: string): Promise<AuthResponse> => {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Gagal verifikasi Google");
  }

  return result;
};

export const registerManual = async (
  data: RegisterPayload
): Promise<AuthResponse> => {
  const payload = { ...data, role: "STUDENT", isGoogleAuth: false };

  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Gagal daftar akun");
  return result;
};

export const loginManual = async (
  data: LoginPayload
): Promise<AuthResponse> => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Login gagal");
  }
  return result;
};

export const completeGoogleProfile = async (
  data: RegisterPayload
): Promise<AuthResponse> => {
  const payload = {
    ...data,
    password: "GOOGLE_AUTH_USER",
    role: "STUDENT",
    isGoogleAuth: true
  };

  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Gagal melengkapi profil");
  return result;
};