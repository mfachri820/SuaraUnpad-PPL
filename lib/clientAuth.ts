import { useEffect, useState } from "react";
import Cookies from "js-cookie";

export type ClientRole = "STUDENT" | "LECTURER" | "ADMIN";

export interface TokenPayload {
  userId?: string;
  role?: ClientRole;
  isVerified?: boolean;
}

// Membaca isi JWT di cookie tanpa verifikasi (hanya untuk tampilan; keamanan tetap di proxy & API).
export function decodeToken(token: string | undefined | null): TokenPayload | null {
  if (!token) return null;
  try {
    const payloadBase64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payloadBase64)) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenPayload(): TokenPayload | null {
  return decodeToken(Cookies.get("token"));
}

export function homePathFor(role: string | undefined | null) {
  return role === "ADMIN" ? "/admin" : "/home";
}

// Dibaca setelah mount agar hasil render server dan klien tetap sama.
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- token cookie hanya bisa dibaca di klien
    setIsAdmin(getTokenPayload()?.role === "ADMIN");
  }, []);
  return isAdmin;
}
