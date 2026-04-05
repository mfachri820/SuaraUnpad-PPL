// app/(main)/lapor/page.tsx
import ReportForm from "@/components/features/report/ReportForm";

export default function LaporPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">

      {/* Panggil Komponen Form Utama */}
      <section className="p-4 sm:p-6 md:max-w-xl md:mx-auto">
        <ReportForm />
      </section>

      
    </main>
  );
}
