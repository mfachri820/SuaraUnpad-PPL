"use client";
import { useEffect, useState } from "react";
import {
  fetchCampaignById,
  DonationCampaign
} from "@/components/features/donations/DonationFetch";
import DonateModal from "@/components/features/donations/DonateModal";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link"
import { FiLoader, FiArrowLeft } from "react-icons/fi";

export default function CampaignDetailPage() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<DonationCampaign | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (id) fetchCampaignById(id as string).then(setCampaign);
  }, [id]);

  if (!campaign)
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <FiLoader className="animate-spin text-[#F99D26]" size={40} />
      </div>
    );

  return (
    // Dihilangkan pb-24 karena sudah tidak ada tombol melayang di bawah
    <div className="max-w-2xl mx-auto min-h-screen p-4 md:p-8">
      <div className="sticky top-0  backdrop-blur-md z-10 px-4 py-5 border-b border-slate-50 flex items-center gap-0">
          <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#2682F9] mb-0 transition"
        >
          <FiArrowLeft /> Kembali
        </Link>
        </div>
      {/* Card Wrapper */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="relative w-full h-64">
          <Image
            src={campaign.bannerUrl}
            alt="Preview"
            fill
            className="w-full object-cover rounded-t-3xl"
            unoptimized
          />
        </div>

        <div className="p-6 md:p-8">
          <h1 className="text-2xl font-black text-slate-800 mb-4">
            {campaign.title}
          </h1>

          {/* Progress Bar Section */}
          <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
            <div className="flex justify-between font-bold text-sm mb-2">
              <span className="text-[#E8A34D]">
                Rp {campaign.collectedAmount.toLocaleString()}
              </span>
              <span className="text-slate-400">
                Target: Rp {campaign.targetAmount.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E8A34D] transition-all"
                style={{
                  width: `${Math.min((campaign.collectedAmount / campaign.targetAmount) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>

          {/* Deskripsi */}
          <article className="prose prose-slate text-slate-600 text-sm leading-relaxed mb-10">
            {campaign.description}
          </article>

          {/* 🌟 REVISI: Tombol Donasi di dalam Card sesuai kodinganmu */}
          <div className="flex justify-center pt-6 border-t border-slate-100">
            <button
              onClick={() => setShowModal(true)}
              className="w-full max-w-md bg-[#ffb656] hover:bg-[#F99D26] hover:cursor-pointer text-white font-black py-4 rounded-2xl active:scale-95 transition"
            >
              DONASI SEKARANG
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <DonateModal
          campaignId={campaign.id}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
