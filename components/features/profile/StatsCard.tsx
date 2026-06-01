export default function StatsCard({ count, label, color }: { count: number, label: string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-zinc-50 shadow-sm text-center">
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
      <p className="text-zinc-400 text-[10px] font-bold tracking-widest mt-1">{label}</p>
    </div>
  );
}