// Seam tests for POST /api/v1/design-session/[id]/critique (ADR-0039):
// designSession service mocked; pins the response shape, and above all that
// spend is recorded ONLY when the service says a render actually ran — a
// chatter turn or a spent allowance must never be billed.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { makeRequest, makeSession, routeParams } from './helpers';

const {
  critiqueMock,
  recordSpendMock,
  checkBudgetMock,
  rateLimitMock,
  rateLimitResponseMock,
  verifyApiAuthMock,
} = vi.hoisted(() => ({
  critiqueMock: vi.fn(),
  recordSpendMock: vi.fn(),
  checkBudgetMock: vi.fn(),
  rateLimitMock: vi.fn(),
  rateLimitResponseMock: vi.fn(),
  verifyApiAuthMock: vi.fn(),
}));

vi.mock('@/services/designSession', () => ({
  startSession: vi.fn(),
  recordPick: vi.fn(),
  refine: vi.fn(),
  critique: critiqueMock,
  getSession: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
  rateLimitResponse: rateLimitResponseMock,
}));

vi.mock('@/lib/budget-tracker', () => ({
  checkBudget: checkBudgetMock,
  recordSpend: recordSpendMock,
  VERTEX_IMAGEN_COST_CENTS: 4,
}));

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({ start: vi.fn(), complete: vi.fn(), error: vi.fn() }),
}));

import { POST } from '../[id]/critique/route';

const URL = 'http://localhost/api/v1/design-session/sess-1/critique';

function generatedResult() {
  return {
    session: makeSession({
      critiqueCuts: [
        { id: 'var-1-fix1', axisPosition: {}, prompt: 'recut', imageUrl: 'https://img/fix.png' },
      ],
      fixesUsed: 1,
    }),
    reply: 're-cut cut one with that. have a look.',
    cut: { id: 'var-1-fix1', axisPosition: {}, prompt: 'recut', imageUrl: 'https://img/fix.png' },
    fixesRemaining: 5,
    exhausted: false,
    generated: true,
  };
}

describe('POST /api/v1/design-session/[id]/critique route adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    verifyApiAuthMock.mockResolvedValue(null);
    rateLimitMock.mockResolvedValue({ allowed: true });
    checkBudgetMock.mockResolvedValue({ allowed: true, spentCents: 0 });
    recordSpendMock.mockResolvedValue(undefined);
  });

  it('returns the reply, the new cut, and what is left of the allowance', async () => {
    critiqueMock.mockResolvedValue(generatedResult());

    const res = await POST(
      makeRequest(URL, { message: "  the first one, riku's missing  " }),
      routeParams('sess-1')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.reply).toContain('re-cut');
    expect(body.cut.id).toBe('var-1-fix1');
    expect(body.fixesRemaining).toBe(5);
    // The message reaches the service trimmed.
    expect(critiqueMock).toHaveBeenCalledWith('sess-1', { message: "the first one, riku's missing" });
  });

  it('records exactly one image of spend when a render ran', async () => {
    critiqueMock.mockResolvedValue(generatedResult());

    await POST(makeRequest(URL, { message: 'too busy' }), routeParams('sess-1'));

    expect(recordSpendMock).toHaveBeenCalledTimes(1);
    expect(recordSpendMock).toHaveBeenCalledWith(4);
  });

  it('records NO spend when the turn rendered nothing', async () => {
    critiqueMock.mockResolvedValue({
      session: makeSession(),
      reply: 'still here — tell me what’s wrong with it and i’ll re-cut.',
      fixesRemaining: 6,
      exhausted: false,
      generated: false,
    });

    const res = await POST(makeRequest(URL, { message: 'love it' }), routeParams('sess-1'));

    expect(res.status).toBe(200);
    expect(recordSpendMock).not.toHaveBeenCalled();
  });

  it('rejects an empty message before touching the service', async () => {
    const res = await POST(makeRequest(URL, { message: '   ' }), routeParams('sess-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('INVALID_MESSAGE');
    expect(critiqueMock).not.toHaveBeenCalled();
  });

  it('refuses over budget with 402 and never renders', async () => {
    checkBudgetMock.mockResolvedValue({ allowed: false, spentCents: 50_000 });

    const res = await POST(makeRequest(URL, { message: 'too busy' }), routeParams('sess-1'));

    expect(res.status).toBe(402);
    expect(critiqueMock).not.toHaveBeenCalled();
  });

  it('honours the generation rate limit', async () => {
    rateLimitMock.mockResolvedValue({ allowed: false });
    rateLimitResponseMock.mockReturnValue(NextResponse.json({ error: 'slow down' }, { status: 429 }));

    const res = await POST(makeRequest(URL, { message: 'too busy' }), routeParams('sess-1'));

    expect(res.status).toBe(429);
    expect(rateLimitMock).toHaveBeenCalledWith(expect.anything(), 'generation');
    expect(critiqueMock).not.toHaveBeenCalled();
  });

  it('maps the ADR-0013 hard stop to 409', async () => {
    critiqueMock.mockRejectedValue(
      Object.assign(new Error('This session already closed with its Brief'), {
        code: 'INVALID_PHASE',
        status: 409,
      })
    );

    const res = await POST(makeRequest(URL, { message: 'too busy' }), routeParams('sess-1'));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('INVALID_PHASE');
    expect(recordSpendMock).not.toHaveBeenCalled();
  });

  it('skips policy and spend entirely in demo mode', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    critiqueMock.mockResolvedValue(generatedResult());

    const res = await POST(makeRequest(URL, { message: 'too busy' }), routeParams('sess-1'));

    expect(res.status).toBe(200);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(checkBudgetMock).not.toHaveBeenCalled();
    expect(recordSpendMock).not.toHaveBeenCalled();
  });
});
