"use client";

import { useState } from "react";
import Link from "next/link";
import { BiCommentDetail } from "react-icons/bi";
import { FiCheckCircle } from "react-icons/fi";
import { submitVotePolicy, removeVotePolicy } from "./PolicyFetch";
import { Policy } from "@/components/features/policies/types";

export default function PolicyCard({
  policy,
  isDetail = false
}: {
  policy: Policy;
  isDetail?: boolean;
}) {
  const [userVote, setUserVote] = useState<"AGREE" | "DISAGREE" | null>(
    policy.userVote || null
  );
  const [agreeCount, setAgreeCount] = useState(policy.agreeCount || 0);
  const [disagreeCount, setDisagreeCount] = useState(policy.disagreeCount || 0);

  const totalVotes = agreeCount + disagreeCount;

  // Fungsi hitung persentase yang aman dari NaN (pembagian dengan 0)
  const getPercentage = (count: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((count / totalVotes) * 100);
  };

  const agreePercentage = getPercentage(agreeCount);
  const disagreePercentage = getPercentage(disagreeCount);

  const handleVote = async (
    e: React.MouseEvent,
    choice: "AGREE" | "DISAGREE"
  ) => {
    e.preventDefault();

    if (policy.status !== "ACTIVE") return;

    if (userVote === choice) {
      // Cabut vote
      setUserVote(null);
      if (choice === "AGREE") setAgreeCount((prev) => prev - 1);
      if (choice === "DISAGREE") setDisagreeCount((prev) => prev - 1);
      try {
        await removeVotePolicy(policy.id);
      } catch (err) {
        console.error(err);
      }
    } else {
      // Pindah vote atau Vote baru
      if (userVote === "AGREE") setAgreeCount((prev) => prev - 1);
      if (userVote === "DISAGREE") setDisagreeCount((prev) => prev - 1);

      setUserVote(choice);
      if (choice === "AGREE") setAgreeCount((prev) => prev + 1);
      if (choice === "DISAGREE") setDisagreeCount((prev) => prev + 1);
      try {
        await submitVotePolicy(policy.id, choice);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const CardWrapper = isDetail ? "div" : Link;
  const isVotingDisabled = policy.status !== "ACTIVE";

  return (
    <CardWrapper
      href={isDetail ? "#" : `/policies/${policy.id}`}
      className={`block bg-white rounded-3xl border ${
        isDetail
          ? "border-transparent"
          : "border-slate-100 hover:border-slate-200 hover:shadow-sm"
      } p-5 transition`}
    >
      <div className="flex flex-col">
        {/* Header: Status & Author */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`px-3 py-1 rounded-md text-xs font-bold tracking-wide ${
              policy.status === "ACTIVE"
                ? "bg-blue-500 text-white"
                : policy.status === "CLOSED"
                  ? "bg-red-500 text-white"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {policy.status === "ACTIVE"
              ? "Aktif"
              : policy.status === "CLOSED"
                ? "Selesai"
                : "Draft"}
          </span>
          <span className="text-xs text-slate-500">
            Oleh {policy.author?.lecturerProfile?.fullName || "Dosen"}
          </span>
        </div>

        {/* Konten Judul & Deskripsi */}
        <h3 className="text-xl font-black text-slate-900 leading-tight mb-2">
          {policy.title}
        </h3>

        <p
          className={`text-sm text-slate-700 leading-relaxed mb-5 ${
            !isDetail && "line-clamp-2"
          }`}
        >
          {policy.content}
        </p>

        {/* --- AREA POLING TWITTER STYLE --- */}
        <div className="flex flex-col gap-3 mb-2">
          {/* Tombol Agree */}
          <button
            onClick={(e) => handleVote(e, "AGREE")}
            disabled={isVotingDisabled}
            className={`relative w-full h-10 overflow-hidden rounded-xl border text-left transition ${
              userVote === "AGREE"
                ? "border-blue-500 font-bold" // Terpilih
                : "border-slate-200 font-medium hover:bg-slate-50" // Tidak terpilih
            } ${isVotingDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
          >
            {/* Background Bar */}
            <div
              className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${
                userVote === "AGREE" ? "bg-blue-100" : "bg-slate-100"
              }`}
              style={{ width: `${agreePercentage}%` }}
            ></div>

            {/* Konten Text di atas Bar */}
            <div className="absolute inset-0 flex justify-between items-center px-4 z-10 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={
                    userVote === "AGREE" ? "text-blue-700" : "text-slate-700"
                  }
                >
                  Setuju
                </span>
                {userVote === "AGREE" && (
                  <FiCheckCircle className="text-blue-600 text-base" />
                )}
              </div>
              <span
                className={
                  userVote === "AGREE" ? "text-blue-700" : "text-slate-700"
                }
              >
                {agreePercentage}%
              </span>
            </div>
          </button>

          {/* Tombol Disagree */}
          <button
            onClick={(e) => handleVote(e, "DISAGREE")}
            disabled={isVotingDisabled}
            className={`relative w-full h-10 overflow-hidden rounded-xl border text-left transition ${
              userVote === "DISAGREE"
                ? "border-red-500 font-bold"
                : "border-slate-200 font-medium hover:bg-slate-50"
            } ${isVotingDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
          >
            {/* Background Bar */}
            <div
              className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${
                userVote === "DISAGREE" ? "bg-red-100" : "bg-slate-100"
              }`}
              style={{ width: `${disagreePercentage}%` }}
            ></div>

            {/* Konten Text di atas Bar */}
            <div className="absolute inset-0 flex justify-between items-center px-4 z-10 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={
                    userVote === "DISAGREE" ? "text-red-700" : "text-slate-700"
                  }
                >
                  Tidak Setuju
                </span>
                {userVote === "DISAGREE" && (
                  <FiCheckCircle className="text-red-600 text-base" />
                )}
              </div>
              <span
                className={
                  userVote === "DISAGREE" ? "text-red-700" : "text-slate-700"
                }
              >
                {disagreePercentage}%
              </span>
            </div>
          </button>

          {/* Total Suara */}
          <div className="text-xs text-slate-500 text-right mt-1 font-medium">
            Total partisipasi: {totalVotes} suara
          </div>
        </div>
        {/* --- AKHIR AREA POLING --- */}

        {/* Footer: Kumpulan Tombol (Hanya Comment) */}
        {!isDetail && (
          <div className="flex items-center mt-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition">
              <BiCommentDetail className="text-xl text-slate-400" />
              <span className="text-sm font-medium">Diskusi</span>
            </div>
          </div>
        )}
      </div>
    </CardWrapper>
  );
}
