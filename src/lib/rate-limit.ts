import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LimitType = 'semantic-match' | 'council' | 'generation';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch seconds
}

// ---------------------------------------------------------------------------
// Per-endpoint rate limit windows
// ---------------------------------------------------------------------------

const LIMIT_CONFIG: Record<LimitType, { requests: number; window: string }> = {
  'semantic-match': { requests: 100, window: '1 h' },
  council:          { requests: 20,  window: '1 h' },
  generation:       { requests: 10,  window: '1 m' },
};

// ---------------------------------------------------------------------------
// Upstash-backed limiters (created lazily, one per endpoint)
// ---------------------------------------------------------------------------

let upstashLimiters: Map<LimitType, Ratelimit> | null = null;

function getUpstashLimiters(): Map<LimitType, Ratelimit> | null {
  if (upstashLimiters) return upstashLimiters;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });

  upstashLimiters = new Map();
  for (const [key, cfg] of Object.entries(LIMIT_CONFIG)) {
    upstashLimiters.set(
      key as LimitType,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(cfg.requests, cfg.window as Parameters<typeof Ratelimit.slidingWindow>[1]),
        prefix: `tatt:rl:${key}`,
      }),
    );
  }
  return upstashLimiters;
}

// ---------------------------------------------------------------------------
// In-memory fallback (local dev without Redis)
// ---------------------------------------------------------------------------

interface MemoryEntry {
  tokens: number;
  resetAt: number; // epoch ms
}

const memoryStore = new Map<string, MemoryEntry>();

function windowMs(limitType: LimitType): number {
  const w = LIMIT_CONFIG[limitType].window;
  if (w.endsWith('h')) return parseInt(w) * 3_600_000;
  if (w.endsWith('m')) return parseInt(w) * 60_000;
  return 60_000;
}

function checkMemory(identifier: string, limitType: LimitType): RateLimitResult {
  const cfg = LIMIT_CONFIG[limitType];
  const win = windowMs(limitType);
  const key = `${limitType}:${identifier}`;
  const now = Date.now();

  let entry = memoryStore.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { tokens: cfg.requests, resetAt: now + win };
    memoryStore.set(key, entry);
  }

  if (entry.tokens > 0) {
    entry.tokens -= 1;
    return {
      allowed: true,
      limit: cfg.requests,
      remaining: entry.tokens,
      reset: Math.ceil(entry.resetAt / 1000),
    };
  }

  return {
    allowed: false,
    limit: cfg.requests,
    remaining: 0,
    reset: Math.ceil(entry.resetAt / 1000),
  };
}

// ---------------------------------------------------------------------------
// Identifier extraction
// ---------------------------------------------------------------------------

function getIdentifier(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    (req as unknown as { ip?: string }).ip ||
    'anonymous'
  );
}

// ---------------------------------------------------------------------------
// Public API  (maintains original signature for compatibility)
// ---------------------------------------------------------------------------

/**
 * Check rate limit for a request.
 * Returns `true` when the request is allowed, `false` when rate-limited.
 */
export async function checkRateLimit(
  req: NextRequest,
  limitType: string,
): Promise<boolean> {
  const lt = limitType as LimitType;
  if (!(lt in LIMIT_CONFIG)) return true; // unknown type = no limit

  const identifier = getIdentifier(req);
  const limiters = getUpstashLimiters();

  if (limiters) {
    const limiter = limiters.get(lt)!;
    const { success } = await limiter.limit(identifier);
    return success;
  }

  // Fallback: in-memory
  const result = checkMemory(identifier, lt);
  return result.allowed;
}

// ---------------------------------------------------------------------------
// Enhanced API  (returns headers + supports 429 response creation)
// ---------------------------------------------------------------------------

export async function rateLimit(
  req: NextRequest,
  limitType: LimitType,
): Promise<RateLimitResult> {
  const identifier = getIdentifier(req);
  const limiters = getUpstashLimiters();

  if (limiters) {
    const limiter = limiters.get(limitType)!;
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    return {
      allowed: success,
      limit,
      remaining,
      reset: Math.ceil(reset / 1000),
    };
  }

  return checkMemory(identifier, limitType);
}

/**
 * Attach standard rate-limit headers to a response.
 */
export function withRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.reset));
  return response;
}

/**
 * Build a 429 Too Many Requests response with Retry-After.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(0, result.reset - Math.ceil(Date.now() / 1000));
  const res = NextResponse.json(
    { error: 'Too Many Requests', retryAfter },
    { status: 429 },
  );
  res.headers.set('Retry-After', String(retryAfter));
  return withRateLimitHeaders(res, result);
}

// Re-export for convenience
export { LIMIT_CONFIG };
