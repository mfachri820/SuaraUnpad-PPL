import { describe, it, expect, vi } from 'vitest';
import { performance } from 'perf_hooks';

const mockPrismaRecords = Array.from({ length: 100 }, (_, index) => ({
  id: `post-${index}`,
  title: `Aspirasi ${index}`,
  content: `Konten aspirasi ${index}`,
  authorId: 'user-1',
  policyId: null,
  createdAt: new Date().toISOString(),
  author: {
    id: 'user-1',
    email: 'user@example.com',
    avatarUrl: null,
    studentProfile: { fullName: 'User Satu' },
    lecturerProfile: null,
    adminProfile: null,
  },
  policy: null,
  _count: {
    postUpvotes: 0,
    comments: 0,
  },
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    post: {
      findMany: vi.fn(async ({ take = 100 }) => mockPrismaRecords.slice(0, take)),
      count: vi.fn(async () => 100),
    },
  },
}));

import { postService } from '../services/postService';

describe('Performance test for getAllAspirations', () => {
  it('fails if getAllAspirations takes longer than 500ms for 100 mock records', async () => {
    const getAllAspirations = async () => {
      return postService.getPosts({ page: 1, limit: 100 });
    };

    const start = performance.now();
    const result = await getAllAspirations();
    const duration = performance.now() - start;

    expect(result.data).toHaveLength(100);
    expect(result.meta.totalItems).toBe(100);
    expect(duration).toBeLessThan(500);
  });
});
