"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { fetchPolicies, updatePolicyStatus, createPolicy } from '@/components/features/policies/PolicyFetch';
import { Policy } from '@/components/features/policies/types';
import { apiFetch, getApiErrorMessage } from '@/lib/api/client';
import { AdminStats } from '@/lib/api/types';
import ModerationQueue from '@/components/features/admin/ModerationQueue';
import ReportQueue from '@/components/features/admin/ReportQueue';
import ReportTrendChart from '@/components/features/admin/ReportTrendChart';
import ReportBreakdown from '@/components/features/admin/ReportBreakdown';
import AnnouncementForm from '@/components/features/admin/AnnouncementForm';
import Select from '@/components/ui/Select';
import { AdminPanel, AdminNotice, type AdminFeedback } from '@/components/features/admin/AdminUI';
import { formatAge, formatDuration } from '@/lib/duration';

const POLICY_STATUS_LABELS = { DRAFT: 'Draft', ACTIVE: 'Aktif', CLOSED: 'Selesai' };

// Kartu "Kelola konten" sebaris sama tinggi (pengumuman + kampanye, lalu dua kartu wacana); tombol kirim menempel di bawah.
const CONTENT_PANEL = 'flex h-full flex-col';
const CONTENT_FORM = 'flex flex-1 flex-col gap-4';

const durationOrEmpty = (ms: number | null) => (ms == null ? '—' : formatDuration(ms));

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
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
        const [policiesData, statsData] = await Promise.all([
          fetchPolicies(),
          apiFetch<AdminStats>('/api/admin/stats'),
        ]);

        setStats(statsData);
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
            Pantau waktu penanganan, kerjakan antrean laporan dan moderasi, lalu kelola konten.
          </p>
        </header>

        <section aria-labelledby="ringkasan-sla-title" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="ringkasan-sla-title" className="text-lg font-bold text-slate-900">Waktu penanganan</h2>
            {stats && <p className="text-xs text-slate-700">Rata-rata dari {stats.sla.windowDays} hari terakhir</p>}
          </div>
          {loading ? (
            <p role="status" className="admin-empty">Memuat ringkasan aktivitas...</p>
          ) : error ? (
            <AdminNotice feedback={{ type: 'error', message: error }} />
          ) : stats ? (
            <>
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {[
                  {
                    label: 'Laporan terbuka',
                    value: String(stats.sla.reports.open),
                    detail: `${stats.sla.reports.resolvedLast7Days} selesai dalam 7 hari`,
                    color: 'text-laporan-foreground',
                  },
                  {
                    label: 'Laporan tertua menunggu',
                    value: stats.sla.reports.oldestOpenAt ? formatAge(stats.sla.reports.oldestOpenAt) : '—',
                    detail: stats.sla.reports.oldestOpenAt ? 'sejak laporan dibuat' : 'Tidak ada laporan terbuka',
                    color: 'text-laporan-foreground',
                  },
                  {
                    label: 'Rata-rata verifikasi',
                    value: durationOrEmpty(stats.sla.reports.avgVerifyMs),
                    detail: 'dari laporan masuk',
                    color: 'text-slate-900',
                  },
                  {
                    label: 'Rata-rata selesai',
                    value: durationOrEmpty(stats.sla.reports.avgResolveMs),
                    detail: `dari ${stats.sla.reports.resolvedSample} laporan selesai`,
                    color: 'text-slate-900',
                  },
                  {
                    label: 'Konten menunggu moderasi',
                    value: String(stats.pendingFlags.total),
                    detail: stats.sla.flags.oldestPendingAt
                      ? `tertua ${formatAge(stats.sla.flags.oldestPendingAt)}`
                      : 'Tidak ada yang menunggu',
                    color: 'text-red-700',
                  },
                  {
                    label: 'Rata-rata tinjau laporan konten',
                    value: durationOrEmpty(stats.sla.flags.avgReviewMs),
                    detail: `dari ${stats.sla.flags.reviewedSample} laporan ditinjau`,
                    color: 'text-slate-900',
                  },
                ].map(({ label, value, detail, color }) => (
                  <div key={label} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                    <dt className="text-sm font-medium leading-5 text-slate-800">{label}</dt>
                    <dd className={'mt-2 break-words text-xl font-bold tabular-nums sm:text-2xl ' + color}>{value}</dd>
                    <dd className="mt-1 text-xs leading-5 text-slate-700">{detail}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-slate-700">
                Total: {stats.totalPosts} postingan · {stats.totalAnnouncements} pengumuman · {stats.totalPolicies} wacana · {stats.totalReports} laporan fasilitas
              </p>
              <ReportTrendChart daily={stats.sla.reports.daily} />
              <ReportBreakdown reports={stats.sla.reports} />
            </>
          ) : null}
        </section>

        <section aria-labelledby="antrean-kerja-title" className="space-y-3">
          <h2 id="antrean-kerja-title" className="text-lg font-bold text-slate-900">Antrean kerja</h2>
          <div className="space-y-6">
            <ReportQueue counts={stats?.sla.reports.byStatus} onActionDone={refreshAdminStats} />
            <ModerationQueue onActionDone={refreshAdminStats} />
          </div>
        </section>

        <h2 className="text-lg font-bold text-slate-900">Kelola konten</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <AnnouncementForm onCreated={refreshAdminStats} className={CONTENT_PANEL} />

          <AdminPanel
            className={CONTENT_PANEL}
            id="kampanye-donasi"
            title="Buat kampanye donasi"
            accent="orange"
            description="Lengkapi informasi dan target dana untuk kampanye baru."
          >
            <form onSubmit={handleCreateCampaign} className={CONTENT_FORM}>
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
              <button type="submit" disabled={campaignLoading} className="admin-button admin-button-laporan mt-auto w-full">
                {campaignLoading ? 'Mengirim...' : 'Buat kampanye donasi'}
              </button>
            </form>
          </AdminPanel>

          <AdminPanel
            className={CONTENT_PANEL}
            id="status-wacana"
            title="Kelola status wacana"
            accent="blue"
            description="Aktifkan draft atau tandai wacana yang sudah selesai."
          >
            <form onSubmit={handleUpdatePolicyStatus} className={CONTENT_FORM}>
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
              <button type="submit" disabled={policyUpdateLoading || policies.length === 0} className="admin-button admin-button-wacana mt-auto w-full">
                {policyUpdateLoading ? 'Menyimpan...' : 'Simpan status wacana'}
              </button>
            </form>
          </AdminPanel>

          <AdminPanel
            className={CONTENT_PANEL}
            id="wacana-baru"
            title="Buat wacana"
            accent="blue"
            description="Wacana disimpan sebagai draft sebelum ditampilkan kepada pengguna."
          >
            <form onSubmit={handleCreatePolicy} className={CONTENT_FORM}>
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
              <button type="submit" disabled={policyCreateLoading} className="admin-button admin-button-wacana mt-auto w-full">
                {policyCreateLoading ? 'Menyimpan...' : 'Simpan draft wacana'}
              </button>
            </form>
          </AdminPanel>
        </div>
      </main>
    </div>
  );
}
