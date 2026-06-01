import { donationService } from '@/services/donationService';
import { NextResponse } from 'next/server'; // Webhook beda tipis response-nya

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // PENTING: Endpoint ini TIDAK MEMBUTUHKAN LOGIN / TOKEN JWT.
    // Karena yang menembak API ini adalah Server Midtrans, bukan user kita.
    // Keamanannya dijamin oleh `signature_key` di Service tadi.
    
    const result = await donationService.handleMidtransWebhook(payload);
    
    // Midtrans hanya butuh dikasih tau "OK 200". Mereka tidak butuh JSON Response kita.
    return NextResponse.json({ status: 'success', message: result.message }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    console.error('MIDTRANS WEBHOOK ERROR:', errorMessage);
    
    // Kalau ada error (misal signature salah), tolak dengan 400
    return NextResponse.json({ status: 'error', message: errorMessage }, { status: 400 });
  }
}