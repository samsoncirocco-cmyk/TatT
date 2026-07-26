// Seam tests for the legacy /api/generate route's cost-control policy.
//
// Issue #181: this route is auth-gated (verifyApiAuth) but, unlike
// /api/v1/generate, never called the shared rate limiter or the shared
// budget tracker — any signed-in user could generate real, billable Vertex
// AI images with no rate limit and no cap. These tests pin that both are now
// enforced the same way /api/v1/generate enforces them, and that spend is
// recorded through the same shared tracker (not the route's own no-op-by-
// default enforceQuota, which stays as a secondary, non-blocking guard).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  generateMock,
  verifyApiAuthMock,
  rateLimitMock,
  checkBudgetMock,
  recordSpendMock,
  enforceQuotaMock,
  recordUsageMock,
  uploadGeneratedImagesMock,
  getUsageSnapshotMock,
} = vi.hoisted(() => ({
  generateMock: vi.fn(),
  verifyApiAuthMock: vi.fn(),
  rateLimitMock: vi.fn(),
  checkBudgetMock: vi.fn(),
  recordSpendMock: vi.fn(),
  enforceQuotaMock: vi.fn(),
  recordUsageMock: vi.fn(),
  uploadGeneratedImagesMock: vi.fn(),
  getUsageSnapshotMock: vi.fn(),
}));

vi.mock('@/services/generation', () => ({ generate: generateMock }));
vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
  rateLimitResponse: vi.fn(() => new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 })),
}));
vi.mock('@/lib/budget-tracker', () => ({
  checkBudget: checkBudgetMock,
  recordSpend: recordSpendMock,
  VERTEX_IMAGEN_COST_CENTS: 4,
}));
vi.mock('../imagen-upload', () => ({
  enforceQuota: enforceQuotaMock,
  recordUsage: recordUsageMock,
  uploadGeneratedImages: uploadGeneratedImagesMock,
  getUsageSnapshot: getUsageSnapshotMock,
}));

import { POST } from '../route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function vertexResult(imageCount = 1) {
  return {
    images: Array.from({ length: imageCount }, (_, i) => `data:image/png;base64,img${i}`),
    metadata: { model: 'imagen-3.0-generate-001', provider: 'vertex-ai' },
  };
}

describe('/api/generate — cost controls (issue #181)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyApiAuthMock.mockResolvedValue(null);
    rateLimitMock.mockResolvedValue({ allowed: true });
    checkBudgetMock.mockResolvedValue({ allowed: true, spentCents: 0 });
    recordSpendMock.mockResolvedValue(undefined);
    uploadGeneratedImagesMock.mockResolvedValue({ urls: ['https://gcs/img.png'], uploads: [] });
    getUsageSnapshotMock.mockReturnValue({ costPerImage: 0.04 });
    generateMock.mockResolvedValue(vertexResult());
  });

  it('refuses a request over the shared generation rate limit before generating', async () => {
    rateLimitMock.mockResolvedValue({ allowed: false, limit: 10, remaining: 0, reset: 0 });

    const res = await POST(makeRequest({ prompt: 'a dragon tattoo' }));

    expect(res.status).toBe(429);
    expect(generateMock).not.toHaveBeenCalled();
    expect(rateLimitMock).toHaveBeenCalledWith(expect.anything(), 'generation');
  });

  it('refuses a request once the shared monthly budget is exhausted', async () => {
    checkBudgetMock.mockResolvedValue({ allowed: false, spentCents: 50_000 });

    const res = await POST(makeRequest({ prompt: 'a dragon tattoo' }));

    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toBe('Budget limit reached');
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('records real spend on the shared budget tracker after a successful generation', async () => {
    generateMock.mockResolvedValue(vertexResult(3));

    const res = await POST(makeRequest({ prompt: 'a dragon tattoo', sampleCount: 3 }));

    expect(res.status).toBe(200);
    expect(recordSpendMock).toHaveBeenCalledWith(4 * 3);
  });

  it('checks rate limit and budget before the route-local enforceQuota/generate call', async () => {
    await POST(makeRequest({ prompt: 'a dragon tattoo' }));

    expect(rateLimitMock).toHaveBeenCalled();
    expect(checkBudgetMock).toHaveBeenCalled();
    expect(enforceQuotaMock).toHaveBeenCalled();
    expect(generateMock).toHaveBeenCalled();
  });
});
