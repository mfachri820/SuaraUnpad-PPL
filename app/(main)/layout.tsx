import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

export default function MainLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar></Navbar>
      {children}
      <Footer></Footer>
    </div>
  );
}
