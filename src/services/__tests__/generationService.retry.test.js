/**
 * Verification Tests for the legacy Generation Service retry logic.
 *
 * Split out of councilService.verification.test.js when councilService moved
 * into the council module (ticket 04) — these tests target the legacy
 * generationService, which is slated for deletion in the contract step.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Generation Service Retry Logic ─────────────────────────────────

describe('generateWithRetry', () => {
  // We test retry logic by mocking fetch and the auth helper.
  // The real callImagen uses fetch internally.

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  async function loadGenerationService() {
    // Mock dependencies before importing the module
    vi.doMock('@/lib/google-auth-edge', () => ({
      getGcpAccessToken: vi.fn().mockResolvedValue('mock-token')
    }));
    vi.doMock('@/lib/observability', () => ({
      logEvent: vi.fn()
    }));

    const mod = await import('../generationService');
    return mod;
  }

  it('succeeds on first attempt with valid response', async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          predictions: [{ bytesBase64Encoded: 'AAAA' }]
        })
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const { generateWithRetry: gen } = await loadGenerationService();
    const result = await gen({ prompt: 'A dragon tattoo' });

    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toContain('data:image/png;base64,');
    expect(result.metadata.attempts).toBe(1);
    expect(result.metadata.fallbackUsed).toBe(false);
  });

  it('retries on transient 503 and succeeds', async () => {
    const error503 = {
      ok: false,
      status: 503,
      text: () => Promise.resolve('Service Unavailable')
    };
    const successResp = {
      ok: true,
      json: () =>
        Promise.resolve({
          predictions: [{ bytesBase64Encoded: 'BBBB' }]
        })
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(error503)
      .mockResolvedValueOnce(error503)
      .mockResolvedValueOnce(successResp);
    vi.stubGlobal('fetch', fetchMock);

    const { generateWithRetry: gen } = await loadGenerationService();
    const result = await gen({
      prompt: 'test',
      retry: { attempts: 4, baseDelayMs: 1 }
    });

    expect(result.metadata.attempts).toBe(3);
    expect(result.images).toHaveLength(1);
  });

  it('retries on 429 quota exceeded', async () => {
    const error429 = {
      ok: false,
      status: 429,
      text: () => Promise.resolve('Quota exceeded')
    };
    const successResp = {
      ok: true,
      json: () =>
        Promise.resolve({
          predictions: [{ bytesBase64Encoded: 'CCCC' }]
        })
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(error429)
      .mockResolvedValueOnce(successResp);
    vi.stubGlobal('fetch', fetchMock);

    const { generateWithRetry: gen } = await loadGenerationService();
    const result = await gen({
      prompt: 'test',
      retry: { attempts: 4, baseDelayMs: 1 }
    });

    expect(result.metadata.attempts).toBe(2);
  });

  it('does NOT retry on permanent 400 error', async () => {
    const error400 = {
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad Request')
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(error400));

    const { generateWithRetry: gen } = await loadGenerationService();

    await expect(
      gen({ prompt: 'test', retry: { attempts: 4, baseDelayMs: 1 } })
    ).rejects.toThrow(/Imagen API error: 400/);

    // fetch should only be called once (no retries)
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on permanent 403 error', async () => {
    const error403 = {
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden')
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(error403));

    const { generateWithRetry: gen } = await loadGenerationService();

    await expect(
      gen({ prompt: 'test', retry: { attempts: 4, baseDelayMs: 1 } })
    ).rejects.toThrow(/Imagen API error: 403/);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('exhausts all 5 attempts (1 initial + 4 retries) then throws', async () => {
    const error500 = {
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error')
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(error500));

    const { generateWithRetry: gen } = await loadGenerationService();

    await expect(
      gen({ prompt: 'test', retry: { attempts: 4, baseDelayMs: 1 } })
    ).rejects.toThrow(/Imagen API error: 500/);

    // 1 initial + 4 retries = 5 total calls
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('defaults to 5 total attempts when retry.attempts is not specified', async () => {
    const error502 = {
      ok: false,
      status: 502,
      text: () => Promise.resolve('Bad Gateway')
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(error502));

    const { generateWithRetry: gen } = await loadGenerationService();

    await expect(
      gen({ prompt: 'test', retry: { baseDelayMs: 1 } })
    ).rejects.toThrow();

    // Default retryAttempts=4 => 5 total
    expect(fetch).toHaveBeenCalledTimes(5);
  });
});
