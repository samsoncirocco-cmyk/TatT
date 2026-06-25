import { NextRequest, NextResponse } from 'next/server';
import { getRecentLogs } from '@/lib/observability';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : 100;

  return NextResponse.json({
    success: true,
    logs: getRecentLogs(Number.isFinite(limit) ? limit : 100)
  });
}
