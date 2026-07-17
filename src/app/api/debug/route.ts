import { NextRequest, NextResponse } from 'next/server';
import { getRecentLogs } from '@/lib/observability';
import { verifyApiAuth } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Never expose internal logs in production (main behavior).
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Outside production, require the same API auth as protected routes
  // (async Firebase verify from the hardening branch).
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : 100;

  return NextResponse.json({
    success: true,
    logs: getRecentLogs(Number.isFinite(limit) ? limit : 100)
  });
}
