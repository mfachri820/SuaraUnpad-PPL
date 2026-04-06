// app/home/page.tsx
import HomeFeed from "@/components/features/home/HomeFeed";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <main className="grow max-w-xl mx-auto w-full px-4 py-8">
        {/* Opsional: Bagian Banner Hero kuning bisa kamu taruh di sini nanti */}

        {/* Komponen Feed Laporan Utama */}
        <HomeFeed />
      </main>
    </div>
  );
}
