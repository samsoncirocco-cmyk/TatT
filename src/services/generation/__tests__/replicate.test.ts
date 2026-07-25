import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/google-auth-edge', () => ({
  getGcpAccessToken: vi.fn().mockResolvedValue('test-token')
}));

vi.mock('@/lib/observability', () => ({
  logEvent: vi.fn()
}));

import { generate } from '../index';

function replicateResponse(output: string[] = ['https://img.example/1.png']) {
  return {
    ok: true,
    json: async () => ({ id: 'pred_1', status: 'succeeded', output })
  };
}

function errorResponse(status: number) {
  return {
    ok: false,
    status,
    text: async () => `upstream ${status}`
  };
}

describe('generation module — replicate provider seam', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('REPLICATE_API_TOKEN', 'r8_test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('sends traditional styles to Flux Dev via the official-models endpoint', async () => {
    fetchMock.mockResolvedValueOnce(replicateResponse());

    const result = await generate({
      prompt: 'a ship and swallow',
      style: 'traditional',
      numImages: 2,
      aspectRatio: '9:16'
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions');
    const body = JSON.parse(init.body);
    expect(body.version).toBeUndefined();
    expect(body.input).toMatchObject({
      prompt: expect.stringContaining('a ship and swallow'),
      guidance: 3,
      num_inference_steps: 28,
      output_format: 'png',
      num_outputs: 2,
      aspect_ratio: '9:16'
    });
    expect(body.input.negative_prompt).toBeUndefined();
    expect(init.headers.Authorization).toBe('Token r8_test');
    expect(result.metadata).toMatchObject({ model: 'flux-dev', provider: 'replicate', fallbackUsed: false });
  });

  it('folds the negative prompt into the prompt as an Avoid clause', async () => {
    fetchMock.mockResolvedValueOnce(replicateResponse());

    await generate({ prompt: 'geometric wolf.', style: 'blackwork', negativePrompt: 'color ink, blur' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.input.prompt).toBe('geometric wolf. Avoid: color ink, blur.');
    expect(body.input.negative_prompt).toBeUndefined();
  });

  it('resolves retired catalog ids (sdxl) to their Flux replacements', async () => {
    fetchMock.mockResolvedValueOnce(replicateResponse());

    const result = await generate({ prompt: 'x', modelId: 'sdxl' });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('black-forest-labs/flux-dev');
    expect(result.metadata.model).toBe('flux-dev');
  });

  it('routes unknown styles to Flux Dev and returns its images', async () => {
    fetchMock.mockResolvedValueOnce(replicateResponse(['https://img.example/a.png']));

    const result = await generate({ prompt: 'geometric wolf' });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('black-forest-labs/flux-dev');
    expect(result.images).toEqual(['https://img.example/a.png']);
    expect(result.metadata.model).toBe('flux-dev');
  });

  it('walks the replicate fallback chain when the primary model fails', async () => {
    // anime → krea2 primary fails, flux-dev (first fallback) succeeds
    fetchMock
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(replicateResponse());

    const result = await generate({ prompt: 'saiyan', style: 'anime' });

    const firstUrl = fetchMock.mock.calls[0][0];
    const secondUrl = fetchMock.mock.calls[1][0];
    expect(firstUrl).toContain('krea/krea-2-medium');
    expect(secondUrl).toContain('black-forest-labs/flux-dev');
    expect(result.metadata).toMatchObject({ model: 'flux-dev', fallbackUsed: true });
  });

  it('falls back from Vertex to Flux Dev when Vertex exhausts retries', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('aiplatform.googleapis.com')) return errorResponse(500);
      return replicateResponse(['https://img.example/fallback.png']);
    });

    const result = await generate({
      prompt: 'photo portrait',
      style: 'realism',
      retry: { maxRetries: 0, baseDelayMs: 1 }
    });

    expect(result.images).toEqual(['https://img.example/fallback.png']);
    expect(result.metadata).toMatchObject({ model: 'flux-dev', provider: 'replicate', fallbackUsed: true });
  });

  it('respects an explicit modelId and skips routing', async () => {
    fetchMock.mockResolvedValueOnce(replicateResponse());

    await generate({ prompt: 'x', style: 'realism', modelId: 'flux-schnell' });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('black-forest-labs/flux-schnell');
  });

  it('waits out a 429 throttle using retry_after and reports real attempt telemetry', async () => {
    const throttle = () => ({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ detail: 'Request was throttled.', retry_after: 0.001 })
    });
    fetchMock
      .mockResolvedValueOnce(throttle())
      .mockResolvedValueOnce(throttle())
      .mockResolvedValueOnce(replicateResponse(['https://img.example/ok.png']));

    const result = await generate({ prompt: 'x', style: 'traditional' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.images).toEqual(['https://img.example/ok.png']);
    expect(result.metadata.attempts).toBe(3);
  });

  it('survives the worst burst=1 slot: four throttles before the fifth attempt lands', async () => {
    const throttle = () => ({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ detail: 'throttled', retry_after: 0.001 })
    });
    fetchMock
      .mockResolvedValueOnce(throttle())
      .mockResolvedValueOnce(throttle())
      .mockResolvedValueOnce(throttle())
      .mockResolvedValueOnce(throttle())
      .mockResolvedValueOnce(replicateResponse(['https://img.example/last.png']));

    const result = await generate({ prompt: 'x', style: 'traditional' });

    expect(result.images).toEqual(['https://img.example/last.png']);
    expect(result.metadata.attempts).toBe(5);
  });

  it('fans out single-output Krea into N parallel predictions and merges', async () => {
    let call = 0;
    fetchMock.mockImplementation(async () => {
      call += 1;
      return replicateResponse([`https://img.example/krea-${call}.png`]);
    });

    const result = await generate({ prompt: 'deku', style: 'anime', numImages: 4 });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const [url, init] of fetchMock.mock.calls) {
      expect(url).toContain('krea/krea-2-medium');
      expect(JSON.parse(init.body).input.num_outputs).toBeUndefined();
    }
    expect(result.images).toHaveLength(4);
    expect(result.metadata).toMatchObject({ model: 'krea2', attempts: 4 });
  });

  it('remaps ratios a model does not accept to its nearest legal ratio', async () => {
    fetchMock.mockResolvedValueOnce(replicateResponse());

    // Krea's schema has no 3:4 — expect the 4:5 remap.
    await generate({ prompt: 'x', style: 'anime', aspectRatio: '3:4' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.input.aspect_ratio).toBe('4:5');
  });

  it('gives up on a persistent 429 with the typed replicate error', async () => {
    const throttle = () => ({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ detail: 'Request was throttled.', retry_after: 0.001 })
    });
    fetchMock.mockResolvedValue(throttle());

    await expect(generate({ prompt: 'x', style: 'traditional', modelId: 'flux-dev' })).rejects.toThrow(
      'Replicate API Error: 429'
    );
  });

  it('throws a typed error when no token is configured', async () => {
    vi.stubEnv('REPLICATE_API_TOKEN', '');

    await expect(generate({ prompt: 'x', style: 'traditional' })).rejects.toThrow(
      'REPLICATE_API_TOKEN not configured'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
