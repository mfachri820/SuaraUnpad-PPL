import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-lg">
        {/* Angka 404 Raksasa */}
        <h1 className="text-9xl font-black text-slate-200 ">
          404
        </h1>

        {/* Pesan Error */}
        <h2 className="text-3xl font-black text-slate-800 mt-4 mb-2">
          Waduh, Kamu Nyasar!
        </h2>
        <p className="text-slate-500 mb-8">
          Halaman yang kamu cari tidak dapat ditemukan. Mungkin kamu salah ketik
          URL, atau halamannya sudah dihapus oleh admin.
        </p>

        {/* Tombol Redirect */}
        <Link
          href="/home"
          className="inline-block bg-[#ffb656] hover:bg-[#F99D26] text-white font-black py-4 px-8 rounded-2xl active:scale-95 "
        >
          KEMBALI KE BERANDA
        </Link>
      </div>
    </div>
  );
}
