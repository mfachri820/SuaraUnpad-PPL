"use client";
import { useEffect, useState } from "react";
import { fetchCampaigns, DonationCampaign } from "./DonationFetch";
import Link from "next/link";

export default function CampaignCarousel() {
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);

  useEffect(() => {
    fetchCampaigns().then(setCampaigns).catch(console.error);
  }, []);

  if (campaigns.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto flex gap-4 p-4 no-scrollbar">
      {campaigns.filter(c => c.status === "ACTIVE").map((campaign) => {
        const progress = Math.min((campaign.collectedAmount / campaign.targetAmount) * 100, 100);
        
        return (
          <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="min-w-[300px] bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
            <img src={campaign.bannerUrl} alt={campaign.title} className="w-full h-40 object-cover rounded-2xl mb-4" />
            <h3 className="font-black text-slate-800 line-clamp-1">{campaign.title}</h3>
            
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1 font-bold text-slate-500">
                <span>Rp {campaign.collectedAmount.toLocaleString()}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#E8A34D] transition-all" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic text-right">Target: Rp {campaign.targetAmount.toLocaleString()}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}