import React from "react";

// Definisikan tipe untuk props
interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export default function AuthButton({
  children,
  variant = "primary",
  onClick,
  className,
  ...props // Mengambil sisa atribut tombol lainnya (type, disabled, dll)
}: AuthButtonProps) {
  return (
    <button
      onClick={onClick}
      {...props}
      className={`w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl font-bold transition-all ${
        variant === "primary"
          ? "bg-foreground text-background hover:opacity-90"
          : "bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 hover:bg-zinc-50"
      } ${className}`} // Tambahkan className agar tetap fleksibel
    >
      {children}
    </button>
  );
}