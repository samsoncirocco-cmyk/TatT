// Seam tests for GET /api/v1/design-session/[id]: designSession service
// mocked; pins the read shape, the null → 404 mapping, and the auth gate.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { makeGetRequest, makeSession, routeParams } from './helpers';

const { getSessionMock, rateLimitMock, rateLimitResponseMock, verifyApiAuthMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  rateLimitMock: vi.fn(),
  rateLimitResponseMock: vi.fn(),
  verifyApiAuthMock: vi.fn()
}));

vi.mock('@/services/designSession', () => ({
  startSession: vi.fn(),
  recordPick: vi.fn(),
  refine: vi.fn(),
  getSession: getSessionMock
}));

vi.mock('@/lib/api-auth', () => ({
  verifyApiAuth: verifyApiAuthMock
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
  rateLimitResponse: rateLimitResponseMock
}));

vi.mock('@/lib/budget-tracker', () => ({
  checkBudget: vi.fn(),
  recordSpend: vi.fn(),
  VERTEX_IMAGEN_COST_CENTS: 4
}));

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    start: vi.fn(),
    complete: vi.fn(),
    error: vi.fn()
  })
}));

import { GET } from '../[id]/route';

const URL = 'http://localhost/api/v1/design-session/sess-1';

describe('GET /api/v1/design-session/[id] route adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyApiAuthMock.mockResolvedValue(null);
    rateLimitMock.mockResolvedValue({ allowed: true });
  });

  it('returns the session', async () => {
    getSessionMock.mockResolvedValueOnce(makeSession());

    const res = await GET(makeGetRequest(URL), routeParams('sess-1'));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.session).toMatchObject({ id: 'sess-1', phase: 'revealed', provider: 'vertex-ai' });
    expect(getSessionMock).toHaveBeenCalledWith('sess-1');
  });

  it('returns 404 for an unknown session', async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await GET(
      makeGetRequest('http://localhost/api/v1/design-session/nope'),
      routeParams('nope')
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe('SESSION_NOT_FOUND');
  });

  it('also maps a thrown SESSION_NOT_FOUND to 404', async () => {
    getSessionMock.mockRejectedValueOnce(Object.assign(new Error('gone'), { code: 'SESSION_NOT_FOUND' }));

    const res = await GET(makeGetRequest(URL), routeParams('sess-1'));

    expect(res.status).toBe(404);
  });

  it('returns the auth failure untouched and never reaches the service', async () => {
    const denied = NextResponse.json({ error: 'Authorization header required', code: 'AUTH_REQUIRED' }, { status: 401 });
    verifyApiAuthMock.mockResolvedValueOnce(denied);

    const res = await GET(makeGetRequest(URL), routeParams('sess-1'));

    expect(res.status).toBe(401);
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  // Setup runs inside the try, so a throwing dependency lands on the shared
  // structured envelope instead of escaping as an unstructured Next.js 500.
  it('returns the structured envelope when auth setup throws', async () => {
    verifyApiAuthMock.mockRejectedValueOnce(new Error('Firebase admin not configured'));

    const res = await GET(makeGetRequest(URL), routeParams('sess-1'));

    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ code: 'DESIGN_SESSION_FAILED', retryable: false });
    expect(getSessionMock).not.toHaveBeenCalled();
  });
});
