// app/(auth)/register/page.tsx

import RegisterForm from "@/components/features/auth/RegisterForm";

export const metadata = {
  title: "Daftar Akun | SuaraUnpad",
  description:
    "Buat akun baru untuk mulai melaporkan kerusakan di kampus Unpad."
};

export default function RegisterPage() {
  return (
    <section className="p-4 sm:p-6 md:max-w-xl md:mx-auto">
      <RegisterForm />
    </section>
  );
}
