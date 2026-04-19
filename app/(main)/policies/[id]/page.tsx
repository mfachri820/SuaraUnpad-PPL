"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchPolicyDetail } from "@/components/features/policies/PolicyFetch";
import PolicyCard from "@/components/features/policies/PolicyCard";
import CommentSection from "@/components/features/policies/CommentSection"; // Import komponen baru
import { FiArrowLeft } from "react-icons/fi";
import Link from "next/link";
import { Policy } from "@/components/features/policies/types";

export default function PolicyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        const data = await fetchPolicyDetail(id);
        setPolicy(data);
      } catch (error) {
        console.error(error);
        alert("Kebijakan tidak ditemukan atau masih DRAFT");
        router.push("/home");
      } finally {
        setIsLoading(false);
      }
    };
    loadPolicy();
  }, [id, router]);

  if (isLoading)
    return (
      <div className="p-10 text-center animate-pulse font-bold text-slate-400">
        Memuat Data...
      </div>
    );
  if (!policy) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#2682F9] mb-6 transition"
        >
          <FiArrowLeft /> Kembali
        </Link>

        {/* Card Kebijakan (Tanpa Share) */}
        <PolicyCard policy={policy} isDetail={true} />

        {/* Bagian Komentar Reddit (Otomatis Handle Fetch, Balas, Edit, Hapus) */}
        <CommentSection policyId={policy.id} />
      </div>
    </div>
  );
}
