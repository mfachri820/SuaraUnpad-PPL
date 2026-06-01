import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findUnique: vi.fn(async () => ({
        orderId: 'order-123',
        campaignId: 'camp-1',
        amount: 10000,
        paymentStatus: 'PENDING',
      })),
    },
    $transaction: vi.fn(async (callback: (trx: { transaction: { update: ReturnType<typeof vi.fn> }; donationCampaign: { update: ReturnType<typeof vi.fn> } }) => Promise<void>) => {
      // Simulate database failure during transactional update
      await callback({
        transaction: {
          update: vi.fn(),
        },
        donationCampaign: {
          update: vi.fn(),
        },
      });
      throw new Error('Database transaction failed and was rolled back');
    }),
  },
}));

import { POST as midtransWebhookPOST } from '@/app/api/webhooks/midtrans/route';
import crypto from 'crypto';

describe('Midtrans webhook rollback handling', () => {
  it('returns an error and uses Prisma $transaction when payment update fails', async () => {
    process.env.MIDTRANS_SERVER_KEY = 'test-server-key';

    const payload = {
      order_id: 'order-123',
      status_code: '200',
      gross_amount: '10000',
      transaction_status: 'settlement',
    };

    const signature = crypto
      .createHash('sha512')
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
      .digest('hex');

    const request = new Request('http://localhost/api/webhooks/midtrans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        signature_key: signature,
      }),
    });

    const response = await midtransWebhookPOST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe('error');
    expect(body.message).toContain('Database transaction failed');
  });
});
