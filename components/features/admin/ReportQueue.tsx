"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { FiArrowRight, FiClock, FiMapPin, FiThumbsUp } from "react-icons/fi";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { AdminReportItem, REPORT_CATEGORY_LABELS, REPORT_STATUS_LABELS, ReportStatus } from "@/lib/api/types";
import { formatAge, formatDuration } from "@/lib/duration";
import Select from "@/components/ui/Select";

import { AdminDialog, AdminNotice, AdminPanel } from "./AdminUI";

const STATUSES: ReportStatus[] = ["SUBMITTED", "VERIFIED", "IN_PROGRESS", "RESOLVED"];

const NEXT_ACTION: Partial<Record<ReportStatus, { status: ReportStatus; label: string }>> = {
  SUBMITTED: { status: "VERIFIED", label: "Verifikasi" },
  VERIFIED: { status: "IN_PROGRESS", label: "Mulai proses" },
  IN_PROGRESS: { status: "RESOLVED", label: "Tandai selesai" }
};

// Waktu laporan masuk ke tahap sekarang; dipakai untuk "Menunggu ...".
function stageEnteredAt(report: AdminReportItem) {
  if (report.status === "IN_PROGRESS") return report.inProgressAt ?? report.createdAt;
  if (report.status === "VERIFIED") return report.verifiedAt ?? report.createdAt;
  return report.createdAt;
}

export default function ReportQueue({
  counts,
  onActionDone
}: {
  counts?: Record<ReportStatus, number>;
  onActionDone?: () => void;
}) {
  const [status, setStatus] = useState<ReportStatus>("SUBMITTED");
  const [items, setItems] = useState<AdminReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [changeTarget, setChangeTarget] = useState<AdminReportItem | null>(null);
  const [changeStatus, setChangeStatus] = useState<ReportStatus>("SUBMITTED");
  const [changeError, setChangeError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadQueue = useCallback(async (queueStatus: ReportStatus) => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AdminReportItem[]>(`/api/admin/reports?status=${queueStatus}`);
      if (currentRequest === requestId.current) setItems(data);
    } catch (error) {
      if (currentRequest === requestId.current) setError(getApiErrorMessage(error, "Gagal memuat antrean laporan."));
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue(status);
    return () => { requestId.current += 1; };
  }, [status, loadQueue]);

  const updateStatus = async (report: AdminReportItem, newStatus: ReportStatus) => {
    setPendingId(report.id);
    try {
      await apiFetch(`/api/reports/${report.id}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      toast.success(`"${report.title}" dipindah ke ${REPORT_STATUS_LABELS[newStatus]}.`);
      setItems(current => current.filter(item => item.id !== report.id));
      setChangeTarget(null);
      onActionDone?.();
      return true;
    } catch (error) {
      const message = getApiErrorMessage(error, "Gagal memperbarui status laporan.");
      if (changeTarget) setChangeError(message);
      else toast.error(message);
      return false;
    } finally {
      setPendingId(null);
    }
  };

  const openChangeDialog = (report: AdminReportItem) => {
    setChangeError(null);
    setChangeStatus(report.status);
    setChangeTarget(report);
  };

  const busy = pendingId !== null;

  return (
    <AdminPanel
      id="laporan-fasilitas"
      title="Antrean laporan fasilitas"
      accent="orange"
      description="Laporan yang paling lama menunggu tampil paling atas."
    >
      <div className="mb-5 flex gap-4 overflow-x-auto border-b border-slate-100" aria-label="Status laporan">
        {STATUSES.map(value => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            aria-pressed={status === value}
            disabled={busy}
            className={"flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-1 pb-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wacana disabled:cursor-not-allowed disabled:opacity-50 " + (
              status === value ? "border-laporan text-laporan" : "border-transparent text-slate-800 hover:text-slate-950"
            )}
          >
            {REPORT_STATUS_LABELS[value]}
            {counts && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-700">{counts[value]}</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p role="status" className="admin-empty">Memuat laporan fasilitas...</p>
      ) : error ? (
        <div className="space-y-3">
          <AdminNotice feedback={{ type: "error", message: error }} />
          <button type="button" onClick={() => loadQueue(status)} className="admin-button admin-button-secondary">Coba lagi</button>
        </div>
      ) : items.length === 0 ? (
        <p className="admin-empty">Tidak ada laporan berstatus {REPORT_STATUS_LABELS[status].toLowerCase()}.</p>
      ) : (
        <ul className="space-y-3" aria-label="Daftar laporan fasilitas">
          {items.map(report => {
            const next = NEXT_ACTION[report.status];
            return (
              <li key={report.id} className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={report.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-laporan">{REPORT_CATEGORY_LABELS[report.category] ?? report.category}</span>
                      <span className={"inline-flex items-center gap-1 text-xs font-medium " + (report.status === "RESOLVED" ? "text-pengumuman-foreground" : "text-slate-800")}>
                        <FiClock aria-hidden="true" />
                        {report.status === "RESOLVED"
                          ? report.resolvedAt ? `Selesai dalam ${formatDuration(new Date(report.resolvedAt).getTime() - new Date(report.createdAt).getTime())}` : "Selesai"
                          : `Menunggu ${formatAge(stageEnteredAt(report))}`}
                      </span>
                    </div>
                    <h3 className="break-words text-sm font-semibold text-slate-900">{report.title}</h3>
                    <p className="line-clamp-2 break-words text-sm leading-relaxed text-slate-800">{report.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
                  <span className="inline-flex min-w-0 items-center gap-1 break-words"><FiMapPin aria-hidden="true" className="shrink-0" /> {report.location}</span>
                  <span className="inline-flex items-center gap-1"><FiThumbsUp aria-hidden="true" /> {report.upvoteCount}</span>
                  <span className="break-words">Oleh {report.author.displayName}</span>
                  {report.status !== "SUBMITTED" && <span>Dibuat {formatAge(report.createdAt)} lalu</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {next && (
                    <button type="button" disabled={busy} onClick={() => updateStatus(report, next.status)} className="admin-button admin-button-laporan">
                      {pendingId === report.id ? "Menyimpan..." : <>{next.label} <FiArrowRight aria-hidden="true" /></>}
                    </button>
                  )}
                  <button type="button" disabled={busy} onClick={() => openChangeDialog(report)} className="admin-button admin-button-secondary">
                    Ubah status…
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AdminDialog
        open={changeTarget !== null}
        title="Ubah status laporan"
        description={changeTarget ? `Pindahkan "${changeTarget.title}" ke status lain. Memundurkan status akan menghapus catatan waktu tahap setelahnya.` : ""}
        onClose={() => setChangeTarget(null)}
        busy={busy}
      >
        <div className="admin-field">
          <label htmlFor="admin-report-change-status" className="admin-label">Status baru</label>
          <Select
            id="admin-report-change-status"
            value={changeStatus}
            onValueChange={value => setChangeStatus(value as ReportStatus)}
            options={STATUSES.map(value => ({ value, label: REPORT_STATUS_LABELS[value] }))}
            disabled={busy}
          />
        </div>
        <div className="mt-4"><AdminNotice feedback={changeError ? { type: "error", message: changeError } : null} /></div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setChangeTarget(null)} disabled={busy} className="admin-button admin-button-secondary">Batal</button>
          <button
            type="button"
            onClick={() => changeTarget && updateStatus(changeTarget, changeStatus)}
            disabled={busy || !changeTarget || changeStatus === changeTarget.status}
            className="admin-button admin-button-laporan"
          >
            {busy ? "Menyimpan..." : "Simpan status"}
          </button>
        </div>
      </AdminDialog>
    </AdminPanel>
  );
}
