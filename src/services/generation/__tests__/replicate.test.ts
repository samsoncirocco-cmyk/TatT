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

  it('sends the Classic Flash request body verbatim — LoRA scale, TOK prefix, params', async () => {
    fetchMock.mockResolvedValueOnce(replicateResponse());

    const result = await generate({ prompt: 'a ship and swallow', style: 'traditional', numImages: 2 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.replicate.com/v1/predictions');
    const body = JSON.parse(init.body);
    expect(body.version).toBe(
      'anotherjesse/amy-tattoo-test-1:0e345aaf74965ae98fb83ca9c65376ee42da5c7837d88c648ddc5d3cba1f35dc'
    );
    expect(body.input).toMatchObject({
      prompt: 'A TOK tattoo drawing style of a ship and swallow',
      lora_scale: 0.6,
      scheduler: 'K_EULER',
      num_inference_steps: 50,
      guidance_scale: 7.5,
      num_outputs: 2
    });
    expect(init.headers.Authorization).toBe('Token r8_test');
    expect(result.metadata).toMatchObject({ model: 'tattoo', provider: 'replicate', fallbackUsed: false });
  });

  it('routes unknown styles to SDXL and returns its images', async () => {
    fetchMock.mockResolvedValueOnce(replicateResponse(['https://img.example/a.png']));

    const result = await generate({ prompt: 'geometric wolf' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.version).toContain('stability-ai/sdxl');
    expect(result.images).toEqual(['https://img.example/a.png']);
    expect(result.metadata.model).toBe('sdxl');
  });

  it('walks the replicate fallback chain when the primary model fails', async () => {
    // anime → animeXL primary fails, dreamshaper (first fallback) succeeds
    fetchMock
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(replicateResponse());

    const result = await generate({ prompt: 'saiyan', style: 'anime' });

    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(firstBody.version).toContain('sdxl-niji-se');
    expect(secondBody.version).toContain('dreamshaper-xl-turbo');
    expect(result.metadata).toMatchObject({ model: 'dreamshaper', fallbackUsed: true });
  });

  it('falls back from Vertex to Replicate SDXL when Vertex exhausts retries', async () => {
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
    expect(result.metadata).toMatchObject({ model: 'sdxl', provider: 'replicate', fallbackUsed: true });
  });

  it('respects an explicit modelId and skips routing', async () => {
    fetchMock.mockResolvedValueOnce(replicateResponse());

    await generate({ prompt: 'x', style: 'realism', modelId: 'dreamshaper' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.version).toContain('dreamshaper-xl-turbo');
  });

  it('throws a typed error when no token is configured', async () => {
    vi.stubEnv('REPLICATE_API_TOKEN', '');

    await expect(generate({ prompt: 'x', style: 'traditional' })).rejects.toThrow(
      'REPLICATE_API_TOKEN not configured'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
