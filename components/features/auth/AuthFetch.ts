// components/features/auth/AuthFetch.ts

export const verifyGoogleAuth = async (idToken: string) => {
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

export const registerManual = async (data: any) => {
  // HAPUS baris ini: const payload = { ...data, role: "STUDENT" };
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data) // Langsung kirim data apa adanya
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Gagal daftar akun");
  return result;
};

export const loginManual = async (data: any) => {
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

export const completeGoogleProfile = async (data: any) => {
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
