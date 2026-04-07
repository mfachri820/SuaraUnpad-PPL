import CompleteProfileForm from "@/components/features/auth/CompleteProfileForm";

export const metadata = {
  title: "Lengkapi Profil | SuaraUnpad",
  description: "Lengkapi data akademik Anda untuk menyelesaikan pendaftaran."
};

export default function CompleteProfilePage() {
  return (
    <section className="p-4 sm:p-6 md:max-w-xl md:mx-auto">
      <CompleteProfileForm></CompleteProfileForm>
    </section>
  );
}
