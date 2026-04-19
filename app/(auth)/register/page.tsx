// app/(auth)/register/page.tsx
import { Metadata } from "next"; // Tambahkan ini agar Metadata punya tipe data
import RegisterForm from "@/components/features/auth/RegisterForm";

// Metadata sudah pake type, jadi aman dari linter
export const metadata: Metadata = {
  title: "Daftar Akun | SuaraUnpad",
  description:
    "Buat akun baru untuk mulai melaporkan kerusakan di kampus Unpad.",
};

export default function RegisterPage() {
  return (
    <section className="p-4 sm:p-6 md:max-w-xl md:mx-auto">
      <RegisterForm />
    </section>
  );
}