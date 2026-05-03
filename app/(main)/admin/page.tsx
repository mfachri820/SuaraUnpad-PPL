"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { fetchPolicies, updatePolicyStatus } from '@/components/features/policies/PolicyFetch';
import { Policy } from '@/components/features/policies/types';

interface AdminStats {
  totalPosts: number;
  totalPolicies: number;
  totalReports: number;
}

interface ReportOption {
  id: string;
  title: string;
  status: string;
}

interface ReportItem {
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
  const [policyUpdateMessage, setPolicyUpdateMessage] = useState<string | null>(null);
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
        const [postsRes, reportsRes] = await Promise.all([
          fetch('/api/posts?limit=1', {
            headers: { Authorization: `Bearer ${userToken}` },
          }),
          fetch('/api/reports?limit=100', {
            headers: { Authorization: `Bearer ${userToken}` },
          }),
        ]);

        const [postsJson, reportsJson] = await Promise.all([
          postsRes.json(),
          reportsRes.json(),
        ]);

        const policiesData = await fetchPolicies();

        if (!postsRes.ok) {
          throw new Error(postsJson.message || 'Gagal memuat total postingan');
        }

        if (!reportsRes.ok) {
          throw new Error(reportsJson.message || 'Gagal memuat total laporan');
        }

        setStats({
          totalPosts: postsJson.data?.meta?.totalItems ?? 0,
          totalPolicies: policiesData.length,
          totalReports: reportsJson.data?.meta?.totalItems ?? 0,
        });
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
        const errorMessage = err instanceof Error ? err.message : 'Gagal memuat statistik admin';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin !== false) {
      loadStats();
    }
  }, [router, isAdmin]);

  const [reportId, setReportId] = useState('');
  const [newStatus, setNewStatus] = useState('VERIFIED');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const handleLogout = () => {
    Cookies.remove('token', { path: '/' });
    alert('Berhasil Logout!');
    router.push('/login');
  };

  const handleUpdateStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUpdateLoading(true);
    setUpdateMessage(null);

    const token = Cookies.get('token');
    if (!token) {
      setUpdateMessage('Token tidak ditemukan. Silakan login ulang.');
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

      setUpdateMessage(`Berhasil: ${result.message}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memperbarui status laporan';
      setUpdateMessage(errorMessage);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleUpdatePolicyStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPolicyUpdateLoading(true);
    setPolicyUpdateMessage(null);

    if (!policyId) {
      setPolicyUpdateMessage('Pilih kebijakan terlebih dahulu.');
      setPolicyUpdateLoading(false);
      return;
    }

    try {
      await updatePolicyStatus(policyId, policyStatus);
      setPolicyUpdateMessage('Status kebijakan berhasil diperbarui.');
      const refreshedPolicies = await fetchPolicies();
      setPolicies(refreshedPolicies);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memperbarui status kebijakan';
      setPolicyUpdateMessage(errorMessage);
    } finally {
      setPolicyUpdateLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white font-sans p-4 text-center">
      <h1 className="text-4xl font-bold text-[#2682F9] mb-2">Halaman Admin</h1>
      <p className="text-zinc-600 mb-8">Ringkasan jumlah postingan dan kebijakan.</p>

      {loading ? (
        <div className="text-zinc-500 mb-8">Memuat statistik...</div>
      ) : error ? (
        <div className="text-red-500 mb-8">{error}</div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-3 w-full max-w-xl mb-8">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 text-left shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500 mb-4">Total Postingan</p>
            <p className="text-5xl font-bold text-[#2682F9]">{stats.totalPosts}</p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 text-left shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500 mb-4">Total Kebijakan</p>
            <p className="text-5xl font-bold text-[#E8A34D]">{stats.totalPolicies}</p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 text-left shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500 mb-4">Total Laporan</p>
            <p className="text-5xl font-bold text-[#4F9A4E]">{stats.totalReports}</p>
          </div>
        </div>
      ) : null}

      <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm mb-8 text-left">
        <h2 className="text-2xl font-bold text-[#2682F9] mb-4">Perbarui Status Laporan</h2>
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Laporan</label>
            <select
              value={reportId}
              onChange={(event) => setReportId(event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-black outline-none focus:border-[#2682F9]"
              required
            >
              <option value="" disabled>
                {reports.length > 0 ? 'Pilih laporan...' : 'Tidak ada laporan tersedia'}
              </option>
              {reports.map((report) => (
                <option key={report.id} value={report.id} className="text-black">
                  {report.title} ({report.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Status Baru</label>
            <select
              value={newStatus}
              onChange={(event) => setNewStatus(event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-black outline-none focus:border-[#2682F9]"
            >
              <option className="text-black" value="SUBMITTED">SUBMITTED</option>
              <option className="text-black" value="VERIFIED">VERIFIED</option>
              <option className="text-black" value="IN_PROGRESS">IN_PROGRESS</option>
              <option className="text-black" value="RESOLVED">RESOLVED</option>
            </select>
          </div>
          {updateMessage ? (
            <div className="text-black text-sm text-zinc-700">{updateMessage}</div>
          ) : null}
          <button
            type="submit"
            disabled={updateLoading}
            className="w-full bg-[#2682F9] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {updateLoading ? 'Memproses...' : 'Perbarui Status'}
          </button>
        </form>
      </div>

      <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm mb-8 text-left">
        <h2 className="text-2xl font-bold text-[#E8A34D] mb-4">Kelola Status Kebijakan</h2>
        <form onSubmit={handleUpdatePolicyStatus} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Pilih Kebijakan</label>
            <select
              value={policyId}
              onChange={(event) => setPolicyId(event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-black outline-none focus:border-[#2682F9]"
              required
            >
              <option value="" disabled>
                {policies.length > 0 ? 'Pilih kebijakan...' : 'Tidak ada kebijakan tersedia'}
              </option>
              {policies.map((policy) => (
                <option key={policy.id} value={policy.id} className="text-black">
                  {policy.title} ({policy.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Status Baru</label>
            <select
              value={policyStatus}
              onChange={(event) => setPolicyStatus(event.target.value as 'DRAFT' | 'ACTIVE' | 'CLOSED')}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-black outline-none focus:border-[#2682F9]"
            >
              <option className="text-black" value="DRAFT">DRAFT</option>
              <option className="text-black" value="ACTIVE">ACTIVE</option>
              <option className="text-black" value="CLOSED">CLOSED</option>
            </select>
          </div>

          {policyUpdateMessage ? (
            <div className="text-black text-sm text-zinc-700">{policyUpdateMessage}</div>
          ) : null}

          <button
            type="submit"
            disabled={policyUpdateLoading}
            className="w-full bg-[#E8A34D] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {policyUpdateLoading ? 'Memproses...' : 'Perbarui Status Kebijakan'}
          </button>
        </form>
      </div>

      <button
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95"
      >
        Logout dari Admin
      </button>
    </div>
  );
}
