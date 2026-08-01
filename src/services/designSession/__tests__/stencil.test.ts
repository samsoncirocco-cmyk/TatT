/**
 * Stencil derivation — the artist's half of a completed session.
 *
 * The generation module and GCS are mocked; what matters here is the
 * contract: derive from the approved IMAGE (never re-prompt from text),
 * pin the only model that can honor that, re-host durably, and degrade to
 * null instead of throwing into the refinement flow.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../generation', () => ({
  generate: vi.fn(),
  STENCIL_SHIELD_TOKENS: 'shading, gradients, grey, messy lines',
}));

const uploadToGCS = vi.fn(async () => ({ url: 'https://gcs.example/stencil.png' }));
vi.mock('../../gcs-service', () => ({ uploadToGCS }));

import { deriveStencil, stencilPromptStrength } from '../internal/stencil';
import { generate } from '../../generation';

const SOURCE = 'https://replicate.delivery/pbxt/approved.png';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STENCIL_DERIVATION_ENABLED', 'true');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }))
  );
  vi.mocked(generate).mockResolvedValue({
    images: ['https://replicate.delivery/pbxt/stencil.png'],
    metadata: {},
  } as unknown as Awaited<ReturnType<typeof generate>>);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('deriveStencil', () => {
  it('derives from the approved image, not from the session text', async () => {
    await deriveStencil('s1', SOURCE);

    const request = vi.mocked(generate).mock.calls[0][0];
    expect(request.sourceImage).toBe(SOURCE);
    expect(request.sourceStrength).toBe(stencilPromptStrength());
  });

  // Only flux-dev accepts an image-to-image input, and falling back to a
  // model that cannot would return a stencil of a different design.
  it('pins flux-dev and refuses provider fallback', async () => {
    await deriveStencil('s1', SOURCE);

    const request = vi.mocked(generate).mock.calls[0][0];
    expect(request.modelId).toBe('flux-dev');
    expect(request.allowProviderFallback).toBe(false);
    expect(request.numImages).toBe(1);
  });

  it('asks for line art positively and excludes colour', async () => {
    await deriveStencil('s1', SOURCE);

    const request = vi.mocked(generate).mock.calls[0][0];
    expect(request.prompt).toMatch(/uniform line weight/i);
    expect(request.prompt).toMatch(/preserve the exact composition/i);
    expect(request.negativePrompt).toMatch(/color/i);
    expect(request.isStencilMode).toBe(true);
  });

  // The reveal path passes provider URLs through untouched; the stencil
  // cannot, because Replicate drops prediction outputs after about an hour
  // and this is the file opened at a consult days later.
  it('re-hosts a provider-hosted stencil in GCS', async () => {
    const result = await deriveStencil('s1', SOURCE);

    expect(fetch).toHaveBeenCalledWith('https://replicate.delivery/pbxt/stencil.png');
    expect(uploadToGCS).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('design-sessions/s1/stencil-')
    );
    expect(result?.imageUrl).toBe('https://gcs.example/stencil.png');
  });

  it('re-hosts an inline data URL without fetching', async () => {
    vi.mocked(generate).mockResolvedValueOnce({
      images: ['data:image/png;base64,aGVsbG8='],
      metadata: {},
    } as unknown as Awaited<ReturnType<typeof generate>>);

    const result = await deriveStencil('s1', SOURCE);

    expect(fetch).not.toHaveBeenCalled();
    expect(result?.imageUrl).toBe('https://gcs.example/stencil.png');
  });

  it('is off unless explicitly enabled — it costs a render per session', async () => {
    vi.stubEnv('STENCIL_DERIVATION_ENABLED', 'false');

    expect(await deriveStencil('s1', SOURCE)).toBeNull();
    expect(generate).not.toHaveBeenCalled();
  });

  // A missing stencil costs the artist convenience; a thrown error would
  // cost the customer the refinement they already paid for.
  it('returns null instead of throwing when the render fails', async () => {
    vi.mocked(generate).mockRejectedValueOnce(new Error('provider blew up'));

    expect(await deriveStencil('s1', SOURCE)).toBeNull();
  });

  it('returns null instead of throwing when re-hosting fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));

    expect(await deriveStencil('s1', SOURCE)).toBeNull();
  });

  it('returns null when the provider returned no image', async () => {
    vi.mocked(generate).mockResolvedValueOnce({
      images: [],
      metadata: {},
    } as unknown as Awaited<ReturnType<typeof generate>>);

    expect(await deriveStencil('s1', SOURCE)).toBeNull();
  });
});

describe('stencilPromptStrength', () => {
  it('favours composition fidelity over flux-dev\'s own 0.8 default', () => {
    vi.stubEnv('STENCIL_PROMPT_STRENGTH', '');
    expect(stencilPromptStrength()).toBeLessThan(0.8);
  });

  it('is env-tunable within 0..1 and ignores nonsense', () => {
    vi.stubEnv('STENCIL_PROMPT_STRENGTH', '0.4');
    expect(stencilPromptStrength()).toBe(0.4);

    vi.stubEnv('STENCIL_PROMPT_STRENGTH', '7');
    expect(stencilPromptStrength()).toBeLessThan(0.8);

    vi.stubEnv('STENCIL_PROMPT_STRENGTH', 'banana');
    expect(stencilPromptStrength()).toBeLessThan(0.8);
  });
});
