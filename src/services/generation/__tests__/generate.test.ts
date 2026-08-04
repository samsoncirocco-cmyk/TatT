import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/google-auth-edge', () => ({
  getGcpAccessToken: vi.fn().mockResolvedValue('test-token')
}));

vi.mock('@/lib/observability', () => ({
  logEvent: vi.fn()
}));

import { generate } from '../index';
import { logEvent } from '@/lib/observability';

/*
 * One Gemini call returns at most one image — unlike Imagen's sampleCount,
 * which returned N from a single call. Multi-image requests fan out, so a test
 * asking for N images queues N of these.
 */
function imageResponse(id = 'img0', mimeType = 'image/png') {
  return {
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: { parts: [{ inlineData: { mimeType, data: id } }] }
        }
      ]
    })
  };
}

/** A safety block: HTTP 200, no image, a reason in finishReason. */
function blockedResponse(reason = 'SAFETY') {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ finishReason: reason, content: { parts: [] } }]
    })
  };
}

function errorResponse(status: number) {
  return {
    ok: false,
    status,
    text: async () => `upstream ${status}`
  };
}

/**
 * Every case here pins the provider with `modelId: 'imagen3'` rather than a
 * style. These used to say `style: 'realism'`, which worked only while realism
 * routed to Vertex; #281 moved realism/portrait/photorealistic to Flux Dev, so
 * a style-selected case now lands on Replicate and tests nothing about this
 * provider. Pinning the model is what this suite actually means.
 */
