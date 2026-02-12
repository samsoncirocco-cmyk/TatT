import { describe, it, expect, beforeEach, vi } from 'vitest';

// We test the in-memory fallback path (no Upstash env vars set).
// Clear env to ensure fallback is used.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

// Dynamic import so the module reads env at load time
let checkRateLimit: typeof import('@/lib/rate-limit').checkRateLimit;
let rateLimit: typeof import('@/lib/rate-limit').rateLimit;
let rateLimitResponse: typeof import('@/lib/rate-limit').rateLimitResponse;
let withRateLimitHeaders: typeof import('@/lib/rate-limit').withRateLimitHeaders;
let LIMIT_CONFIG: typeof import('@/lib/rate-limit').LIMIT_CONFIG;

// Minimal NextRequest-like object for testing
function mockReq(ip = '127.0.0.1'): any {
  return {
    ip,
    headers: new Headers({ 'x-forwarded-for': ip }),
  };
}

beforeEach(async () => {
  // Reset modules to get a fresh in-memory store each test
  vi.resetModules();
  const mod = await import('@/lib/rate-limit');
  checkRateLimit = mod.checkRateLimit;
  rateLimit = mod.rateLimit;
  rateLimitResponse = mod.rateLimitResponse;
  withRateLimitHeaders = mod.withRateLimitHeaders;
  LIMIT_CONFIG = mod.LIMIT_CONFIG;
});

// -----------------------------------------------------------------------
// checkRateLimit (legacy API)
// -----------------------------------------------------------------------

describe('checkRateLimit', () => {
  it('allows requests under the limit', async () => {
    const req = mockReq();
    const allowed = await checkRateLimit(req, 'generation');
    expect(allowed).toBe(true);
  });

  it('blocks requests that exceed the limit', async () => {
    const req = mockReq('10.0.0.1');
    const limit = LIMIT_CONFIG.generation.requests; // 10

    for (let i = 0; i < limit; i++) {
      const result = await checkRateLimit(req, 'generation');
      expect(result).toBe(true);
    }

    // The 11th request should be blocked
    const blocked = await checkRateLimit(req, 'generation');
    expect(blocked).toBe(false);
  });

  it('returns true for unknown limit types', async () => {
    const req = mockReq();
    const result = await checkRateLimit(req, 'unknown-type');
    expect(result).toBe(true);
  });

  it('tracks limits independently per IP', async () => {
    const req1 = mockReq('10.0.0.1');
    const req2 = mockReq('10.0.0.2');
    const limit = LIMIT_CONFIG.generation.requests;

    // Exhaust IP 1
    for (let i = 0; i < limit; i++) {
      await checkRateLimit(req1, 'generation');
    }
    expect(await checkRateLimit(req1, 'generation')).toBe(false);

    // IP 2 should still be allowed
    expect(await checkRateLimit(req2, 'generation')).toBe(true);
  });

  it('tracks limits independently per endpoint', async () => {
    const req = mockReq('10.0.0.3');
    const limit = LIMIT_CONFIG.generation.requests;

    // Exhaust generation limit
    for (let i = 0; i < limit; i++) {
      await checkRateLimit(req, 'generation');
    }
    expect(await checkRateLimit(req, 'generation')).toBe(false);

    // Council limit should be unaffected
    expect(await checkRateLimit(req, 'council')).toBe(true);
  });
});

// -----------------------------------------------------------------------
// rateLimit (enhanced API)
// -----------------------------------------------------------------------

describe('rateLimit', () => {
  it('returns structured result with limit metadata', async () => {
    const req = mockReq();
    const result = await rateLimit(req, 'semantic-match');

    expect(result).toEqual(
      expect.objectContaining({
        allowed: true,
        limit: 100,
        remaining: expect.any(Number),
        reset: expect.any(Number),
      }),
    );
    expect(result.remaining).toBe(99);
  });

  it('decrements remaining on each call', async () => {
    const req = mockReq('10.0.0.10');

    const first = await rateLimit(req, 'council');
    expect(first.remaining).toBe(19);

    const second = await rateLimit(req, 'council');
    expect(second.remaining).toBe(18);
  });

  it('returns allowed=false when exhausted', async () => {
    const req = mockReq('10.0.0.11');
    const limit = LIMIT_CONFIG.generation.requests;

    for (let i = 0; i < limit; i++) {
      await rateLimit(req, 'generation');
    }

    const result = await rateLimit(req, 'generation');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

// -----------------------------------------------------------------------
// rateLimitResponse
// -----------------------------------------------------------------------

describe('rateLimitResponse', () => {
  it('returns a 429 response with proper headers', async () => {
    const req = mockReq('10.0.0.20');
    const limit = LIMIT_CONFIG.generation.requests;

    // Exhaust
    for (let i = 0; i < limit; i++) {
      await rateLimit(req, 'generation');
    }

    const result = await rateLimit(req, 'generation');
    const res = rateLimitResponse(result);

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy();

    const body = await res.json();
    expect(body.error).toBe('Too Many Requests');
    expect(typeof body.retryAfter).toBe('number');
  });
});

// -----------------------------------------------------------------------
// withRateLimitHeaders
// -----------------------------------------------------------------------

describe('withRateLimitHeaders', () => {
  it('attaches rate limit headers to an existing response', async () => {
    const { NextResponse } = await import('next/server');
    const result = await rateLimit(mockReq(), 'semantic-match');
    const res = NextResponse.json({ ok: true });
    const enhanced = withRateLimitHeaders(res, result);

    expect(enhanced.headers.get('X-RateLimit-Limit')).toBe('100');
    expect(enhanced.headers.get('X-RateLimit-Remaining')).toBeTruthy();
    expect(enhanced.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });
});

// -----------------------------------------------------------------------
// LIMIT_CONFIG
// -----------------------------------------------------------------------

describe('LIMIT_CONFIG', () => {
  it('has correct defaults for all endpoints', () => {
    expect(LIMIT_CONFIG['semantic-match']).toEqual({ requests: 100, window: '1 h' });
    expect(LIMIT_CONFIG.council).toEqual({ requests: 20, window: '1 h' });
    expect(LIMIT_CONFIG.generation).toEqual({ requests: 10, window: '1 m' });
  });
});
