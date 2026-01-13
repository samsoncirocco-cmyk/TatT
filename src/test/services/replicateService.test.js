import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/fetchWithAbort.js', async () => {
  const actual = await vi.importActual('../../services/fetchWithAbort.js');
  return {
    ...actual,
    postJSON: vi.fn(),
    fetchJSON: vi.fn()
  };
});

let generatePreviewDesign;
let generateHighResDesign;
let AI_MODELS;
let postJSON;

describe('replicateService smart preview', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_PROXY_URL', 'http://localhost:3001/api');
    vi.stubEnv('VITE_DEMO_MODE', 'false');
  });

  beforeEach(async () => {
    ({ postJSON } = await import('../../services/fetchWithAbort.js'));
    ({ generatePreviewDesign, generateHighResDesign, AI_MODELS } = await import('../../services/replicateService'));
    postJSON.mockResolvedValue({
      id: 'preview-id',
      status: 'succeeded',
      output: ['https://example.com/preview.png']
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a low-res preview with turbo settings', async () => {
    const result = await generatePreviewDesign({
      style: 'traditional',
      subject: 'dragon tattoo',
      bodyPart: 'forearm',
      size: 'medium'
    });

    expect(postJSON).toHaveBeenCalledWith(
      expect.stringContaining('/predictions'),
      expect.objectContaining({
        version: AI_MODELS.dreamshaper.version,
        input: expect.objectContaining({
          width: 512,
          height: 512,
          num_outputs: 1,
          num_inference_steps: 4
        })
      })
    );

    expect(result.metadata.mode).toBe('preview');
    expect(result.metadata.preview).toBe(true);
  });
});

describe('replicateService high-res generation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_PROXY_URL', 'http://localhost:3001/api');
    vi.stubEnv('VITE_DEMO_MODE', 'false');
  });

  beforeEach(async () => {
    ({ postJSON } = await import('../../services/fetchWithAbort.js'));
    ({ generatePreviewDesign, generateHighResDesign, AI_MODELS } = await import('../../services/replicateService'));
    postJSON.mockResolvedValue({
      id: 'highres-id',
      status: 'succeeded',
      output: ['https://example.com/highres.png']
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requests high-res output with RGBA support when available', async () => {
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
      expect.stringContaining('/predictions'),
      expect.objectContaining({
        version: AI_MODELS.sdxl.version,
        input: expect.objectContaining({
          num_outputs: 1,
          output_format: 'png',
          output_quality: 100
        })
      })
    );

    expect(result.metadata.dpi).toBe(300);
    expect(result.metadata.rgbaReady).toBe(true);
  });
});
