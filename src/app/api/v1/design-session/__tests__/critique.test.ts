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
  verifyFirebaseTokenMock,
  reserveGenerationCreditMock,
  releaseGenerationCreditMock,
} = vi.hoisted(() => ({
  critiqueMock: vi.fn(),
  recordSpendMock: vi.fn(),
  checkBudgetMock: vi.fn(),
  rateLimitMock: vi.fn(),
  rateLimitResponseMock: vi.fn(),
  verifyApiAuthMock: vi.fn(),
  verifyFirebaseTokenMock: vi.fn(),
  reserveGenerationCreditMock: vi.fn(),
  releaseGenerationCreditMock: vi.fn(),
}));

vi.mock('@/services/designSession', () => ({
  startSession: vi.fn(),
  recordPick: vi.fn(),
  refine: vi.fn(),
  critique: critiqueMock,
  getSession: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));
vi.mock('@/lib/auth-dal', () => ({ verifyFirebaseToken: verifyFirebaseTokenMock }));
vi.mock('@/lib/generation-credits', () => ({
  reserveGenerationCredit: reserveGenerationCreditMock,
  releaseGenerationCredit: releaseGenerationCreditMock,
  GenerationCreditsExhaustedError: class GenerationCreditsExhaustedError extends Error {},
}));

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
    verifyFirebaseTokenMock.mockResolvedValue({ uid: 'uid_customer' });
    reserveGenerationCreditMock.mockResolvedValue({ id: 'res-9' });
    releaseGenerationCreditMock.mockResolvedValue(undefined);
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
    expect(critiqueMock).toHaveBeenCalledWith(
      'sess-1',
      { message: "the first one, riku's missing" },
      { roundCredit: expect.objectContaining({ reserve: expect.any(Function), release: expect.any(Function) }) }
    );
  });

  /*
   * Spend moved into the service (TAT-57 durability): it is recorded the
   * moment the provider answers, so a render that is paid for and then fails
   * to store is still billed. The route must therefore NOT bill as well —
   * these two assert the route stays out of it, in both directions. Billing
   * here again would double-charge every re-cut.
   */
  it('leaves billing to the service when a render ran', async () => {
    critiqueMock.mockResolvedValue(generatedResult());

    await POST(makeRequest(URL, { message: 'too busy' }), routeParams('sess-1'));

    expect(recordSpendMock).not.toHaveBeenCalled();
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

  it('serves a tokenless caller every free arm, with NO port and no new gate', async () => {
    // The money gate is scoped to the reroll-set arm, not the route: a
    // caller who legitimately critiqued without a decodable uid before
    // still can — the service simply gets no port, so chatter and per-cut
    // fixes run untouched and only a fresh-set ask is refused in voice
    // (at 200, inside the service). Never a 401 here.
    verifyFirebaseTokenMock.mockResolvedValue(null);
    critiqueMock.mockResolvedValue(generatedResult());

    const res = await POST(makeRequest(URL, { message: 'the first one, too busy' }), routeParams('sess-1'));

    expect(res.status).toBe(200);
    expect((await res.json()).cut.id).toBe('var-1-fix1');
    expect(critiqueMock).toHaveBeenCalledWith(
      'sess-1',
      { message: 'the first one, too busy' },
      undefined
    );
    expect(reserveGenerationCreditMock).not.toHaveBeenCalled();
  });

  it('treats a bearer that fails to decode the same as no uid — free arms still served', async () => {
    verifyFirebaseTokenMock.mockRejectedValue(new Error('malformed token'));
    critiqueMock.mockResolvedValue({
      session: makeSession(),
      reply: 'still here — tell me what’s wrong with it and i’ll re-cut.',
      fixesRemaining: 6,
      exhausted: false,
      generated: false,
    });

    const res = await POST(makeRequest(URL, { message: 'love it' }), routeParams('sess-1'));

    expect(res.status).toBe(200);
    const [, , opts] = critiqueMock.mock.calls[0];
    expect(opts).toBeUndefined();
    expect(reserveGenerationCreditMock).not.toHaveBeenCalled();
  });

  it('stands a per-user credit port behind the service — reserve and honest release', async () => {
    // The service calls the port only on a reroll-set turn; the route's job
    // is that reserve/release are wired to THIS uid's meter and that release
    // reports the truth (false when the refund did not land).
    critiqueMock.mockResolvedValue(generatedResult());
    await POST(makeRequest(URL, { message: 'new ones' }), routeParams('sess-1'));

    const [, , opts] = critiqueMock.mock.calls[0];
    const reservation = await opts.roundCredit.reserve();
    expect(reserveGenerationCreditMock).toHaveBeenCalledWith('uid_customer');
    expect(reservation).toEqual({ id: 'res-9' });

    await expect(opts.roundCredit.release(reservation)).resolves.toBe(true);
    expect(releaseGenerationCreditMock).toHaveBeenCalledWith('uid_customer', { id: 'res-9' });

    releaseGenerationCreditMock.mockRejectedValueOnce(new Error('firestore down'));
    await expect(opts.roundCredit.release(reservation)).resolves.toBe(false);
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
