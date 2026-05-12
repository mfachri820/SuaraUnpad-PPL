import { Metadata } from "next";
import LoginForm from "@/components/features/auth/LoginForm";
import Footer from "@/components/ui/Footer";
// Pakai tipe Metadata biar makin cakep di linter
export const metadata: Metadata = {
  title: "Masuk | SuaraUnpad",
  description: "Masuk ke akun SuaraUnpad Anda."
};

export default function LoginPage() {
  return (
    // Gunakan <main> atau <section> yang semantik
    <>
      <section className="p-0 sm:p-6 sm:pb-10 md:max-w-xl md:mx-auto">
        <LoginForm />
      </section>
      <Footer></Footer>
    </>
  );
}
