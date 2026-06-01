import { describe, it, expect, vi } from 'vitest';

const submitVoteMock = vi.fn<[string, string, string], Promise<{ policyId: string; userId: string; choice: string; status: string }>>(
  async (policyId, userId, choice) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { policyId, userId, choice, status: 'VOTED' };
  }
);

vi.mock('@/services/policyService', () => ({
  policyService: {
    submitVote: submitVoteMock,
  },
}));

describe('Policy vote scalability and duplicate handling', () => {
  it('handles 20 concurrent vote requests without crashing or timing out', async () => {
    const { POST: voteRoutePOST } = await import('@/app/api/policies/[id]/vote/route');
    const requests = Array.from({ length: 20 }, (_, index) => {
      const request = new Request('http://localhost/api/policies/policy-1/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': `user-${index}`,
        },
        body: JSON.stringify({ choice: 'AGREE' }),
      });
      return voteRoutePOST(request, { params: Promise.resolve({ id: 'policy-1' }) });
    });

    const responses = await Promise.all(requests);

    expect(responses).toHaveLength(20);
    expect(submitVoteMock).toHaveBeenCalledTimes(20);

    for (const response of responses) {
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('success');
      expect(body.data).toEqual({ policyId: 'policy-1', userId: expect.any(String), choice: 'AGREE', status: 'VOTED' });
    }
  });

  it('returns 400 when a duplicate vote insertion triggers Prisma P2002', async () => {
    submitVoteMock.mockImplementationOnce(async () => {
      const error = new Error('Unique constraint failed on the fields: (`userId`, `policyId`)');
      const prismaError = error as Error & { code?: string };
      prismaError.code = 'P2002';
      throw error;
    });

    const { POST: voteRoutePOST } = await import('@/app/api/policies/[id]/vote/route');
    const request = new Request('http://localhost/api/policies/policy-1/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user-42',
      },
      body: JSON.stringify({ choice: 'AGREE' }),
    });

    const response = await voteRoutePOST(request, { params: Promise.resolve({ id: 'policy-1' }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe('error');
    expect(body.message).toMatch(/unique constraint|P2002|duplicate/i);
  });
});
