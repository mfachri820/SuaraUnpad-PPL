import { describe, it, expect, vi } from 'vitest';
import { POST as donateRoutePOST } from '@/app/api/campaigns/[id]/donate/route';

vi.mock('@/services/donationService', () => ({
  donationService: {
    createTransaction: vi.fn(async () => {
      const error = new Error('Midtrans service is unavailable. Silakan coba lagi nanti.');
      throw error;
    }),
  },
}));

describe('MidtransPayment service error handling', () => {
  it('returns a friendly error message when Midtrans API returns a 500 network error', async () => {
    const request = new Request('http://localhost/api/campaigns/campaign-1/donate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user-123',
      },
      body: JSON.stringify({ amount: 20000 }),
    });

    const response = await donateRoutePOST(request, {
      params: Promise.resolve({ id: 'campaign-1' }),
    });

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toEqual({
      status: 'error',
      message: 'Midtrans service is unavailable. Silakan coba lagi nanti.',
    });
  });
});
