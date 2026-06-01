import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateDatabaseUrl } from '../lib/health';
import { GET as healthGET } from '../app/api/health/route';

describe('Availability health checks', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
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

  it('returns 200 status when health endpoint is called and services are connected', async () => {
    process.env.DATABASE_URL = 'postgres://user:password@localhost:5432/testdb';

    const request = new Request('http://localhost/api/health');
    const response = await healthGET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
  });
});
