// Test API: health endpoint for availability checks
import { NextResponse } from 'next/server';
import { checkHealth } from '../../../lib/health';

export async function GET(_request: Request) {
  try {
    const result = await checkHealth();
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown health error';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
