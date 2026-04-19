"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Cookies from "js-cookie";
import { FiMapPin, FiClock, FiX } from "react-icons/fi";
import { ImArrowUp } from "react-icons/im";
import { Policy } from "@/components/features/policies/types";

// Import tipe data dan fungsi API Laporan dari HomeFetch
import {
  Report,
  Author,
  getUserIdFromToken,
  fetchHomeReports,
  toggleUpvoteApi
} from "./HomeFetch";

// Import fungsi API dan Card Kebijakan
import PolicyCard from "@/components/features/policies/PolicyCard";
import { fetchPolicies } from "@/components/features/policies/PolicyFetch";

export default function HomeFeed() {
  const [reports, setReports] = useState<Report[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]); // State untuk Kebijakan
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("newest");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = Cookies.get("token");
        const currentUserId = getUserIdFromToken(token);

        // Fetching Paralel: Ambil Laporan & Kebijakan secara bersamaan biar ngebut!
        const [reportsData, policiesData] = await Promise.all([
          fetchHomeReports(token, currentUserId),
          fetchPolicies() // Ambil data kebijakan
        ]);

        setReports(reportsData);
        setPolicies(policiesData.slice(0, 5)); // Ambil maksimal 5 kebijakan teratas
      } catch (error) {
        console.error("Error fetching data:", error);
        setReports([]);
        setPolicies([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const getFilteredReports = () => {
    if (!Array.isArray(reports)) return [];
    let result = [...reports];

    switch (activeFilter) {
      case "highest_upvotes":
        result.sort((a, b) => b.upvoteCount - a.upvoteCount);
        break;
      case "lowest_upvotes":
        result.sort((a, b) => a.upvoteCount - b.upvoteCount);
        break;
      case "SUBMITTED":
      case "IN_PROGRESS":
      case "RESOLVED":
        result = result.filter((r) => r.status === activeFilter);
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "newest":
      default:
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
    return result.slice(0, 5);
  };

  const handleUpvote = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();

    // 1. Update state array utama
    setReports((currentReports) =>
      currentReports.map((report) => {
        if (report.id === reportId) {
          const isUpvoted = report.hasUpvoted;
          return {
            ...report,
            hasUpvoted: !isUpvoted,
            upvoteCount: isUpvoted
              ? report.upvoteCount - 1
              : report.upvoteCount + 1
          };
        }
        return report;
      })
    );

    // 2. Update state modal popup jika sedang terbuka
    setSelectedReport((currentSelected) => {
      if (currentSelected && currentSelected.id === reportId) {
        const isUpvoted = currentSelected.hasUpvoted;
        return {
          ...currentSelected,
          hasUpvoted: !isUpvoted,
          upvoteCount: isUpvoted
            ? currentSelected.upvoteCount - 1
            : currentSelected.upvoteCount + 1
        };
      }
      return currentSelected;
    });

    // 3. Tembak API
    try {
      const token = Cookies.get("token");
      await toggleUpvoteApi(reportId, token);
    } catch (error) {
      console.error("Gagal upvote:", error);
    }
  };

  const getAuthorName = (author: Author) => {
    if (!author) return "Anonim";
    return (
      author.studentProfile?.fullName ||
      author.lecturerProfile?.fullName ||
      author.adminProfile?.fullName ||
      author.email.split("@")[0]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return (
          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-[10px] font-bold tracking-wide">
            MENUNGGU
          </span>
        );
      case "VERIFIED":
        return (
          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-[10px] font-bold tracking-wide">
            DIVERIFIKASI
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[10px] font-bold tracking-wide">
            DIPROSES
          </span>
        );
      case "RESOLVED":
        return (
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold tracking-wide">
            SELESAI
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(dateString));
  };

  const displayedReports = getFilteredReports();

  return (
    <div className="w-full">
      {/* 🌟 SECTION 1: WACANA KEBIJAKAN 🌟 */}
      <div className="mb-10">
        <h2 className="text-xl font-black text-slate-800 mb-4">
          Wacana Kebijakan Terkini
        </h2>
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center text-slate-500 text-sm py-10">
              Memuat kebijakan...
            </p>
          ) : policies.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-10">
              Belum ada wacana kebijakan saat ini.
            </p>
          ) : (
            policies.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} />
            ))
          )}
        </div>
        {!isLoading && policies.length > 5 && (
          <Link
            href="/policies"
            className="mt-6 block w-full text-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl transition text-sm"
          >
            Lihat Semua Kebijakan
          </Link>
        )}
      </div>

      <hr className="border-slate-200 mb-8" />

      {/* 🌟 SECTION 2: LAPORAN TERKINI 🌟 */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-black text-slate-800">Laporan Terkini</h2>

        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="bg-white border border-r-10 border-transparent text-slate-700 text-xs font-semibold rounded-lg focus:ring-[#2682F9] focus:border-[#2682F9] block w-full sm:w-auto px-3 py-2 cursor-pointer shadow-sm outline-none"
        >
          <option value="newest">Terbaru</option>
          <option value="highest_upvotes">Top Upvotes</option>
          <option value="lowest_upvotes">Low Upvotes</option>
          <option value="SUBMITTED">Menunggu</option>
          <option value="IN_PROGRESS">Diproses</option>
          <option value="RESOLVED">Selesai</option>
        </select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-center text-slate-500 text-sm py-10">
            Memuat laporan dari database...
          </p>
        ) : displayedReports.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-10">
            Belum ada laporan di kategori ini.
          </p>
        ) : (
          displayedReports.map((report) => (
            <div
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col gap-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {report.author?.avatarUrl ? (
                    <div className="relative h-10 w-10 rounded-full overflow-hidden border border-slate-200">
                      <Image
                        src={report.author.avatarUrl}
                        alt="Avatar"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold uppercase overflow-hidden">
                      {getAuthorName(report.author).charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 leading-none mb-1">
                      {getAuthorName(report.author)}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {formatDate(report.createdAt)}
                    </p>
                  </div>
                </div>
                {getStatusBadge(report.status)}
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight mb-1">
                  {report.title}
                </h3>
                <div className="flex items-center gap-1 text-xs text-[#F99D26] mb-2 font-medium">
                  <FiMapPin /> {report.location}
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {report.description}
                </p>
              </div>

              {report.imageUrl &&
                report.imageUrl !== "https://res.cloudinary.com/..." && (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden mt-1 border border-slate-100">
                    <Image
                      src={report.imageUrl}
                      alt={report.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}

              <div className="mt-2 pt-3 border-t border-slate-50">
                <button
                  onClick={(e) => handleUpvote(e, report.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition ${
                    report.hasUpvoted
                      ? "bg-orange-100 text-[#F99D26] hover:cursor-pointer"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:cursor-pointer"
                  }`}
                >
                  <ImArrowUp
                    className={report.hasUpvoted ? "text-[#F99D26]" : ""}
                  />
                  {report.upvoteCount}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {!isLoading && reports.length > 5 && (
        <Link
          href="/reports"
          className="mt-6 block w-full text-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl transition text-sm"
        >
          Lihat Semua Laporan
        </Link>
      )}

      {/* MODAL POPUP DETAIL LAPORAN */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-100 overflow-y-auto bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setSelectedReport(null)}
        >
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
            <div
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedReport(null)}
                className="absolute top-4 right-4 z-10 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition"
              >
                <FiX className="text-xl" />
              </button>

              {selectedReport.imageUrl &&
              selectedReport.imageUrl !== "https://res.cloudinary.com/..." ? (
                <div className="relative w-full h-64 bg-slate-100 shrink-0">
                  <Image
                    src={selectedReport.imageUrl}
                    alt={selectedReport.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="h-10 shrink-0"></div>
              )}

              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  {getStatusBadge(selectedReport.status)}
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <FiClock /> {formatDate(selectedReport.createdAt)}
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">
                  {selectedReport.title}
                </h2>

                <div className="flex items-center gap-2 text-sm text-[#F99D26] font-bold mb-6">
                  <FiMapPin className="text-lg" /> {selectedReport.location}
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedReport.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  {selectedReport.author?.avatarUrl ? (
                    <div className="relative h-12 w-12 rounded-full overflow-hidden border border-slate-200">
                      <Image
                        src={selectedReport.author.avatarUrl}
                        alt="Avatar"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-[#2682F9] flex items-center justify-center text-white font-black text-lg">
                      {getAuthorName(selectedReport.author).charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">
                      Dilaporkan oleh
                    </p>
                    <h4 className="text-sm font-bold text-slate-800">
                      {getAuthorName(selectedReport.author)}
                    </h4>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={(e) => handleUpvote(e, selectedReport.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition ${
                    selectedReport.hasUpvoted
                      ? "bg-[#F99D26] text-white shadow-md hover:cursor-pointer"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:cursor-pointer"
                  }`}
                >
                  <ImArrowUp className="text-lg" />
                  {selectedReport.hasUpvoted ? "Upvoted" : "Upvote"} (
                  {selectedReport.upvoteCount})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
