import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { validateDatabaseUrl } from '../lib/health';
import { GET as healthGET } from '../app/api/health/route';
import { prisma } from '@/lib/prisma';

const mockedQueryRaw = vi.mocked(prisma.$queryRaw);

describe('Availability health checks', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://user:password@localhost:5432/testdb';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('throws a clear error message when DATABASE_URL is undefined', () => {
    delete process.env.DATABASE_URL;

    expect(() => validateDatabaseUrl()).toThrow(
      'DATABASE_URL is not defined. Set the database connection string in environment variables.'
    );
  });

  it('returns 200 when the database answers SELECT 1', async () => {
    mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }] as never);

    const response = await healthGET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
    expect(mockedQueryRaw).toHaveBeenCalledOnce();
  });

  it('returns 503 when the database is unreachable', async () => {
    mockedQueryRaw.mockRejectedValue(new Error('connection refused') as never);

    const response = await healthGET();

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({ status: 'error', database: 'unreachable' });
  });
});
