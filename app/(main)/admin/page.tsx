"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { fetchPolicies, updatePolicyStatus, createPolicy } from '@/components/features/policies/PolicyFetch';
import { Policy } from '@/components/features/policies/types';
import { apiFetch, getApiErrorMessage } from '@/lib/api/client';
import { AdminStats } from '@/lib/api/types';
import ModerationQueue from '@/components/features/admin/ModerationQueue';
import AnnouncementForm from '@/components/features/admin/AnnouncementForm';
import Select from '@/components/ui/Select';
import { AdminPanel, AdminNotice, type AdminFeedback } from '@/components/features/admin/AdminUI';

const REPORT_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Diajukan',
  VERIFIED: 'Terverifikasi',
  IN_PROGRESS: 'Diproses',
  RESOLVED: 'Selesai',
};
const POLICY_STATUS_LABELS = { DRAFT: 'Draft', ACTIVE: 'Aktif', CLOSED: 'Selesai' };

interface ReportOption {
  id: string;
  title: string;
  status: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<ReportOption[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyId, setPolicyId] = useState('');
  const [policyStatus, setPolicyStatus] = useState<'DRAFT' | 'ACTIVE' | 'CLOSED'>('ACTIVE');
  const [policyUpdateLoading, setPolicyUpdateLoading] = useState(false);
  const [policyUpdateMessage, setPolicyUpdateMessage] = useState<AdminFeedback | null>(null);
  const [policyTitle, setPolicyTitle] = useState('');
  const [policyContent, setPolicyContent] = useState('');
  const [policyCreateLoading, setPolicyCreateLoading] = useState(false);
  const [policyCreateMessage, setPolicyCreateMessage] = useState<AdminFeedback | null>(null);

  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignTargetAmount, setCampaignTargetAmount] = useState('');
  const [campaignBannerFile, setCampaignBannerFile] = useState<File | null>(null);
  const [campaignBannerPreview, setCampaignBannerPreview] = useState<string | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState<AdminFeedback | null>(null);

  const campaignFileRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return () => {
      if (campaignBannerPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(campaignBannerPreview);
      }
    };
  }, [campaignBannerPreview]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userToken = Cookies.get('token');

    if (!userToken) {
      router.push('/login');
      return;
    }

    try {
      const payloadBase64 = userToken.split('.')[1];
      const decodedJson = atob(payloadBase64);
      const payload = JSON.parse(decodedJson);
      if (payload.role !== 'ADMIN') {
        router.push('/home');
        return;
      }
      setIsAdmin(true);
    } catch (error) {
      console.error('Gagal decode token di halaman admin', error);
      router.push('/login');
      return;
    }

    const loadStats = async () => {
      try {
        const reportsRes = await fetch('/api/reports?limit=100', {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const reportsJson = await reportsRes.json();

        const [policiesData, statsData] = await Promise.all([
          fetchPolicies(),
          apiFetch<AdminStats>('/api/admin/stats'),
        ]);

        if (!reportsRes.ok) {
          throw new Error(reportsJson.message || 'Gagal memuat total laporan');
        }

        setStats(statsData);
        setReports(
          Array.isArray(reportsJson.data?.data)
            ? reportsJson.data.data.map((report: { id: string; title: string; status: string }) => ({
                id: report.id,
                title: report.title,
                status: report.status,
              }))
            : []
        );
        setPolicies(policiesData);
        if (policiesData.length > 0) {
          setPolicyId(policiesData[0].id);
        }
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Gagal memuat statistik admin'));
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin !== false) {
      loadStats();
    }
  }, [router, isAdmin]);

  const refreshAdminStats = useCallback(async () => {
    try {
      const statsData = await apiFetch<AdminStats>('/api/admin/stats');
      setStats(statsData);
    } catch (err: unknown) {
      console.error('Gagal memuat ulang statistik admin', err);
    }
  }, []);

  const [reportId, setReportId] = useState('');
  const [newStatus, setNewStatus] = useState('VERIFIED');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<AdminFeedback | null>(null);

  const handleUpdateStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUpdateLoading(true);
    setUpdateMessage(null);

    const token = Cookies.get('token');
    if (!token) {
      setUpdateMessage({ type: 'error', message: 'Sesi berakhir. Silakan masuk kembali.' });
      setUpdateLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Gagal memperbarui status laporan');
      }

      setUpdateMessage({ type: 'success', message: result.message || 'Status laporan berhasil diperbarui.' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memperbarui status laporan';
      setUpdateMessage({ type: 'error', message: errorMessage });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCreatePolicy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPolicyCreateLoading(true);
    setPolicyCreateMessage(null);

    const token = Cookies.get('token');
    if (!token) {
      setPolicyCreateMessage({ type: 'error', message: 'Sesi berakhir. Silakan masuk kembali.' });
      setPolicyCreateLoading(false);
      return;
    }

    if (!policyTitle || !policyContent) {
      setPolicyCreateMessage({ type: 'error', message: 'Judul dan isi wacana wajib diisi.' });
      setPolicyCreateLoading(false);
      return;
    }

    try {
      await createPolicy(policyTitle, policyContent);
      setPolicyCreateMessage({ type: 'success', message: 'Wacana berhasil disimpan sebagai draft. Aktifkan melalui Kelola status wacana.' });
      setPolicyTitle('');
      setPolicyContent('');
      const refreshedPolicies = await fetchPolicies();
      setPolicies(refreshedPolicies);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal membuat wacana';
      setPolicyCreateMessage({ type: 'error', message: errorMessage });
    } finally {
      setPolicyCreateLoading(false);
    }
  };

  const handleUpdatePolicyStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPolicyUpdateLoading(true);
    setPolicyUpdateMessage(null);

    if (!policyId) {
      setPolicyUpdateMessage({ type: 'error', message: 'Pilih wacana terlebih dahulu.' });
      setPolicyUpdateLoading(false);
      return;
    }

    try {
      await updatePolicyStatus(policyId, policyStatus);
      setPolicyUpdateMessage({ type: 'success', message: 'Status wacana berhasil diperbarui.' });
      const refreshedPolicies = await fetchPolicies();
      setPolicies(refreshedPolicies);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memperbarui status wacana';
      setPolicyUpdateMessage({ type: 'error', message: errorMessage });
    } finally {
      setPolicyUpdateLoading(false);
    }
  };

  const handleCreateCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCampaignLoading(true);
    setCampaignMessage(null);

    const token = Cookies.get('token');
    if (!token) {
      setCampaignMessage({ type: 'error', message: 'Sesi berakhir. Silakan masuk kembali.' });
      setCampaignLoading(false);
      return;
    }

    if (!campaignTitle || !campaignDescription || !campaignTargetAmount || !campaignBannerFile) {
      setCampaignMessage({ type: 'error', message: 'Lengkapi judul, deskripsi, target donasi, dan banner kampanye.' });
      setCampaignLoading(false);
      return;
    }

    const targetAmountValue = Number(campaignTargetAmount);
    if (Number.isNaN(targetAmountValue) || targetAmountValue <= 0) {
      setCampaignMessage({ type: 'error', message: 'Target donasi harus lebih besar dari Rp 0.' });
      setCampaignLoading(false);
      return;
    }

    try {
      let bannerUrl = '';
      const uploadData = new FormData();
      uploadData.append('file', campaignBannerFile);
      uploadData.append('folder', 'campaigns');

      const uploadRes = await fetch('/api/uploads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadData,
      });
      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadResult.message || 'Gagal mengunggah banner kampanye');
      }
      bannerUrl = uploadResult.data?.url;

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: campaignTitle,
          description: campaignDescription,
          targetAmount: targetAmountValue,
          bannerUrl,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Gagal membuat kampanye donasi');
      }

      setCampaignMessage({ type: 'success', message: 'Kampanye donasi berhasil dibuat.' });
      setCampaignTitle('');
      setCampaignDescription('');
      setCampaignTargetAmount('');
      setCampaignBannerFile(null);
      setCampaignBannerPreview(null);
      if (campaignFileRef.current) campaignFileRef.current.value = '';
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat kampanye';
      setCampaignMessage({ type: 'error', message: errorMessage });
    } finally {
      setCampaignLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Halaman admin</h1>
          <p className="text-sm leading-relaxed text-slate-800">
            Kelola moderasi, pengumuman, laporan fasilitas, wacana, dan kampanye donasi.
          </p>
        </header>

        <section aria-label="Ringkasan aktivitas">
          {loading ? (
            <p role="status" className="admin-empty">Memuat ringkasan aktivitas...</p>
          ) : error ? (
            <AdminNotice feedback={{ type: 'error', message: error }} />
          ) : stats ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: 'Postingan', value: stats.totalPosts, color: 'text-aspirasi-foreground' },
                { label: 'Pengumuman', value: stats.totalAnnouncements, color: 'text-pengumuman-foreground' },
                { label: 'Wacana', value: stats.totalPolicies, color: 'text-wacana-foreground' },
                { label: 'Laporan fasilitas', value: stats.totalReports, color: 'text-laporan-foreground' },
                { label: 'Menunggu moderasi', value: stats.pendingFlags.total, color: 'text-red-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                  <dt className="text-sm font-medium leading-5 text-slate-800">{label}</dt>
                  <dd className={'mt-2 text-3xl font-bold tabular-nums ' + color}>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        <ModerationQueue onActionDone={refreshAdminStats} />

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <AnnouncementForm onCreated={refreshAdminStats} />

          <div className="min-w-0 space-y-6">
            <AdminPanel
              id="laporan-fasilitas"
              title="Perbarui status laporan"
              accent="orange"
              description="Tentukan tindak lanjut laporan fasilitas dari mahasiswa."
            >
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div className="admin-field">
                  <label htmlFor="admin-report" className="admin-label">Laporan</label>
                  <Select
                    id="admin-report"
                    value={reportId}
                    onValueChange={setReportId}
                    options={reports.map(report => ({
                      value: report.id,
                      label: report.title + ' (' + (REPORT_STATUS_LABELS[report.status] || report.status) + ')',
                    }))}
                    placeholder={reports.length > 0 ? 'Pilih laporan' : 'Belum ada laporan'}
                    disabled={updateLoading || reports.length === 0}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="admin-report-status" className="admin-label">Status baru</label>
                  <Select
                    id="admin-report-status"
                    value={newStatus}
                    onValueChange={setNewStatus}
                    options={Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                    disabled={updateLoading}
                  />
                </div>
                <AdminNotice feedback={updateMessage} />
                <button type="submit" disabled={updateLoading || reports.length === 0} className="admin-button admin-button-laporan w-full">
                  {updateLoading ? 'Menyimpan...' : 'Simpan status laporan'}
                </button>
              </form>
            </AdminPanel>

            <AdminPanel
              id="status-wacana"
              title="Kelola status wacana"
              accent="blue"
              description="Aktifkan draft atau tandai wacana yang sudah selesai."
            >
              <form onSubmit={handleUpdatePolicyStatus} className="space-y-4">
                <div className="admin-field">
                  <label htmlFor="admin-policy" className="admin-label">Wacana</label>
                  <Select
                    id="admin-policy"
                    value={policyId}
                    onValueChange={setPolicyId}
                    options={policies.map(policy => ({
                      value: policy.id,
                      label: policy.title + ' (' + POLICY_STATUS_LABELS[policy.status] + ')',
                    }))}
                    placeholder={policies.length > 0 ? 'Pilih wacana' : 'Belum ada wacana'}
                    disabled={policyUpdateLoading || policies.length === 0}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="admin-policy-status" className="admin-label">Status baru</label>
                  <Select
                    id="admin-policy-status"
                    value={policyStatus}
                    onValueChange={value => setPolicyStatus(value as 'DRAFT' | 'ACTIVE' | 'CLOSED')}
                    options={Object.entries(POLICY_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                    disabled={policyUpdateLoading}
                  />
                </div>
                <AdminNotice feedback={policyUpdateMessage} />
                <button type="submit" disabled={policyUpdateLoading || policies.length === 0} className="admin-button admin-button-wacana w-full">
                  {policyUpdateLoading ? 'Menyimpan...' : 'Simpan status wacana'}
                </button>
              </form>
            </AdminPanel>
          </div>

          <AdminPanel
            id="wacana-baru"
            title="Buat wacana"
            accent="blue"
            description="Wacana disimpan sebagai draft sebelum ditampilkan kepada pengguna."
          >
            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div className="admin-field">
                <label htmlFor="policy-title" className="admin-label">Judul wacana</label>
                <input
                  id="policy-title"
                  value={policyTitle}
                  onChange={event => setPolicyTitle(event.target.value)}
                  type="text"
                  placeholder="Contoh: Perpanjangan jam buka perpustakaan"
                  className="admin-input"
                  disabled={policyCreateLoading}
                  required
                />
              </div>
              <div className="admin-field">
                <label htmlFor="policy-content" className="admin-label">Isi wacana</label>
                <textarea
                  id="policy-content"
                  value={policyContent}
                  onChange={event => setPolicyContent(event.target.value)}
                  rows={5}
                  placeholder="Jelaskan usulan yang ingin didiskusikan."
                  className="admin-input"
                  disabled={policyCreateLoading}
                  required
                />
              </div>
              <AdminNotice feedback={policyCreateMessage} />
              <button type="submit" disabled={policyCreateLoading} className="admin-button admin-button-wacana w-full">
                {policyCreateLoading ? 'Menyimpan...' : 'Simpan draft wacana'}
              </button>
            </form>
          </AdminPanel>

          <AdminPanel
            id="kampanye-donasi"
            title="Buat kampanye donasi"
            accent="orange"
            description="Lengkapi informasi dan target dana untuk kampanye baru."
          >
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="admin-field">
                <label htmlFor="campaign-title" className="admin-label">Judul kampanye</label>
                <input
                  id="campaign-title"
                  value={campaignTitle}
                  onChange={event => setCampaignTitle(event.target.value)}
                  type="text"
                  placeholder="Contoh: Bantuan alat praktikum"
                  className="admin-input"
                  disabled={campaignLoading}
                  required
                />
              </div>
              <div className="admin-field">
                <label htmlFor="campaign-description" className="admin-label">Deskripsi</label>
                <textarea
                  id="campaign-description"
                  value={campaignDescription}
                  onChange={event => setCampaignDescription(event.target.value)}
                  rows={4}
                  placeholder="Jelaskan tujuan dan penggunaan dana."
                  className="admin-input"
                  disabled={campaignLoading}
                  required
                />
              </div>
              <div className="admin-field">
                <label htmlFor="campaign-target" className="admin-label">Target donasi (Rp)</label>
                <input
                  id="campaign-target"
                  value={campaignTargetAmount}
                  onChange={event => setCampaignTargetAmount(event.target.value)}
                  type="number"
                  min="1"
                  placeholder="5000000"
                  className="admin-input"
                  disabled={campaignLoading}
                  required
                />
              </div>
              <div className="admin-field">
                <label id="campaign-banner-label" htmlFor="campaign-banner" className="admin-label">Banner kampanye</label>
                <label htmlFor="campaign-banner" className="admin-upload">
                  <input
                    ref={campaignFileRef}
                    id="campaign-banner"
                    aria-labelledby="campaign-banner-label"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={campaignLoading}
                    onChange={event => {
                      const file = event.target.files?.[0] ?? null;
                      setCampaignBannerFile(file);
                      setCampaignBannerPreview(file ? URL.createObjectURL(file) : null);
                    }}
                  />
                  <span className="min-w-0 break-all">
                    {campaignBannerFile ? campaignBannerFile.name + ' · Ganti gambar' : 'Pilih gambar banner'}
                  </span>
                </label>
              </div>
              {campaignBannerPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={campaignBannerPreview} alt="Pratinjau banner kampanye" className="h-44 w-full rounded-xl border border-slate-200 object-cover" />
              )}
              <AdminNotice feedback={campaignMessage} />
              <button type="submit" disabled={campaignLoading} className="admin-button admin-button-laporan w-full">
                {campaignLoading ? 'Mengirim...' : 'Buat kampanye donasi'}
              </button>
            </form>
          </AdminPanel>
        </div>
      </main>
    </div>
  );
}
