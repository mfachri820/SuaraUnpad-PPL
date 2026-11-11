import { Metadata } from "next";
import LoginForm from "@/components/features/auth/LoginForm";
import Footer from "@/components/ui/Footer";
import { isPasswordLoginEnabled } from "@/lib/authFeatures";

// Dirender per request supaya flag PASSWORD_LOGIN_ENABLED dibaca saat runtime, bukan saat build.
export const dynamic = "force-dynamic";
// Pakai tipe Metadata biar makin cakep di linter
export const metadata: Metadata = {
  title: "Masuk | Suara MIPA",
  description: "Masuk ke akun Suara MIPA Anda."
};

export default function LoginPage() {
  return (
    // Gunakan <main> atau <section> yang semantik
    <>
      <section className="p-0 sm:p-6 sm:pb-10 md:max-w-xl md:mx-auto">
        <LoginForm passwordLoginEnabled={isPasswordLoginEnabled()} />
      </section>
      <Footer></Footer>
    </>
  );
}
