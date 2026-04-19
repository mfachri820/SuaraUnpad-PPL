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
}

// Interface untuk standard response API kamu
export interface AuthResponse {
  status: string;
  message: string;
  token?: string; // Tergantung backend, kadang di root
  data?: any;    // Kita biarkan any di sini karena data-nya dinamis dari backend
}

// --- 2. FUNGSI FETCHING ---

export const verifyGoogleAuth = async (idToken: string): Promise<any> => {
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

export const registerManual = async (data: RegisterPayload): Promise<AuthResponse> => {
  const payload = { ...data, role: "STUDENT" };

  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data) // Langsung kirim data apa adanya
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Gagal daftar akun");
  return result;
};

export const loginManual = async (data: LoginPayload): Promise<AuthResponse> => {
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

export const completeGoogleProfile = async (data: RegisterPayload): Promise<AuthResponse> => {
  const payload = {
    ...data,
    password: "GOOGLE_AUTH_USER"
    // HAPUS role: "STUDENT" di sini
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