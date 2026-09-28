import { NextResponse } from 'next/server';
import { checkHealth } from '@/lib/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await checkHealth();
  return NextResponse.json(result, {
    status: result.status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' }
  });
}
