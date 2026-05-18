import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findUnique: vi.fn()
    },
    donationCampaign: {
      update: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

import { donationService } from '@/services/donationService';
import { prisma } from '@/lib/prisma';

const mockedFindUnique = vi.mocked(prisma.transaction.findUnique);
const mockedTransaction = vi.mocked(prisma.$transaction);

function buildPayload(overrides?: Partial<{
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
}>) {
  return {
    order_id: 'order-123',
    status_code: '200',
    gross_amount: '10000',
    signature_key: 'invalid',
    transaction_status: 'settlement',
    ...overrides
  };
}

describe('Donation service webhook handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MIDTRANS_SERVER_KEY = 'test-server-key';
  });

  it('rejects webhook when signature is invalid', async () => {
    const payload = buildPayload({ signature_key: 'bad-signature' });

    await expect(donationService.handleMidtransWebhook(payload as any)).rejects.toThrow(
      /Signature Key tidak valid/i
    );

    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it('updates transaction and campaign on successful settlement', async () => {
    mockedFindUnique.mockResolvedValue({
      orderId: 'order-123',
      campaignId: 'camp-1',
      amount: 10000,
      paymentStatus: 'PENDING'
    } as any);

    const tx = {
      transaction: { update: vi.fn() },
      donationCampaign: { update: vi.fn() }
    };

    mockedTransaction.mockImplementation(async (callback: any) => {
      await callback(tx);
    });

    const payload = buildPayload({
      signature_key: 'bypass'
    });

    const crypto = await import('crypto');
    const signature = crypto
      .createHash('sha512')
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
      .digest('hex');

    payload.signature_key = signature;

    const result = await donationService.handleMidtransWebhook(payload as any);

    expect(result.message).toMatch(/Webhook diproses/i);
    expect(mockedTransaction).toHaveBeenCalledOnce();
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { orderId: 'order-123' },
      data: { paymentStatus: 'SUCCESS' }
    });
    expect(tx.donationCampaign.update).toHaveBeenCalledWith({
      where: { id: 'camp-1' },
      data: { collectedAmount: { increment: 10000 } }
    });
  });

  it('does not update when transaction already SUCCESS', async () => {
    mockedFindUnique.mockResolvedValue({
      orderId: 'order-123',
      campaignId: 'camp-1',
      amount: 10000,
      paymentStatus: 'SUCCESS'
    } as any);

    const payload = buildPayload();
    const crypto = await import('crypto');
    const signature = crypto
      .createHash('sha512')
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
      .digest('hex');

    payload.signature_key = signature;

    const result = await donationService.handleMidtransWebhook(payload as any);

    expect(result.message).toMatch(/sukses sebelumnya/i);
    expect(mockedTransaction).not.toHaveBeenCalled();
  });
});
