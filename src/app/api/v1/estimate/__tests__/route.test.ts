// Seam test for POST /api/v1/estimate's budget policy on the AI path.
//
// This route already had a rate limit ('estimate') but never checked the
// shared monthly budget before calling Vertex Gemini vision for a full
// analysis. The `quick` path is a deliberate no-AI fallback (its own
// comment: "for rate-limited users or fast response") and must keep working
// even when the budget is exhausted, so the budget check only guards the
// AI (`estimateCost`) branch, not `quickEstimate`.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyApiAuthMock, rateLimitMock, checkBudgetMock, recordSpendMock, estimateCostMock, quickEstimateMock } =
  vi.hoisted(() => ({
    verifyApiAuthMock: vi.fn(),
    rateLimitMock: vi.fn(),
    checkBudgetMock: vi.fn(),
    recordSpendMock: vi.fn(),
    estimateCostMock: vi.fn(),
    quickEstimateMock: vi.fn(),
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
vi.mock('@/services/costEstimatorService', () => ({
  estimateCost: estimateCostMock,
  quickEstimate: quickEstimateMock,
}));

import { POST } from '../route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/v1/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const RESULT = { priceRange: { low: 100, mid: 200, high: 300 }, confidence: 'medium' };

beforeEach(() => {
  vi.clearAllMocks();
  verifyApiAuthMock.mockResolvedValue(null);
  rateLimitMock.mockResolvedValue({ allowed: true });
  checkBudgetMock.mockResolvedValue({ allowed: true, spentCents: 0 });
  recordSpendMock.mockResolvedValue(undefined);
  estimateCostMock.mockResolvedValue(RESULT);
  quickEstimateMock.mockReturnValue(RESULT);
});

describe('POST /api/v1/estimate — budget policy', () => {
  it('refuses a full AI estimate once the shared monthly budget is exhausted', async () => {
    checkBudgetMock.mockResolvedValue({ allowed: false, spentCents: 50_000 });

    const res = await POST(makeRequest({ prompt: 'a dragon tattoo' }));

    expect(res.status).toBe(402);
    expect(estimateCostMock).not.toHaveBeenCalled();
  });

  it('records spend on the shared tracker after a successful AI estimate', async () => {
    const res = await POST(makeRequest({ prompt: 'a dragon tattoo' }));

    expect(res.status).toBe(200);
    expect(recordSpendMock).toHaveBeenCalledTimes(1);
    expect(recordSpendMock.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it('still serves a quick estimate even when the budget is exhausted', async () => {
    checkBudgetMock.mockResolvedValue({ allowed: false, spentCents: 50_000 });

    const res = await POST(makeRequest({ prompt: 'a dragon tattoo', quick: true }));

    expect(res.status).toBe(200);
    expect(quickEstimateMock).toHaveBeenCalled();
    expect(estimateCostMock).not.toHaveBeenCalled();
    expect(recordSpendMock).not.toHaveBeenCalled();
  });
});
