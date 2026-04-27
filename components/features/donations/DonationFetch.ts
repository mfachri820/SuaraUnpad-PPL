import Cookies from "js-cookie"; // 🌟 Import library pembaca cookie

export interface DonationCampaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  collectedAmount: number;
  bannerUrl: string;
  status: "ACTIVE" | "COMPLETED";
}

export interface TransactionResponse {
  status: string;
  message: string;
  data: {
    id: string;
    paymentUrl: string;
    snapToken?: string;
  };
}

// 🌟 Helper mungil untuk mengambil token dari cookie dan mengubahnya jadi Header
const getAuthHeader = (): Record<string, string> => {
  const token = Cookies.get("token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
};

export const fetchCampaigns = async (): Promise<DonationCampaign[]> => {
  const res = await fetch("/api/campaigns", {
    headers: { ...getAuthHeader() } // 🌟 Sisipkan KTP di sini
  });
  
  const result = await res.json();
  if (!res.ok) throw new Error(result.message);
  return result.data;
};

export const fetchCampaignById = async (id: string): Promise<DonationCampaign> => {
  const res = await fetch(`/api/campaigns`, {
    headers: { ...getAuthHeader() } // 🌟 Sisipkan KTP di sini juga
  });
  
  const result = await res.json();
  if (!res.ok) throw new Error(result.message);
  return result.data.find((c: DonationCampaign) => c.id === id);
};

export const createDonation = async (campaignId: string, amount: number): Promise<TransactionResponse> => {
  const res = await fetch(`/api/campaigns/${campaignId}/donate`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...getAuthHeader() // 🌟 Sisipkan KTP untuk transaksi
    },
    body: JSON.stringify({ amount }),
  });
  
  const result = await res.json();
  if (!res.ok) throw new Error(result.message);
  return result;
};