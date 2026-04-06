export default function AuthButton({ children, variant = "primary", onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl font-bold transition-all ${
        variant === "primary" 
        ? "bg-foreground text-background hover:opacity-90" 
        : "bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}