// Seam test for POST /api/v1/embeddings/generate's budget policy.
//
// This route already had a rate limit ('default') but never checked the
// shared monthly budget before calling Vertex's multimodal embedding model —
// a real (if small) paid call with no cap.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { verifyApiAuthMock, rateLimitMock, checkBudgetMock, recordSpendMock, generateEmbeddingMock, storeEmbeddingMock } =
  vi.hoisted(() => ({
    verifyApiAuthMock: vi.fn(),
    rateLimitMock: vi.fn(),
    checkBudgetMock: vi.fn(),
    recordSpendMock: vi.fn(),
    generateEmbeddingMock: vi.fn(),
    storeEmbeddingMock: vi.fn(),
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
vi.mock('@/services/vertex-ai-service.js', () => ({ generateEmbedding: generateEmbeddingMock }));
vi.mock('@/services/vectorDbService', () => ({ storeEmbedding: storeEmbeddingMock }));

import { POST } from '../route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/v1/embeddings/generate', {
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
  generateEmbeddingMock.mockResolvedValue(new Array(768).fill(0.1));
  storeEmbeddingMock.mockResolvedValue({ id: 'row_1' });
});

describe('POST /api/v1/embeddings/generate — budget policy', () => {
  it('refuses a request once the shared monthly budget is exhausted', async () => {
    checkBudgetMock.mockResolvedValue({ allowed: false, spentCents: 50_000 });

    const res = await POST(makeRequest({ artistId: 'artist_1', imageUrls: ['https://img/1.png'] }));

    expect(res.status).toBe(402);
    expect(generateEmbeddingMock).not.toHaveBeenCalled();
  });

  it('records spend on the shared tracker after a successful embedding', async () => {
    const res = await POST(makeRequest({ artistId: 'artist_1', imageUrls: ['https://img/1.png'] }));

    expect(res.status).toBe(200);
    expect(recordSpendMock).toHaveBeenCalledTimes(1);
    expect(recordSpendMock.mock.calls[0][0]).toBeGreaterThan(0);
  });
});
