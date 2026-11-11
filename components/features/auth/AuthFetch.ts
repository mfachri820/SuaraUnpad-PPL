// components/features/auth/AuthFetch.ts

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
}

export interface AuthResponse<T = { token?: string; user?: SessionUser }> {
  status: string;
  message: string;
  data?: T;
}

async function parseOrThrow<T>(res: Response, fallbackMessage: string): Promise<AuthResponse<T>> {
  const result = (await res.json().catch(() => null)) as AuthResponse<T> | null;
  if (!res.ok || !result) throw new Error(result?.message || fallbackMessage);
  return result;
}

// Login email + password: hanya aktif untuk development lokal (PASSWORD_LOGIN_ENABLED=true).
export const loginManual = async (data: LoginPayload) => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return parseOrThrow<{ token?: string; user?: SessionUser }>(res, "Login gagal");
};
