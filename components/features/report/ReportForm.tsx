"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { FaCamera } from "react-icons/fa";
import { IoMdInformationCircle } from "react-icons/io";
// import imageCompression from "browser-image-compression";
import Image from "next/image";

// import fungsi helper
import {
  fetchCategoriesApi,
  uploadImage,
  submitReport,
  ReportPayload
} from "./ReportFetch";

interface ReportFormData {
  image: FileList;
  title: string;
  category: string;
  location: string;
  description: string;
}

export default function ReportForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    trigger
  } = useForm<ReportFormData>();

  // States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>(
    []
  );
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // TOKEN SEMENTARA
  const TEMP_TOKEN =
    "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJlNjYxMWE4Ny0zNTFmLTRjZGUtYWNmYi1mYzk0MjNkNTgzNGYiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzU0MTg1NDcsImV4cCI6MTc3NjAyMzM0N30.pJqQnDfRi192308iZCona_comCKNr98F03sa-6QHun8";

  // Narik data categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategoriesApi(TEMP_TOKEN);
        setCategories(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Image handler untuk Preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSequentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isImageValid = await trigger("image");
    if (!isImageValid) {
      document
        .getElementById("section-foto")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const isCategoryValid = await trigger("category");
    if (!isCategoryValid) {
      document
        .getElementById("section-kategori")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const isTitleValid = await trigger("title");
    if (!isTitleValid) {
      document
        .getElementById("section-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("input-title")?.focus();
      return;
    }

    const isLocationValid = await trigger("location");
    if (!isLocationValid) {
      document
        .getElementById("section-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("input-location")?.focus();
      return;
    }

    const isDescValid = await trigger("description");
    if (!isDescValid) {
      document
        .getElementById("section-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("input-description")?.focus();
      return;
    }

    handleSubmit(onSubmit)(e);
  };

  const onSubmit = async (data: ReportFormData) => {
    if (!imageFile) return; // Keamanan ganda

    setIsSubmitting(true);

    try {
      //kompresigambar / experimental
      // const options = {
      //   maxSizeMB: 0.5, // Maksimal ukuran file 500KB
      //   maxWidthOrHeight: 1280, // Resolusi maksimal
      //   useWebWorker: true
      // };

    
      //const compressedFile = await imageCompression(imageFile, options);
      const uploadJson = await uploadImage(imageFile, TEMP_TOKEN);

      const finalPayload: ReportPayload = {
        title: data.title,
        description: data.description,
        category: data.category,
        location: data.location,
        imageUrl: uploadJson.data.url
      };

      await submitReport(finalPayload, TEMP_TOKEN);

      alert("Laporan berhasil dikirim!");
      reset();
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
      console.error(error);
      alert(
        "Terjadi kesalahan saat mengirim laporan. Cek koneksi atau hubungi admin."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI
  return (
    <form onSubmit={handleSequentialSubmit} className="space-y-10 my-10">
      {/* BAGIAN 1: FOTO */}
      <section id="section-foto">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F99D26] text-xs font-bold text-white">
            1
          </span>
          <h2 className="font-bold text-slate-800">Ambil Foto</h2>
        </div>

        {/* Kotak foto berubah jadi merah jika ada error */}
        <div
          className={`relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition hover:bg-slate-200 ${errors.image ? "border-red-400 bg-red-50" : "border-slate-300 bg-slate-100"}`}
        >
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            {...register("image", { required: true })}
            onChange={(e) => {
              // Trik menggabungkan react-hook-form dengan fungsi preview manual kita
              register("image").onChange(e);
              handleImageChange(e);
            }}
          />

          {imagePreview ? (
            <Image
              src={imagePreview}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div
              className={`flex flex-col items-center ${errors.image ? "text-red-400" : "text-slate-400"}`}
            >
              <FaCamera className="mb-2 text-4xl"></FaCamera>
              <p className="text-sm font-medium">Tap untuk upload Foto</p>
            </div>
          )}
        </div>

        {/* Notifikasi Error Foto */}
        {errors.image ? (
          <span className="text-xs text-red-500 mt-2 block text-center font-medium">
            *Foto kerusakan wajib diunggah terlebih dahulu
          </span>
        ) : (
          <p className="mt-2 text-center text-xs text-slate-500">
            Pastikan foto tersebut jelas dan tidak buram
          </p>
        )}
      </section>

      {/* BAGIAN 2: KATEGORI */}
      <section id="section-kategori">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F99D26] text-xs font-bold text-white">
            2
          </span>
          <h2 className="font-bold text-slate-800">Pilih Kategori</h2>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <select
            id="input-category"
            defaultValue=""
            {...register("category", { required: true })}
            disabled={isLoadingCategories}
            className={`w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-1 bg-white cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed ${errors.category ? "border-red-400 focus:border-red-500 focus:ring-red-500 text-red-500" : "border-slate-300 focus:border-[#2682F9] focus:ring-[#2682F9] text-slate-700"}`}
          >
            <option value="" disabled>
              {isLoadingCategories
                ? "Menarik data dari server..."
                : "Pilih Kategori Kerusakan Laporan"}
            </option>

            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          {errors.category && (
            <span className="text-xs text-red-500 mt-2 block">
              *Kategori wajib dipilih
            </span>
          )}
        </div>
      </section>

      {/* BAGIAN 3: DETAIL LAPORAN */}
      <section id="section-detail">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F99D26] text-xs font-bold text-white">
            3
          </span>
          <h2 className="font-bold text-slate-800">Detail Laporan</h2>
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Judul Singkat
            </label>
            <input
              id="input-title"
              type="text"
              placeholder="Contoh: AC Kelas Bocor"
              {...register("title", { required: true })}
              className={`w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-1 ${errors.title ? "border-red-400 focus:border-red-500 focus:ring-red-500 text-red-900 placeholder-red-300" : "border-slate-300 text-slate-800 focus:border-[#2682F9] focus:ring-[#2682F9]"}`}
            />
            {errors.title && (
              <span className="text-xs text-red-500 mt-2 block">
                *Judul laporan wajib diisi
              </span>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Lokasi Detail
            </label>
            <input
              id="input-location"
              type="text"
              placeholder="Contoh: Gedung PPBS A Lantai 2"
              {...register("location", { required: true })}
              className={`w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-1 ${errors.location ? "border-red-400 focus:border-red-500 focus:ring-red-500 text-red-900 placeholder-red-300" : "border-slate-300 text-slate-800 focus:border-[#2682F9] focus:ring-[#2682F9]"}`}
            />
            {errors.location && (
              <span className="text-xs text-red-500 mt-2 block">
                *Lokasi detail wajib diisi
              </span>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Deskripsi Keluhan
            </label>
            <textarea
              id="input-description"
              rows={4}
              placeholder="Ceritakan keluhan anda di sini secara detail..."
              {...register("description", { required: true })}
              className={`resize-none w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-1 ${errors.description ? "border-red-400 focus:border-red-500 focus:ring-red-500 text-red-900 placeholder-red-300" : "border-slate-300 text-slate-800 focus:border-[#2682F9] focus:ring-[#2682F9]"}`}
            />
            {errors.description && (
              <span className="text-xs text-red-500 mt-2 block">
                *Deskripsi keluhan wajib diisi
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl bg-orange-50 p-4 border border-orange-100">
          <span className="text-[#F99D26]">
            <IoMdInformationCircle />
          </span>
          <p className="text-xs text-slate-600 leading-relaxed">
            Laporan kamu akan ditinjau oleh admin kampus dan diteruskan ke pihak
            terkait dalam waktu 1x24 jam.
          </p>
        </div>
      </section>

      {/* TOMBOL SUBMIT */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-[#ffb656] py-4 text-sm font-bold text-white transition hover:bg-[#F99D26] hover:cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "MENGIRIM LAPORAN..." : "LAPOR"}
      </button>
    </form>
  );
}
