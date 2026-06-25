/**
 * Inpainting Service Tests
 *
 * Tests exports, cost calculation, mask canvas creation, and API call shape.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  INPAINTING_MODEL,
  createMaskCanvas,
  getInpaintingCost,
  inpaintTattooDesign
} from '../src/features/inpainting/services/inpaintingService';

// ---- browser API mocks ----

function makeMockCanvas() {
  const ctx = {
    fillStyle: '',
    fillRect: vi.fn(),
    getContext: undefined
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn((cb) => {
      cb(new Blob(['mock'], { type: 'image/png' }));
    }),
    toDataURL: vi.fn(() => 'data:image/png;base64,mockCanvas')
  };
  ctx.getContext = canvas.getContext;
  return { canvas, ctx };
}

beforeEach(() => {
  // Mock document.createElement to return a mock canvas
  const { canvas, ctx } = makeMockCanvas();
  vi.stubGlobal('document', {
    createElement: vi.fn((tag) => {
      if (tag === 'canvas') return canvas;
      return {};
    })
  });

  // Mock FileReader
  vi.stubGlobal('FileReader', class {
    readAsDataURL() {
      setTimeout(() => {
        this.result = 'data:image/png;base64,mockBlob';
        this.onloadend();
      }, 0);
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---- Tests ----

describe('Inpainting Service', () => {
  describe('INPAINTING_MODEL', () => {
    it('should export a version string containing stability-ai', () => {
      expect(typeof INPAINTING_MODEL.version).toBe('string');
      expect(INPAINTING_MODEL.version).toContain('stability-ai');
    });

    it('should export a positive numeric cost', () => {
      expect(typeof INPAINTING_MODEL.cost).toBe('number');
      expect(INPAINTING_MODEL.cost).toBeGreaterThan(0);
    });
  });

  describe('createMaskCanvas', () => {
    it('should create a canvas with the given dimensions', () => {
      const canvas = createMaskCanvas(512, 256);
      expect(canvas.width).toBe(512);
      expect(canvas.height).toBe(256);
    });

    it('should call getContext and fillRect to paint black', () => {
      const canvas = createMaskCanvas(100, 100);
      expect(canvas.getContext).toHaveBeenCalledWith('2d');
      const ctx = canvas.getContext('2d');
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 100);
    });
  });

  describe('getInpaintingCost', () => {
    it('should return an object with perSecond, estimated, and formatted', () => {
      const cost = getInpaintingCost();
      expect(cost).toHaveProperty('perSecond');
      expect(cost).toHaveProperty('estimated');
      expect(cost).toHaveProperty('formatted');
    });

    it('should use the model cost as perSecond', () => {
      const cost = getInpaintingCost();
      expect(cost.perSecond).toBe(INPAINTING_MODEL.cost);
    });

    it('should scale estimated cost with inference steps', () => {
      const cost50 = getInpaintingCost(50);
      const cost100 = getInpaintingCost(100);
      expect(cost100.estimated).toBeCloseTo(cost50.estimated * 2, 6);
    });

    it('should format the cost as a dollar string', () => {
      const cost = getInpaintingCost(50);
      expect(cost.formatted).toMatch(/^~\$\d+\.\d{4}$/);
    });
  });

  describe('inpaintTattooDesign', () => {
    let fetchSpy;

    beforeEach(() => {
      // Mock fetch for the prediction API
      fetchSpy = vi.fn()
        // First call: create prediction
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'pred_123', status: 'succeeded', output: ['https://example.com/result.png'] })
        });

      vi.stubGlobal('fetch', fetchSpy);
    });

    it('should POST to /api/predictions with correct body shape', async () => {
      const { canvas } = makeMockCanvas();

      const result = await inpaintTattooDesign({
        imageUrl: 'data:image/png;base64,originalImage',
        maskCanvas: canvas,
        prompt: 'add a rose'
      });

      // The first fetch call should be the POST to create prediction
      expect(fetchSpy).toHaveBeenCalled();
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe('/api/predictions');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.version).toBe(INPAINTING_MODEL.version);
      expect(body.input.prompt).toBe('add a rose');
      expect(body.input.width).toBe(1024);
      expect(body.input.height).toBe(1024);
    });

    it('should return the output image URL on success', async () => {
      const { canvas } = makeMockCanvas();

      const result = await inpaintTattooDesign({
        imageUrl: 'data:image/png;base64,originalImage',
        maskCanvas: canvas,
        prompt: 'add a rose'
      });

      expect(result).toBe('https://example.com/result.png');
    });

    it('should throw on API error response', async () => {
      fetchSpy.mockReset();
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'rate limited' })
      });

      const { canvas } = makeMockCanvas();

      await expect(
        inpaintTattooDesign({
          imageUrl: 'data:image/png;base64,img',
          maskCanvas: canvas,
          prompt: 'test'
        })
      ).rejects.toThrow('rate limited');
    });
  });
});
