// Seam tests for the /api/v1/generate route adapter: the generation module is
// mocked at its public entry point; these tests pin the route's policy
// (spend recording, error mapping) and its response shapes.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { generateMock, recordSpendMock, checkBudgetMock, rateLimitMock, verifyApiAuthMock } = vi.hoisted(() => ({
  generateMock: vi.fn(),
  recordSpendMock: vi.fn(),
  checkBudgetMock: vi.fn(),
  rateLimitMock: vi.fn(),
  verifyApiAuthMock: vi.fn()
}));

vi.mock('@/services/generation', () => ({
  generate: generateMock
}));

vi.mock('@/lib/api-auth', () => ({
  verifyApiAuth: verifyApiAuthMock
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
  rateLimitResponse: vi.fn()
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

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/v1/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function vertexResult(imageCount = 2) {
  return {
    images: Array.from({ length: imageCount }, (_, i) => `data:image/png;base64,img${i}`),
    metadata: {
      model: 'imagen-3.0-generate-001',
      provider: 'vertex-ai',
      generatedAt: '2026-07-20T00:00:00.000Z',
      durationMs: 1234,
      attempts: 1,
      safetyFilterLevel: 'block_only_high',
      personGeneration: 'allow_adult',
      seed: 42,
      fallbackUsed: false
    }
  };
}

describe('/api/v1/generate route adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyApiAuthMock.mockResolvedValue(null);
    rateLimitMock.mockResolvedValue({ allowed: true });
    checkBudgetMock.mockResolvedValue({ allowed: true });
    recordSpendMock.mockResolvedValue(undefined);
  });

  it('returns the vertex success shape and records vertex spend per image', async () => {
    generateMock.mockResolvedValueOnce(vertexResult(2));

    const res = await POST(makeRequest({
      prompt: 'dragon tattoo',
      sampleCount: 2,
      style: 'realism',
      bodyPart: 'forearm'
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.images).toHaveLength(2);
    expect(json.metadata).toMatchObject({
      prompt: 'dragon tattoo',
      model: 'imagen-3.0-generate-001',
      provider: 'vertex-ai',
      style: 'realism',
      bodyPart: 'forearm',
      aspectRatio: '1:1',
      outputFormat: 'png',
      durationMs: 1234,
      attempts: 1,
      safetyFilterLevel: 'block_only_high',
      personGeneration: 'allow_adult',
      seed: 42,
      fallbackUsed: false
    });

    // Vertex spend: cents-per-image * images generated.
    expect(recordSpendMock).toHaveBeenCalledWith(4 * 2);

    // The route is a thin adapter: explicit model + retry/safety policy.
    expect(generateMock).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'dragon tattoo',
      numImages: 2,
      modelId: 'imagen3',
      retry: { maxRetries: 2, baseDelayMs: 400 },
      fallback: { safetyFilterLevel: 'block_only_high' }
    }));
  });

  it('returns the replicate fallback shape and records flat fallback spend', async () => {
    generateMock.mockResolvedValueOnce({
      images: ['https://replicate.delivery/out.png'],
      metadata: {
        model: 'sdxl',
        provider: 'replicate',
        generatedAt: '2026-07-20T00:00:00.000Z',
        durationMs: 2000,
        attempts: 1,
        fallbackUsed: true,
        fallbackReason: 'VERTEX_QUOTA_EXCEEDED'
      }
    });

    const res = await POST(makeRequest({ prompt: 'koi fish tattoo' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.images).toEqual(['https://replicate.delivery/out.png']);
    expect(json.metadata).toMatchObject({
      prompt: 'koi fish tattoo',
      model: 'sdxl',
      provider: 'replicate',
      fallback: true,
      fallbackReason: 'VERTEX_QUOTA_EXCEEDED'
    });

    // Flat ~1 cent for a replicate fallback result.
    expect(recordSpendMock).toHaveBeenCalledWith(1);
  });

  it('maps VERTEX_QUOTA_EXCEEDED module errors to a 429', async () => {
    const quotaError = Object.assign(new Error('Vertex AI daily request quota exceeded'), {
      code: 'VERTEX_QUOTA_EXCEEDED',
      status: 429,
      details: { limit: 100 }
    });
    generateMock.mockRejectedValueOnce(quotaError);

    const res = await POST(makeRequest({ prompt: 'rose tattoo' }));

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json).toMatchObject({
      error: 'Vertex AI quota exceeded',
      code: 'VERTEX_QUOTA_EXCEEDED',
      details: { limit: 100 }
    });
    expect(recordSpendMock).not.toHaveBeenCalled();
  });

  it('rejects a missing/short prompt with 400 before calling the module', async () => {
    const res = await POST(makeRequest({ prompt: 'ab' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('INVALID_PROMPT');
    expect(generateMock).not.toHaveBeenCalled();
    expect(recordSpendMock).not.toHaveBeenCalled();
  });
});
