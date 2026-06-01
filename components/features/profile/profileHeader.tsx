export default function ProfileHeader({ name, isVerified }: { name: string, isVerified: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-4">
        <div className="w-24 h-24 rounded-full border-4 border-white shadow-sm overflow-hidden bg-zinc-200">
          <img src="/avatar-placeholder.png" alt="Profile" className="w-full h-full object-cover" />
        </div>
        {isVerified && (
          <div className="absolute bottom-0 right-0 bg-[#E8A34D] p-1 rounded-full border-2 border-white">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
          </div>
        )}
      </div>
      <h2 className="text-xl font-bold text-black">{name}</h2>
      <span className="bg-[#FFF8F0] text-[#E8A34D] text-[10px] font-bold px-3 py-1 rounded-full mt-1">
        Mahasiswa Terverifikasi
      </span>
    </div>
  );
}