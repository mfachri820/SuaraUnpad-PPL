"use client";

import { useState } from "react";
import { updatePolicyStatus } from "@/components/features/policies/PolicyFetch";
import type { Policy } from "@/components/features/policies/types";
import Select from "@/components/ui/Select";
import { AdminPanel, AdminNotice, type AdminFeedback } from "./AdminUI";

export const POLICY_STATUS_LABELS = { DRAFT: "Draft", ACTIVE: "Aktif", CLOSED: "Selesai" };

type PolicyStatus = keyof typeof POLICY_STATUS_LABELS;

export default function PolicyStatusForm({
  policies, onUpdated, className
}: {
  policies: Policy[];
  onUpdated: () => Promise<void>;
  className?: string;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<PolicyStatus>("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<AdminFeedback | null>(null);

  // Default ke wacana pertama sampai admin memilih sendiri.
  const policyId = policies.some(policy => policy.id === selectedId) ? selectedId : (policies[0]?.id ?? "");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!policyId) {
      setMessage({ type: "error", message: "Pilih wacana terlebih dahulu." });
      setLoading(false);
      return;
    }

    try {
      await updatePolicyStatus(policyId, status);
      setMessage({ type: "success", message: "Status wacana berhasil diperbarui." });
      await onUpdated();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal memperbarui status wacana";
      setMessage({ type: "error", message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminPanel
      className={className}
      id="status-wacana"
      title="Kelola status wacana"
      accent="blue"
      description="Aktifkan draft atau tandai wacana yang sudah selesai."
    >
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <div className="admin-field">
          <label htmlFor="admin-policy" className="admin-label">Wacana</label>
          <Select
            id="admin-policy"
            value={policyId}
            onValueChange={setSelectedId}
            options={policies.map(policy => ({
              value: policy.id,
              label: policy.title + " (" + POLICY_STATUS_LABELS[policy.status] + ")",
            }))}
            placeholder={policies.length > 0 ? "Pilih wacana" : "Belum ada wacana"}
            disabled={loading || policies.length === 0}
            required
          />
        </div>
        <div className="admin-field">
          <label htmlFor="admin-policy-status" className="admin-label">Status baru</label>
          <Select
            id="admin-policy-status"
            value={status}
            onValueChange={value => setStatus(value as PolicyStatus)}
            options={Object.entries(POLICY_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            disabled={loading}
          />
        </div>
        <AdminNotice feedback={message} />
        <button type="submit" disabled={loading || policies.length === 0} className="admin-button admin-button-wacana mt-auto w-full">
          {loading ? "Menyimpan..." : "Simpan status wacana"}
        </button>
      </form>
    </AdminPanel>
  );
}
