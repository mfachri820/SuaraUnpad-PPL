import LoginForm from "@/components/features/auth/LoginForm";

export const metadata = {
  title: "Masuk | SuaraUnpad",
  description: "Masuk ke akun SuaraUnpad Anda."
};

export default function LoginPage() {
  return (
    <section className="p-4 sm:p-6 md:max-w-xl md:mx-auto">
      <LoginForm />
    </section>
  );
}
