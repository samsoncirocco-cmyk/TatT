import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/google-auth-edge', () => ({
  getGcpAccessToken: vi.fn().mockResolvedValue('test-token')
}));

vi.mock('@/lib/observability', () => ({
  logEvent: vi.fn()
}));

import { generate } from '../index';
import { logEvent } from '@/lib/observability';

function imagenResponse(count = 1) {
  return {
    ok: true,
    json: async () => ({
      predictions: Array.from({ length: count }, (_, i) => ({
        bytesBase64Encoded: `img${i}`
      }))
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

describe('generation module seam', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns images and metadata for a successful generation', async () => {
    fetchMock.mockResolvedValueOnce(imagenResponse(2));

    const result = await generate({ prompt: 'dragon tattoo', numImages: 2 });

    expect(result.images).toEqual([
      'data:image/png;base64,img0',
      'data:image/png;base64,img1'
    ]);
    expect(result.metadata).toMatchObject({
      model: 'imagen-3.0-generate-001',
      provider: 'vertex-ai',
      attempts: 1,
      safetyFilterLevel: 'block_only_high',
      personGeneration: 'allow_adult',
      fallbackUsed: false
    });
  });

  it('sends prompt and parameters to the Vertex predict endpoint', async () => {
    fetchMock.mockResolvedValueOnce(imagenResponse());

    await generate({
      prompt: 'koi fish',
      negativePrompt: 'blurry',
      aspectRatio: '3:4',
      seed: '42'
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('imagen-3.0-generate-001:predict');
    const body = JSON.parse(init.body);
    expect(body.instances).toEqual([{ prompt: 'koi fish' }]);
    expect(body.parameters).toMatchObject({
      sampleCount: 1,
      aspectRatio: '3:4',
      negativePrompt: 'blurry',
      seed: 42
    });
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('retries on 429 and succeeds on a later attempt', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(imagenResponse());

    const result = await generate({
      prompt: 'rose',
      retry: { attempts: 2, baseDelayMs: 1 }
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.metadata.attempts).toBe(2);
  });

  it('does not retry non-retryable errors', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(400));

    await expect(
      generate({ prompt: 'rose', retry: { attempts: 3, baseDelayMs: 1 } })
    ).rejects.toThrow('Imagen API error: 400');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the relaxed safety setting after exhausting retries', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(imagenResponse());

    const result = await generate({
      prompt: 'skull',
      safetyFilterLevel: 'block_most',
      retry: { attempts: 1, baseDelayMs: 1 },
      fallback: { safetyFilterLevel: 'block_only_high' }
    });

    expect(result.metadata.fallbackUsed).toBe(true);
    expect(result.metadata.safetyFilterLevel).toBe('block_only_high');
    const fallbackBody = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(fallbackBody.parameters.safetySetting).toBe('block_only_high');
  });

  it('emits request and result telemetry', async () => {
    fetchMock.mockResolvedValueOnce(imagenResponse());

    await generate({ prompt: 'anchor' });

    const events = (logEvent as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(events).toContain('generation.request');
    expect(events).toContain('generation.result');
  });

  it('emits an error-level result event when generation fails outright', async () => {
    fetchMock.mockResolvedValue(errorResponse(400));

    await expect(generate({ prompt: 'anchor' })).rejects.toThrow();

    const errorCall = (logEvent as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'generation.result' && c[2] === 'error'
    );
    expect(errorCall).toBeTruthy();
  });
});
