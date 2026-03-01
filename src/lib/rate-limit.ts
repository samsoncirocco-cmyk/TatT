import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getUserFromRequest } from './api-auth';
import { checkQuota } from './quota-tracker';

export type RateLimitResult = {
  allowed: boolean;
  retryAfter?: number;
};

function normalizeLimitType(limitType: string): string {
  const normalized = String(limitType || '').toLowerCase().trim();
  switch (normalized) {
    case 'generation':
    case 'matching':
    case 'council':
    case 'estimate':
    case 'upload':
      return normalized;
    default:
      return 'default';
  }
}

function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim();
  return ip || 'anonymous';
}

export async function checkRateLimit(req: NextRequest, limitType: string): Promise<RateLimitResult> {
  const endpoint = normalizeLimitType(limitType);

  // Prefer authenticated user id; fall back to IP-derived key.
  const user = await getUserFromRequest(req);
  const key = user?.uid ? `uid:${user.uid}` : `ip:${getClientKey(req)}`;

  return checkQuota(key, endpoint);
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const headers: Record<string, string> = {};
  if (typeof result.retryAfter === 'number') {
    headers['Retry-After'] = String(result.retryAfter);
  }
  return NextResponse.json(
    { error: 'Rate limit exceeded', retryAfter: result.retryAfter ?? null },
    { status: 429, headers }
  );
}
