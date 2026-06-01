"use client";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { createDonation } from "./DonationFetch";

interface SnapOptions {
  onSuccess?: () => void;
  onPending?: () => void;
  onError?: () => void;
  onClose?: () => void;
}

// Declare Snap global agar TS tidak error
declare global {
  interface Window {
    snap: {
      pay: (token: string, options: SnapOptions) => void;
    };
  }
}

export default function DonateModal({
  campaignId,
  onClose
}: {
  campaignId: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(10000);
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const result = await createDonation(campaignId, amount);

      // Ambil token: coba dari snapToken BE, kalau gak ada ekstrak dari URL
      const token =
        result.data.snapToken || result.data.paymentUrl.split("/").pop();

      window.snap.pay(token as string, {
        onSuccess: () => {
          toast.success("Pembayaran Berhasil!");
          onClose();
          window.location.reload();
        },
        onPending: () => {
          toast("Menunggu Pembayaran...");
          onClose();
        },
        onError: () => {
          toast.error("Pembayaran Gagal!");
        },
        onClose: () => {
          toast("Kamu menutup jendela pembayaran");
        }
      });
    } catch (err) {
      // 🌟 3. Gunakan Type Narrowing pengganti 'catch (err: any)'
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Terjadi kesalahan sistem saat memproses donasi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
        <h2 className="text-xl font-black text-slate-800 mb-2">
          Mau donasi berapa?
        </h2>
        <p className="text-xs text-slate-400 mb-6 italic">
          *Minimal donasi Rp 10.000
        </p>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full text-3xl font-black text-[#E8A34D] border-b-4 border-slate-100 focus:border-[#E8A34D] outline-none py-2 mb-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 font-medium text-slate-400 hover:cursor-pointer hover:underline"
          >
            Batal
          </button>
          <button
            onClick={handlePayment}
            disabled={loading || amount < 10000}
            className="flex-1 bg-[#4a97fc] hover:cursor-pointer hover:bg-[#2682F9] text-white font-medium py-4 rounded-xl active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "PROSES..." : "BAYAR"}
          </button>
        </div>
      </div>
    </div>
  );
}
