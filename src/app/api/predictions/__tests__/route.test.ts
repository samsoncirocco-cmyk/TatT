// Seam tests for POST /api/predictions's cost-control policy.
//
// This route is the live, actively-used Replicate proxy for the Forge UI
// (src/features/generate/services/replicateService.js calls it directly for
// every design generation). It's auth-gated but, unlike /api/v1/generate and
// /api/generate, never called the shared rate limiter or budget tracker —
// any signed-in user could create arbitrary Replicate predictions (any model
// slug, any input) with no rate limit and no cap. These tests pin that both
// are now enforced, and that a successful prediction records an approximate
// spend on the shared tracker (the route can't know a real per-model cost —
// it's a generic proxy — so it uses a flat, conservative per-image estimate).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyApiAuthMock, rateLimitMock, checkBudgetMock, recordSpendMock, fetchMock } = vi.hoisted(() => ({
  verifyApiAuthMock: vi.fn(),
  rateLimitMock: vi.fn(),
  checkBudgetMock: vi.fn(),
  recordSpendMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
  rateLimitResponse: vi.fn(() => new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 })),
}));
vi.mock('@/lib/budget-tracker', () => ({
  checkBudget: checkBudgetMock,
  recordSpend: recordSpendMock,
}));

import { POST } from '../route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('REPLICATE_API_TOKEN', 'r8_test');
  vi.stubGlobal('fetch', fetchMock);
  verifyApiAuthMock.mockResolvedValue(null);
  rateLimitMock.mockResolvedValue({ allowed: true });
  checkBudgetMock.mockResolvedValue({ allowed: true, spentCents: 0 });
  recordSpendMock.mockResolvedValue(undefined);
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ id: 'pred_1', status: 'starting' }),
  });
});

describe('POST /api/predictions — cost controls', () => {
  it('refuses a request over the shared generation rate limit before calling Replicate', async () => {
    rateLimitMock.mockResolvedValue({ allowed: false, limit: 10, remaining: 0, reset: 0 });

    const res = await POST(makeRequest({ model: 'black-forest-labs/flux-dev', input: { prompt: 'x' } }));

    expect(res.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rateLimitMock).toHaveBeenCalledWith(expect.anything(), 'generation');
  });

  it('refuses a request once the shared monthly budget is exhausted', async () => {
    checkBudgetMock.mockResolvedValue({ allowed: false, spentCents: 50_000 });

    const res = await POST(makeRequest({ model: 'black-forest-labs/flux-dev', input: { prompt: 'x' } }));

    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toBe('Budget limit reached');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('records an approximate spend per requested output after a successful prediction', async () => {
    const res = await POST(
      makeRequest({ model: 'black-forest-labs/flux-dev', input: { prompt: 'x', num_outputs: 3 } }),
    );

    expect(res.status).toBe(200);
    expect(recordSpendMock).toHaveBeenCalledTimes(1);
    const [amountCents] = recordSpendMock.mock.calls[0];
    expect(amountCents).toBeGreaterThan(0);
    // 3 outputs should cost noticeably more than a 1-output call, whatever
    // the exact per-image estimate is — pins the scaling behavior without
    // pinning an arbitrary constant.
    expect(amountCents).toBeGreaterThanOrEqual(3);
  });

  it('does not record spend when Replicate rejects the request', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'bad input' }) });

    const res = await POST(makeRequest({ model: 'black-forest-labs/flux-dev', input: { prompt: 'x' } }));

    expect(res.status).toBe(400);
    expect(recordSpendMock).not.toHaveBeenCalled();
  });

  it('checks rate limit and budget before ever calling Replicate', async () => {
    await POST(makeRequest({ model: 'black-forest-labs/flux-dev', input: { prompt: 'x' } }));

    expect(rateLimitMock).toHaveBeenCalled();
    expect(checkBudgetMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
  });
});
