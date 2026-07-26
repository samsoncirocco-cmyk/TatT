// Seam tests for POST /api/v1/layers/decompose's cost-control policy.
//
// This route calls Vertex Vision API (object detection) and, per detected
// object (up to 5), a Replicate SAM segmentation call — real money on two
// providers, in one request. It's auth-gated but had neither a rate limit
// nor a budget check at all. Everything except the cost-control seam is
// mocked out (sharp, Vision, GCS upload, segmentation) since that's this
// fix's whole scope.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  verifyApiAuthMock,
  rateLimitMock,
  checkBudgetMock,
  recordSpendMock,
  objectLocalizationMock,
  generateMaskMock,
  uploadLayerMock,
  uploadLayerThumbnailMock,
} = vi.hoisted(() => ({
  verifyApiAuthMock: vi.fn(),
  rateLimitMock: vi.fn(),
  checkBudgetMock: vi.fn(),
  recordSpendMock: vi.fn(),
  objectLocalizationMock: vi.fn(),
  generateMaskMock: vi.fn(),
  uploadLayerMock: vi.fn(),
  uploadLayerThumbnailMock: vi.fn(),
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
vi.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: vi.fn().mockImplementation(() => ({
    objectLocalization: objectLocalizationMock,
  })),
}));
vi.mock('@/lib/segmentation', () => ({ generateMask: generateMaskMock }));
vi.mock('@/services/gcs-service', () => ({
  uploadLayer: uploadLayerMock,
  uploadLayerThumbnail: uploadLayerThumbnailMock,
}));
vi.mock('@/lib/layerUtils', () => ({ generateLayerId: () => 'layer_1' }));

// A 1x1 transparent PNG, real enough for sharp() to read metadata from.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

import { POST } from '../route';

function makeRequest(body: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/v1/layers/decompose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
      designId: 'design_1',
      ...body,
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyApiAuthMock.mockResolvedValue(null);
  rateLimitMock.mockResolvedValue({ allowed: true });
  checkBudgetMock.mockResolvedValue({ allowed: true, spentCents: 0 });
  recordSpendMock.mockResolvedValue(undefined);
  // No detected objects — keeps the happy path to just the background layer,
  // so these tests exercise the cost-control seam without needing to also
  // mock the full per-object masking pipeline.
  objectLocalizationMock.mockResolvedValue([{ localizedObjectAnnotations: [] }]);
  uploadLayerMock.mockResolvedValue({ url: 'https://gcs/layer.png' });
  uploadLayerThumbnailMock.mockResolvedValue({ url: 'https://gcs/thumb.png' });
});

describe('POST /api/v1/layers/decompose — cost controls', () => {
  it('refuses a request over the shared generation rate limit before calling Vision', async () => {
    rateLimitMock.mockResolvedValue({ allowed: false, limit: 10, remaining: 0, reset: 0 });

    const res = await POST(makeRequest());

    expect(res.status).toBe(429);
    expect(objectLocalizationMock).not.toHaveBeenCalled();
  });

  it('refuses a request once the shared monthly budget is exhausted', async () => {
    checkBudgetMock.mockResolvedValue({ allowed: false, spentCents: 50_000 });

    const res = await POST(makeRequest());

    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toBe('Budget limit reached');
    expect(objectLocalizationMock).not.toHaveBeenCalled();
  });

  it('records spend on the shared budget tracker after a successful decomposition', async () => {
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(recordSpendMock).toHaveBeenCalledTimes(1);
    expect(recordSpendMock.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it('checks rate limit and budget before ever calling Vision', async () => {
    await POST(makeRequest());

    expect(rateLimitMock).toHaveBeenCalledWith(expect.anything(), 'generation');
    expect(checkBudgetMock).toHaveBeenCalled();
    expect(objectLocalizationMock).toHaveBeenCalled();
  });
});
