import { describe, it, expect } from 'vitest';
import {
  analyzeDesignSource,
  stripWhiteBackground,
  prepareDesignForOverlay,
} from '../designSource';

/**
 * These fixtures are drawn as real pixels — jsdom is backed by node-canvas
 * here, so `getImageData` returns true RGBA. The on-skin guard is the one
 * piece of the AR path that can be verified without a camera, so it is
 * verified against actual pixel data rather than a mock.
 */

const SIZE = 64;

function makeCanvas(paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  paint(ctx);
  return canvas;
}

/** Flash art: black linework on a white square. The shape AR expects. */
function flashArtOnWhite(): HTMLCanvasElement {
  return makeCanvas((ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#101010';
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** The failure case: ink rendered onto a photographed forearm. */
function onSkinRender(): HTMLCanvasElement {
  return makeCanvas((ctx) => {
    ctx.fillStyle = 'rgb(198,134,102)';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#101010';
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** A pale skin tone — the closest an on-skin render gets to tripping the white test. */
function paleSkinRender(): HTMLCanvasElement {
  return makeCanvas((ctx) => {
    ctx.fillStyle = 'rgb(241,220,198)';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#101010';
    ctx.fillRect(SIZE / 3, SIZE / 3, SIZE / 3, SIZE / 3);
  });
}

/** Provider returned true RGBA — nothing to strip, already usable. */
function nativeAlphaDesign(): HTMLCanvasElement {
  return makeCanvas((ctx) => {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#101010';
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function alphaAt(canvas: HTMLCanvasElement, x: number, y: number): number {
  const ctx = canvas.getContext('2d')!;
  return ctx.getImageData(x, y, 1, 1).data[3];
}

function rgbaAt(canvas: HTMLCanvasElement, x: number, y: number): number[] {
  const ctx = canvas.getContext('2d')!;
  return Array.from(ctx.getImageData(x, y, 1, 1).data);
}

describe('analyzeDesignSource', () => {
  it('accepts flash art on a white background', () => {
    const verdict = analyzeDesignSource(flashArtOnWhite());
    expect(verdict.usable).toBe(true);
    expect(verdict.reason).toBe('white-background');
  });

  it('accepts a design that already carries real alpha', () => {
    const verdict = analyzeDesignSource(nativeAlphaDesign());
    expect(verdict.usable).toBe(true);
    expect(verdict.reason).toBe('native-alpha');
  });

  it('REJECTS an on-skin render — the whole rectangle would survive opaque', () => {
    const verdict = analyzeDesignSource(onSkinRender());
    expect(verdict.usable).toBe(false);
    expect(verdict.reason).toBe('on-skin-render');
    expect(verdict.message).toMatch(/skin/i);
  });

  it('REJECTS a pale-skin on-skin render (the closest near-miss)', () => {
    const verdict = analyzeDesignSource(paleSkinRender());
    expect(verdict.usable).toBe(false);
    expect(verdict.reason).toBe('on-skin-render');
  });

  it('reports the measured border fraction so the rejection is explainable', () => {
    expect(analyzeDesignSource(flashArtOnWhite()).whiteBorderFraction).toBeGreaterThan(0.9);
    expect(analyzeDesignSource(onSkinRender()).whiteBorderFraction).toBeLessThan(0.05);
  });

  it('fails closed when the pixels cannot be read (tainted cross-origin canvas)', () => {
    // A cross-origin draw taints the *scratch* canvas the analyzer reads back
    // from, so the SecurityError surfaces on getImageData — patch the
    // prototype, which is what the real failure touches.
    const probe = document.createElement('canvas').getContext('2d') as any;
    const proto = Object.getPrototypeOf(probe);
    const realGetImageData = proto.getImageData;
    proto.getImageData = () => {
      throw new Error('SecurityError: tainted canvas');
    };

    try {
      const verdict = analyzeDesignSource(flashArtOnWhite());
      expect(verdict.usable).toBe(false);
      expect(verdict.reason).toBe('unreadable-pixels');
      expect(verdict.whiteBorderFraction).toBeNull();
    } finally {
      proto.getImageData = realGetImageData;
    }
  });
});

describe('stripWhiteBackground', () => {
  it('drives the white background to fully transparent', () => {
    const stripped = stripWhiteBackground(flashArtOnWhite());
    expect(alphaAt(stripped, 1, 1)).toBe(0);
  });

  it('leaves the ink fully opaque and still black', () => {
    const stripped = stripWhiteBackground(flashArtOnWhite());
    const [r, g, b, a] = rgbaAt(stripped, SIZE / 2, SIZE / 2);
    expect(a).toBe(255);
    expect(r).toBeLessThan(40);
    expect(g).toBeLessThan(40);
    expect(b).toBeLessThan(40);
  });

  it('ramps mid-greys partially rather than clipping anti-aliased edges', () => {
    const grey = makeCanvas((ctx) => {
      ctx.fillStyle = 'rgb(245,245,245)'; // inside the 235..255 ramp
      ctx.fillRect(0, 0, SIZE, SIZE);
    });
    const a = alphaAt(stripWhiteBackground(grey), SIZE / 2, SIZE / 2);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
  });

  it('preserves a design that already has alpha', () => {
    const stripped = stripWhiteBackground(nativeAlphaDesign());
    expect(alphaAt(stripped, 1, 1)).toBe(0);
    expect(alphaAt(stripped, SIZE / 2, SIZE / 2)).toBe(255);
  });
});

describe('prepareDesignForOverlay', () => {
  it('returns a stripped canvas for usable flash art', () => {
    const result = prepareDesignForOverlay(flashArtOnWhite());
    expect(result.verdict.usable).toBe(true);
    expect(result.canvas).not.toBeNull();
    expect(alphaAt(result.canvas!, 1, 1)).toBe(0);
  });

  it('returns no canvas at all for an on-skin render — the caller cannot render it by accident', () => {
    const result = prepareDesignForOverlay(onSkinRender());
    expect(result.verdict.usable).toBe(false);
    expect(result.canvas).toBeNull();
  });
});
