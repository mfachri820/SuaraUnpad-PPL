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

describe('Scalability - concurrent vote handling', () => {
  it('handles 10 concurrent createVote requests without overflowing connections or timing out', async () => {
    const { POST: voteRoutePOST } = await import('@/app/api/policies/[id]/vote/route');
    const startTime = Date.now();

    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, index) => {
        const request = new Request('http://localhost/api/policies/policy-1/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': `user-${index}`,
          },
          body: JSON.stringify({ choice: 'AGREE' }),
        });

        return voteRoutePOST(request, { params: Promise.resolve({ id: 'policy-1' }) });
      })
    );

    const duration = Date.now() - startTime;

    expect(responses).toHaveLength(10);
    expect(submitVoteMock).toHaveBeenCalledTimes(10);
    expect(duration).toBeLessThan(2000);

    for (const response of responses) {
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('success');
      expect(body.data).toEqual({ policyId: 'policy-1', userId: expect.any(String), choice: 'AGREE', status: 'VOTED' });
    }
  });
});
