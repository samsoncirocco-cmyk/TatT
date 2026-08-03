// Seam tests for POST /api/v1/design-session: the designSession service is
// mocked at its public entry point; these tests pin the route's policy
// (auth gate, budget, spend recording, validation, demo mode) and shapes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { makeRequest, makeSession } from './helpers';

const { startSessionMock, recordSpendMock, checkBudgetMock, rateLimitMock, rateLimitResponseMock, verifyApiAuthMock } = vi.hoisted(() => ({
  startSessionMock: vi.fn(),
  recordSpendMock: vi.fn(),
  checkBudgetMock: vi.fn(),
  rateLimitMock: vi.fn(),
  rateLimitResponseMock: vi.fn(),
  verifyApiAuthMock: vi.fn()
}));

vi.mock('@/services/designSession', () => ({
  startSession: startSessionMock,
  recordPick: vi.fn(),
  refine: vi.fn(),
  getSession: vi.fn()
}));

vi.mock('@/lib/api-auth', () => ({
  verifyApiAuth: verifyApiAuthMock
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
  rateLimitResponse: rateLimitResponseMock
}));

vi.mock('@/lib/budget-tracker', () => ({
  checkBudget: checkBudgetMock,
  recordSpend: recordSpendMock,
  VERTEX_IMAGEN_COST_CENTS: 4
}));

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    start: vi.fn(),
    complete: vi.fn(),
    error: vi.fn()
  })
}));

import { POST } from '../route';

const URL = 'http://localhost/api/v1/design-session';

describe('POST /api/v1/design-session route adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyApiAuthMock.mockResolvedValue(null);
    rateLimitMock.mockResolvedValue({ allowed: true });
    checkBudgetMock.mockResolvedValue({ allowed: true });
    recordSpendMock.mockResolvedValue(undefined);
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  it('returns the session and records vertex spend for the 4 reveal images', async () => {
    const session = makeSession();
    startSessionMock.mockResolvedValueOnce(session);

    const res = await POST(makeRequest(URL, {
      placementAnswer: '  inner forearm  ',
      meaningAnswer: 'for my grandmother'
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.session).toMatchObject({ id: 'sess-1', phase: 'revealed' });
    expect(json.session.variations).toHaveLength(4);

    // The route trims answers before handing them to the service.
    expect(startSessionMock).toHaveBeenCalledWith({
      placementAnswer: 'inner forearm',
      meaningAnswer: 'for my grandmother'
    });

    // Spend belongs to the service, which alone knows how many renders it
    // actually bought — the route must not add a second charge.
    expect(recordSpendMock).not.toHaveBeenCalled();
  });

  it('rejects a missing placementAnswer with 400 before calling the service', async () => {
    const res = await POST(makeRequest(URL, { meaningAnswer: 'memorial piece' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('INVALID_PLACEMENT_ANSWER');
    expect(startSessionMock).not.toHaveBeenCalled();
    expect(recordSpendMock).not.toHaveBeenCalled();
  });

  it('rejects a blank meaningAnswer with 400', async () => {
    const res = await POST(makeRequest(URL, { placementAnswer: 'forearm', meaningAnswer: '   ' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('INVALID_MEANING_ANSWER');
    expect(startSessionMock).not.toHaveBeenCalled();
  });

  it('returns the auth failure untouched and never reaches the service', async () => {
    const denied = NextResponse.json({ error: 'Authorization header required', code: 'AUTH_REQUIRED' }, { status: 401 });
    verifyApiAuthMock.mockResolvedValueOnce(denied);

    const res = await POST(makeRequest(URL, { placementAnswer: 'forearm', meaningAnswer: 'x y z' }));

    expect(res.status).toBe(401);
    expect(startSessionMock).not.toHaveBeenCalled();
  });

  // Setup runs inside the try, so a throwing dependency lands on the shared
  // structured envelope instead of escaping as an unstructured Next.js 500.
  it('returns the structured envelope when auth setup throws', async () => {
    verifyApiAuthMock.mockRejectedValueOnce(new Error('Firebase admin not configured'));

    const res = await POST(makeRequest(URL, { placementAnswer: 'forearm', meaningAnswer: 'x y z' }));

    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ code: 'DESIGN_SESSION_FAILED', retryable: false });
    expect(startSessionMock).not.toHaveBeenCalled();
  });

  it('returns 402 when the budget is exhausted', async () => {
    checkBudgetMock.mockResolvedValueOnce({ allowed: false, spentCents: 50_000, remainingCents: 0 });

    const res = await POST(makeRequest(URL, { placementAnswer: 'forearm', meaningAnswer: 'x y z' }));

    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json).toMatchObject({ error: 'Budget limit reached', spentCents: 50_000 });
    expect(startSessionMock).not.toHaveBeenCalled();
  });

  it('returns the rate-limit response when the limiter denies', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: false, limit: 10, remaining: 0, reset: 1 });
    rateLimitResponseMock.mockReturnValueOnce(
      NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    );

    const res = await POST(makeRequest(URL, { placementAnswer: 'forearm', meaningAnswer: 'x y z' }));

    expect(res.status).toBe(429);
    expect(startSessionMock).not.toHaveBeenCalled();
  });

  it('maps unknown service failures to 500 without recording spend', async () => {
    startSessionMock.mockRejectedValueOnce(Object.assign(new Error('council exploded'), { code: 'COUNCIL_FAILED' }));

    const res = await POST(makeRequest(URL, { placementAnswer: 'forearm', meaningAnswer: 'x y z' }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe('COUNCIL_FAILED');
    expect(recordSpendMock).not.toHaveBeenCalled();
  });

  it('demo mode delegates to the real service (persisted session) and skips rate/budget/spend', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    const session = makeSession();
    startSessionMock.mockResolvedValueOnce(session);

    const res = await POST(makeRequest(URL, { placementAnswer: '  wrist  ', meaningAnswer: 'my dog' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.session).toMatchObject({ id: 'sess-1', phase: 'revealed' });

    // The REAL service runs (and persists) — no fabricated session.
    expect(startSessionMock).toHaveBeenCalledWith({
      placementAnswer: 'wrist',
      meaningAnswer: 'my dog'
    });

    // Demo renders are free stock images: no rate/budget policy, no spend.
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(checkBudgetMock).not.toHaveBeenCalled();
    expect(recordSpendMock).not.toHaveBeenCalled();
  }, 10_000);

  it('demo mode still validates input with 400 before calling the service', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';

    const res = await POST(makeRequest(URL, { meaningAnswer: 'my dog' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('INVALID_PLACEMENT_ANSWER');
    expect(startSessionMock).not.toHaveBeenCalled();
  });
});
