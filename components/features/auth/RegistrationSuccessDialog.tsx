"use client";

import { useEffect, useRef } from "react";

export default function RegistrationSuccessDialog({
  email,
  onContinue
}: {
  email: string;
  onContinue: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="registration-success-title"
      aria-describedby="registration-success-description"
      onCancel={(event) => {
        event.preventDefault();
        onContinue();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      <h2 id="registration-success-title" className="text-xl font-bold">
        Cek email untuk verifikasi
      </h2>
      <div id="registration-success-description" className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
        <p>
          Akun berhasil dibuat. Tautan verifikasi telah dikirim ke{" "}
          <span className="font-semibold text-slate-900 break-all">{email}</span>.
        </p>
        <p>
          Buka tautan tersebut untuk mengaktifkan akun sebelum masuk.
          Jika email belum terlihat, periksa folder spam.
        </p>
      </div>
      <button
        type="button"
        autoFocus
        onClick={onContinue}
        className="mt-6 w-full cursor-pointer rounded-xl bg-[#2682F9] px-4 py-3 text-sm font-bold text-white hover:bg-[#1f6bd0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2682F9]"
      >
        Ke halaman masuk
      </button>
    </dialog>
  );
}
