"use client";
import { useEffect, Suspense } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// Sub-komponen ini bertugas memata-matai URL secara diam-diam
function AlertListener() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const errorMsg = searchParams.get("error");
    const successMsg = searchParams.get("success");

    // 1. Jika URL punya param ?error=...
    if (errorMsg) {
      if (errorMsg === "unauthorized" || errorMsg === "nologin") {
        toast.error("Akses ditolak. Silakan login terlebih dahulu.");
      } else {
        toast.error(decodeURIComponent(errorMsg));
      }
      // Hapus pesan dari URL agar tidak muncul lagi saat di-refresh
      router.replace(pathname, { scroll: false });
    }

    // 2. Jika URL punya param ?success=...
    if (successMsg) {
      toast.success(decodeURIComponent(successMsg));
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  return null; // Tidak me-render apapun ke layar
}

// Ini adalah Komponen Utama yang akan di-export
export default function StatusAlert() {
  return (
    <>
      {/* 🌟 Toaster ini adalah wadah melayang untuk notifikasinya */}
      <Toaster
        position="top-center"
        toastOptions={{
          // Kustomisasi style agar cocok dengan tema Tailwind SuaraUnpad
          className: "font-medium text-sm",
          duration: 4000,
          style: {
            borderRadius: "1rem", // rounded-2xl
            background: "#fff",
            color: "#334155", // text-slate-700
            boxShadow:
              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
          }
        }}
      />

      {/* 🌟 Pembungkus Suspense WAJIB ada di Next.js App Router jika pakai useSearchParams */}
      <Suspense fallback={null}>
        <AlertListener />
      </Suspense>
    </>
  );
}
