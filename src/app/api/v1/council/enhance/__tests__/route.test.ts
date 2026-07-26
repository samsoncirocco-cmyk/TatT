// Seam tests for POST /api/v1/council/enhance's cost-control policy.
//
// This route calls the Council module (Vertex Gemini, ~$0.02/request per
// CLAUDE.md's cost table). It's auth-gated but — unlike /api/v1/council/generate,
// which already has both — never called the shared rate limiter or budget
// tracker. The route's own comments admit the gap: "The express route also
// had rate limiting" (i.e. it was dropped when this route was ported from
// the old Express proxy). These tests pin that both are now enforced.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { enhanceMock, verifyApiAuthMock, rateLimitMock, checkBudgetMock, recordSpendMock } = vi.hoisted(() => ({
  enhanceMock: vi.fn(),
  verifyApiAuthMock: vi.fn(),
  rateLimitMock: vi.fn(),
  checkBudgetMock: vi.fn(),
  recordSpendMock: vi.fn(),
}));

vi.mock('@/services/council', () => ({ enhance: enhanceMock }));
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
  return new NextRequest('http://localhost/api/v1/council/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyApiAuthMock.mockResolvedValue(null);
  rateLimitMock.mockResolvedValue({ allowed: true });
  checkBudgetMock.mockResolvedValue({ allowed: true, spentCents: 0 });
  recordSpendMock.mockResolvedValue(undefined);
  enhanceMock.mockResolvedValue({
    prompts: { simple: 'a', detailed: 'b', ultra: 'c' },
    metadata: { model: 'gemini', councilMembers: ['creative'] },
  });
});

describe('POST /api/v1/council/enhance — cost controls', () => {
  it('refuses a request over the shared council rate limit before calling enhance()', async () => {
    rateLimitMock.mockResolvedValue({ allowed: false, limit: 20, remaining: 0, reset: 0 });

    const res = await POST(makeRequest({ user_prompt: 'a dragon wraps the forearm' }));

    expect(res.status).toBe(429);
    expect(enhanceMock).not.toHaveBeenCalled();
    expect(rateLimitMock).toHaveBeenCalledWith(expect.anything(), 'council');
  });

  it('refuses a request once the shared monthly budget is exhausted', async () => {
    checkBudgetMock.mockResolvedValue({ allowed: false, spentCents: 50_000 });

    const res = await POST(makeRequest({ user_prompt: 'a dragon wraps the forearm' }));

    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toBe('Budget limit reached');
    expect(enhanceMock).not.toHaveBeenCalled();
  });

  it('records spend on the shared budget tracker after a successful enhancement', async () => {
    const res = await POST(makeRequest({ user_prompt: 'a dragon wraps the forearm' }));

    expect(res.status).toBe(200);
    expect(recordSpendMock).toHaveBeenCalledTimes(1);
    expect(recordSpendMock.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it('checks rate limit and budget before ever calling enhance()', async () => {
    await POST(makeRequest({ user_prompt: 'a dragon wraps the forearm' }));

    expect(rateLimitMock).toHaveBeenCalled();
    expect(checkBudgetMock).toHaveBeenCalled();
    expect(enhanceMock).toHaveBeenCalled();
  });
});
