"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export interface AdminFeedback {
  type: "success" | "error";
  message: string;
}

const ACCENT_CLASSES = {
  green: "text-pengumuman",
  orange: "text-laporan",
  blue: "text-wacana",
  red: "text-moderasi",
};

export function AdminPanel({
  id, title, description, children, accent, className = ""
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  accent?: keyof typeof ACCENT_CLASSES;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`admin-panel ${className}`}>
      <header className="mb-5 space-y-1">
        <h2 id={`${id}-title`} className={`text-lg font-bold ${accent ? ACCENT_CLASSES[accent] : "text-slate-900"}`}>{title}</h2>
        <p className="text-sm leading-relaxed text-slate-800">{description}</p>
      </header>
      {children}
    </section>
  );
}

export function AdminNotice({ feedback }: { feedback: AdminFeedback | null }) {
  if (!feedback) return null;
  return (
    <p
      role={feedback.type === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
        feedback.type === "error"
          ? "border-red-100 bg-red-50 text-red-700"
          : "border-pengumuman/20 bg-pengumuman-subtle text-pengumuman-foreground"
      }`}
    >
      {feedback.message}
    </p>
  );
}

export function AdminDialog({
  open, title, description, children, onClose, busy = false
}: {
  open: boolean;
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    dialog.showModal();
    return () => dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      aria-busy={busy}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-3xl border border-slate-100 bg-white p-5 shadow-xl backdrop:bg-slate-900/40 sm:p-6"
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      onClick={event => {
        if (busy || event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}
    >
      <h2 id={`${id}-title`} className="text-lg font-bold text-moderasi">{title}</h2>
      <p id={`${id}-description`} className="mt-2 mb-5 text-sm leading-relaxed text-slate-800">{description}</p>
      {children}
    </dialog>
  );
}
