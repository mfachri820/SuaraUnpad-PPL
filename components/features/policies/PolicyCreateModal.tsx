"use client";

import { useState } from "react";
import { FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { createPolicy } from "./PolicyFetch";
import { useRouter } from "next/navigation";

export default function PolicyCreateModal({
  onClose
}: {
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createPolicy(title, content);
      toast.success("Wacana Kebijakan berhasil dikirim!");
      onClose();
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Terjadi kesalahan yang tidak terduga.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800">
            Buat Wacana Kebijakan
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:cursor-pointer hover:text-slate-600 transition"
          >
            <FiX className="text-2xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Judul Kebijakan
              </label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Perpanjangan Jam Malam Perpustakaan"
                className="w-full text-black bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#2682F9] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Isi/Keterangan
              </label>
              <textarea
                required
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tuliskan detail kebijakan yang diusulkan..."
                className="w-full text-black bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#2682F9] focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            {/* <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button> */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#2682F9] hover:bg-blue-600 hover:cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Mengirim..." : "Kirim Wacana"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
