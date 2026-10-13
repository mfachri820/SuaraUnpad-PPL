import Cookies from "js-cookie";

export interface ApiFieldError {
  path: string;
  message: string;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly errors?: ApiFieldError[]
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

interface ApiFetchOptions extends RequestInit {
  /** Default true: kalau 401, arahkan ke /login. Set false untuk halaman publik/auth. */
  redirectOnUnauthorized?: boolean;
}

/**
 * Helper fetch bersama untuk semua panggilan ke /api/*.
 * Otomatis memasang header Authorization dari cookie `token`, membongkar
 * envelope { status, message, data }, dan melempar ApiClientError berisi
 * message/code/errors dari server saat response tidak ok.
 */
export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { redirectOnUnauthorized = true, headers, ...rest } = options;
  const token = Cookies.get("token");
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;

  const res = await fetch(path, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  });

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    if (res.status === 401 && redirectOnUnauthorized && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiClientError(
      res.status,
      body?.message || "Terjadi kesalahan pada server.",
      body?.code,
      body?.errors
    );
  }

  return (body?.data ?? body) as T;
}

export function getApiErrorMessage(error: unknown, fallback = "Terjadi kesalahan pada server.") {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
