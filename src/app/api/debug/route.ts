import { NextRequest, NextResponse } from 'next/server';
import { getRecentLogs } from '@/lib/observability';
import { verifyApiAuth } from '@/lib/api-auth';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  // Never expose internal logs in production.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Outside production, still require the same API auth as protected routes.
  const authError = verifyApiAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : 100;

  return NextResponse.json({
    success: true,
    logs: getRecentLogs(Number.isFinite(limit) ? limit : 100)
  });
}