describe('generation module seam — vertex provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    // No Replicate token: cross-provider fallback stays out of these tests.
    vi.stubEnv('REPLICATE_API_TOKEN', '');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns images and metadata for a successful generation', async () => {
    fetchMock
      .mockResolvedValueOnce(imageResponse('img0'))
      .mockResolvedValueOnce(imageResponse('img1'));

    const result = await generate({ prompt: 'dragon tattoo', modelId: 'imagen3', numImages: 2 });

    expect(result.images).toEqual([
      'data:image/png;base64,img0',
      'data:image/png;base64,img1'
    ]);
    expect(result.metadata).toMatchObject({
      model: 'gemini-3.1-flash-image',
      provider: 'vertex-ai',
      attempts: 1,
      safetyFilterLevel: 'block_only_high',
      personGeneration: 'allow_adult',
      fallbackUsed: false
    });
  });

  it('fans out one call per requested image', async () => {
    fetchMock
      .mockResolvedValueOnce(imageResponse('a'))
      .mockResolvedValueOnce(imageResponse('b'))
      .mockResolvedValueOnce(imageResponse('c'));

    const result = await generate({ prompt: 'wolf', modelId: 'imagen3', numImages: 3 });

    // Imagen took sampleCount:3 in one call; Gemini needs three.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.images).toHaveLength(3);
  });

  it('sends the prompt and config to the Vertex generateContent endpoint', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse());

    await generate({
      prompt: 'koi fish',
      modelId: 'imagen3',
      aspectRatio: '3:4'
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('gemini-3.1-flash-image:generateContent');
    const body = JSON.parse(init.body);
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'koi fish' }] }
    ]);
    expect(body.generationConfig).toMatchObject({
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: '3:4', personGeneration: 'ALLOW_ADULT' }
    });
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('maps personGeneration onto Gemini imageConfig', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse());

    await generate({
      prompt: 'portrait',
      modelId: 'imagen3',
      personGeneration: 'dont_allow'
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.generationConfig.imageConfig.personGeneration).toBe('ALLOW_NONE');
  });

  it('maps outputFormat onto Gemini imageOutputOptions.mimeType', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse());

    await generate({
      prompt: 'portrait',
      modelId: 'imagen3',
      outputFormat: 'jpeg'
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.generationConfig.imageConfig.imageOutputOptions).toEqual({
      mimeType: 'image/jpeg'
    });
  });

  it('folds the negative prompt into an Avoid clause (no negative_prompt input exists)', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse());

    await generate({ prompt: 'koi fish', modelId: 'imagen3', negativePrompt: 'blurry, text' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[0].text).toBe('koi fish. Avoid: blurry, text.');
    // The shield tokens must not vanish into a field the model ignores.
    expect(JSON.stringify(body)).not.toContain('negativePrompt');
  });

  it('trims the prompt before folding Avoid (parity with replicate.ts)', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse());

    await generate({
      prompt: '  koi fish.  ',
      modelId: 'imagen3',
      negativePrompt: 'blurry'
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[0].text).toBe('koi fish. Avoid: blurry.');
  });

  it('maps our safety vocabulary onto Gemini harm thresholds', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse());

    await generate({ prompt: 'skull', modelId: 'imagen3', safetyFilterLevel: 'block_most' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.safetySettings).toHaveLength(4);
    for (const setting of body.safetySettings) {
      expect(setting.threshold).toBe('BLOCK_LOW_AND_ABOVE');
    }
  });

  it('preserves the mime type the model reports', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse('jpg0', 'image/jpeg'));

    const result = await generate({ prompt: 'anchor', modelId: 'imagen3' });

    expect(result.images[0]).toBe('data:image/jpeg;base64,jpg0');
  });

  it('treats a 200-with-no-image safety block as a failure, naming the reason', async () => {
    // The most important new failure mode: Imagen refused with an HTTP error,
    // Gemini refuses with a successful response and an empty parts array.
    fetchMock.mockResolvedValue(blockedResponse('SAFETY'));

    await expect(generate({ prompt: 'skull', modelId: 'imagen3' })).rejects.toThrow(
      /returned no image \(SAFETY\)/
    );
  });

  it('retries on 429 and succeeds on a later attempt', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(imageResponse());

    const result = await generate({
      prompt: 'rose',
      modelId: 'imagen3',
      retry: { maxRetries: 2, baseDelayMs: 1 }
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.metadata.attempts).toBe(2);
  });

  it('does not retry non-retryable errors', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(400));

    await expect(
      generate({ prompt: 'rose', modelId: 'imagen3', retry: { maxRetries: 3, baseDelayMs: 1 } })
    ).rejects.toThrow('Vertex image API error: 400');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the relaxed safety setting after exhausting retries on retryable errors', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(imageResponse());

    const result = await generate({
      prompt: 'skull',
      modelId: 'imagen3',
      safetyFilterLevel: 'block_most',
      retry: { maxRetries: 1, baseDelayMs: 1 },
      fallback: { safetyFilterLevel: 'block_only_high' }
    });

    expect(result.metadata.fallbackUsed).toBe(true);
    expect(result.metadata.safetyFilterLevel).toBe('block_only_high');
    const fallbackBody = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(fallbackBody.safetySettings[0].threshold).toBe('BLOCK_ONLY_HIGH');
  });

  it('does NOT run the paid safety fallback after a non-retryable error (declared fix)', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(400));

    await expect(
      generate({
        prompt: 'skull',
        modelId: 'imagen3',
        safetyFilterLevel: 'block_most',
        retry: { maxRetries: 2, baseDelayMs: 1 },
        fallback: { safetyFilterLevel: 'block_only_high' }
      })
    ).rejects.toThrow('Vertex image API error: 400');

    // Exactly one paid call — the fallback must not fire for a hopeless request.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('prefers a hard non-retryable error over a safety block when parallel calls fail', async () => {
    // Safety settles first, 400 second. Promise.all race could surface SAFETY
    // and burn a paid loosened-safety fan-out; fixed priority must pick 400.
    fetchMock
      .mockResolvedValueOnce(blockedResponse('SAFETY'))
      .mockResolvedValueOnce(errorResponse(400));

    await expect(
      generate({
        prompt: 'skull',
        modelId: 'imagen3',
        numImages: 2,
        safetyFilterLevel: 'block_most',
        retry: { maxRetries: 2, baseDelayMs: 1 },
        fallback: { safetyFilterLevel: 'block_only_high' }
      })
    ).rejects.toThrow('Vertex image API error: 400');

    // Primary fan-out only — no retries, no safety fallback.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('prefers a retryable error over a safety block when parallel calls fail', async () => {
    // SAFETY (NO_OUTPUT, status 200) must not mask a 429 — otherwise
    // generateWithRetry treats the fan-out as non-retryable and skips backoff.
    fetchMock
      .mockResolvedValueOnce(blockedResponse('SAFETY'))
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(imageResponse())
      .mockResolvedValueOnce(imageResponse());

    const result = await generate({
      prompt: 'skull',
      modelId: 'imagen3',
      numImages: 2,
      retry: { maxRetries: 2, baseDelayMs: 1 }
    });

    expect(result.images).toHaveLength(2);
    expect(result.metadata.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('emits request and result telemetry', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse());

    await generate({ prompt: 'anchor', modelId: 'imagen3' });

    const events = (logEvent as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(events).toContain('generation.request');
    expect(events).toContain('generation.result');
  });

  it('emits an error-level result event when generation fails outright', async () => {
    fetchMock.mockResolvedValue(errorResponse(400));

    await expect(generate({ prompt: 'anchor', modelId: 'imagen3' })).rejects.toThrow();

    const errorCall = (logEvent as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'generation.result' && c[2] === 'error'
    );
    expect(errorCall).toBeTruthy();
  });
});
