import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/client-api-auth', () => ({
  getApiAuthHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer test-firebase-token' })
}));

vi.mock('../../services/fetchWithAbort.js', async () => {
  const actual = await vi.importActual('../../services/fetchWithAbort.js');
  return {
    ...actual,
    postJSON: vi.fn(),
    fetchJSON: vi.fn()
  };
});

let generateTattooDesign;
let generatePreviewDesign;
let generateHighResDesign;
let AI_MODELS;
let postJSON;

async function loadService(mockOutput) {
  ({ postJSON } = await import('../../services/fetchWithAbort.js'));
  ({ generateTattooDesign, generatePreviewDesign, generateHighResDesign, AI_MODELS } =
    await import('@/features/generate/services/replicateService'));
  postJSON.mockResolvedValue({
    id: 'prediction-id',
    status: 'succeeded',
    output: mockOutput
  });
}

describe('replicateService smart preview', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
  });

  beforeEach(async () => {
    await loadService(['https://example.com/preview.png']);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a single-output preview on Flux Schnell by slug', async () => {
    const result = await generatePreviewDesign({
      style: 'traditional',
      subject: 'dragon tattoo',
      bodyPart: 'forearm',
      size: 'medium'
    });

    expect(postJSON).toHaveBeenCalledWith(
      expect.stringContaining('/api/predictions'),
      expect.objectContaining({
        model: AI_MODELS['flux-schnell'].slug,
        input: expect.objectContaining({
          num_outputs: 1,
          aspect_ratio: '9:16',
          output_format: 'png'
        })
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Bearer ')
        })
      })
    );

    const [, body] = postJSON.mock.calls[0];
    expect(body.version).toBeUndefined();
    expect(body.input.negative_prompt).toBeUndefined();
    expect(body.input.width).toBeUndefined();
    expect(body.input.height).toBeUndefined();

    expect(result.metadata.mode).toBe('preview');
    expect(result.metadata.preview).toBe(true);
  });
});

describe('replicateService high-res generation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
  });

  beforeEach(async () => {
    await loadService(['https://example.com/highres.png']);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves the legacy sdxl id to Flux Dev with its native params', async () => {
    const result = await generateHighResDesign(
      {
        style: 'traditional',
        subject: 'dragon tattoo',
        bodyPart: 'forearm',
        size: 'medium',
        aiModel: 'sdxl'
      },
      { modelId: 'sdxl', finalize: true, enableRGBA: true }
    );

    expect(postJSON).toHaveBeenCalledWith(
      expect.stringContaining('/api/predictions'),
      expect.objectContaining({
        model: AI_MODELS['flux-dev'].slug,
        input: expect.objectContaining({
          num_outputs: 1,
          guidance: 3,
          num_inference_steps: 28,
          output_format: 'png'
        })
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Bearer ')
        })
      })
    );

    expect(result.metadata.modelId).toBe('flux-dev');
    expect(result.metadata.dpi).toBe(300);
    expect(result.metadata.rgbaReady).toBe(true);
  });
});

describe('replicateService Flux/Krea input shape', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
  });

  beforeEach(async () => {
    await loadService(['https://example.com/krea.png']);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fans out single-output Krea into parallel predictions and merges the images', async () => {
    const result = await generateTattooDesign(
      {
        style: 'traditional',
        subject: 'dragon tattoo',
        bodyPart: 'forearm',
        size: 'medium'
      },
      'krea2',
      null,
      { inputOverrides: { aspect_ratio: '3:4' } }
    );

    expect(postJSON).toHaveBeenCalledTimes(4);
    const [, body] = postJSON.mock.calls[0];
    expect(body.model).toBe(AI_MODELS.krea2.slug);
    // Krea takes one output per prediction and has no 3:4 — remapped to 4:5.
    expect(body.input.num_outputs).toBeUndefined();
    expect(body.input.aspect_ratio).toBe('4:5');
    expect(result.images).toHaveLength(4);
    expect(result.metadata.modelId).toBe('krea2');
  });

  it('folds the negative prompt into the prompt as an Avoid clause', async () => {
    await generateTattooDesign(
      {
        style: 'traditional',
        subject: 'dragon tattoo',
        bodyPart: 'forearm',
        size: 'medium'
      },
      'flux-dev'
    );

    const [, body] = postJSON.mock.calls[0];
    expect(body.input.prompt).toContain('Avoid:');
    expect(body.input.negative_prompt).toBeUndefined();
  });

  it('resolves the legacy animeXL id to Krea 2', async () => {
    const result = await generateTattooDesign(
      {
        style: 'traditional',
        subject: 'dragon tattoo',
        bodyPart: 'forearm',
        size: 'medium'
      },
      'animeXL',
      null,
      { inputOverrides: { num_outputs: 1 } }
    );

    expect(postJSON).toHaveBeenCalledTimes(1);
    expect(postJSON.mock.calls[0][1].model).toBe(AI_MODELS.krea2.slug);
    expect(result.metadata.modelId).toBe('krea2');
  });
});
