import { Metadata } from "next";
import LoginForm from "@/components/features/auth/LoginForm";

// Pakai tipe Metadata biar makin cakep di linter
export const metadata: Metadata = {
  title: "Masuk | SuaraUnpad",
  description: "Masuk ke akun SuaraUnpad Anda.",
};

export default function LoginPage() {
  return (
    // Gunakan <main> atau <section> yang semantik
    <section className="p-4 sm:p-6 md:max-w-xl md:mx-auto">
      <LoginForm />
    </section>
  );
}