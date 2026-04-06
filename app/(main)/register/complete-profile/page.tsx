"use client";
import React from 'react';
import AuthInput from '@/components/AuthInput';
import AuthButton from '@/components/AuthButton';

export default function CompleteProfilePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col bg-white p-12 dark:bg-black shadow-sm border border-zinc-100 dark:border-zinc-900 rounded-2xl">
        <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-2">Lengkapi Profil</h2>
        <p className="text-zinc-500 text-sm mb-8">
          Data akademik diperlukan untuk validasi laporan kamu di sistem SuaraUnpad.
        </p>

        <form className="w-full space-y-4">
          <AuthInput label="NPM" placeholder="Contoh: 14081023xxxx" />
          <AuthInput label="Fakultas" placeholder="Contoh: MIPA" />
          <AuthInput label="Program Studi" placeholder="Contoh: Teknik Informatika" />
          <AuthButton variant="primary">Simpan & Mulai</AuthButton>
        </form>
      </main>
    </div>
  );
}