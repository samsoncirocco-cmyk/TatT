import { describe, it, expect } from 'vitest';
import {
  assessBackdrop,
  borderBackdropFraction,
  hasRealAlpha,
  stripBackdrop,
  BACKDROP_BORDER_THRESHOLD,
  type PixelBuffer,
} from './designBackdrop';

const SIZE = 64;

function blank(width = SIZE, height = SIZE): PixelBuffer {
  return { data: new Uint8ClampedArray(width * height * 4), width, height };
}

function paint(
  buf: PixelBuffer,
  fn: (x: number, y: number) => [number, number, number, number]
): PixelBuffer {
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < buf.width; x++) {
      const i = (y * buf.width + x) * 4;
      const [r, g, b, a] = fn(x, y);
      buf.data[i] = r;
      buf.data[i + 1] = g;
      buf.data[i + 2] = b;
      buf.data[i + 3] = a;
    }
  }
  return buf;
}

/** Is (x,y) inside the centred ink blob that stands in for the artwork? */
const inInk = (x: number, y: number) =>
  Math.abs(x - SIZE / 2) < SIZE * 0.2 && Math.abs(y - SIZE / 2) < SIZE * 0.2;

/** What the provider is supposed to return: black ink floating on white paper. */
function flashArtOnWhite(): PixelBuffer {
  return paint(blank(), (x, y) => (inInk(x, y) ? [10, 10, 10, 255] : [255, 255, 255, 255]));
}

/**
 * The render that must be refused: the design photographed on somebody's
 * arm. Skin is bright but never neutral — the blue channel trails the red by
 * a wide margin — so nothing reads as paper. A specular highlight is included
 * deliberately: a genuine hot spot must not be enough to pass the gate.
 */
function onSkinRender(): PixelBuffer {
  return paint(blank(), (x, y) => {
    if (inInk(x, y)) return [18, 14, 12, 255];
    const isHighlight = x > SIZE * 0.05 && x < SIZE * 0.12 && y > SIZE * 0.05 && y < SIZE * 0.12;
    if (isHighlight) return [252, 250, 247, 255];
    const shade = 200 + ((x * 7 + y * 3) % 24);
    return [shade, shade - 38, shade - 62, 255];
  });
}

/** A provider that honoured RGBA: real transparency, no paper at all. */
function rgbaCutout(): PixelBuffer {
  return paint(blank(), (x, y) => (inInk(x, y) ? [10, 10, 10, 255] : [0, 0, 0, 0]));
}

describe('designBackdrop', () => {
  describe('hasRealAlpha', () => {
    it('is true for a cut-out and false for a flat opaque render', () => {
      expect(hasRealAlpha(rgbaCutout())).toBe(true);
      expect(hasRealAlpha(flashArtOnWhite())).toBe(false);
      expect(hasRealAlpha(onSkinRender())).toBe(false);
    });
  });

  describe('borderBackdropFraction', () => {
    it('reads ~1 on flash art, whose margins are paper', () => {
      expect(borderBackdropFraction(flashArtOnWhite())).toBeGreaterThan(0.99);
    });

    it('reads near zero on an on-skin photo despite a specular highlight', () => {
      const fraction = borderBackdropFraction(onSkinRender());
      expect(fraction).toBeLessThan(0.1);
      expect(fraction).toBeLessThan(BACKDROP_BORDER_THRESHOLD);
    });

    it('stays high when dense artwork bleeds off one edge', () => {
      // Artwork running off the left edge still leaves three white margins.
      const buf = paint(blank(), (x) => (x < SIZE * 0.25 ? [10, 10, 10, 255] : [255, 255, 255, 255]));
      expect(borderBackdropFraction(buf)).toBeGreaterThan(BACKDROP_BORDER_THRESHOLD);
    });

    it('does not count bright-but-tinted pixels as paper', () => {
      // Warm off-white: red is pegged, blue is not. Skin looks like this.
      const buf = paint(blank(), () => [252, 240, 205, 255]);
      expect(borderBackdropFraction(buf)).toBe(0);
    });

    it('samples a usable ring even on a tiny image', () => {
      const tiny = paint(blank(6, 6), () => [255, 255, 255, 255]);
      expect(borderBackdropFraction(tiny)).toBe(1);
    });

    it('returns 0 for an empty buffer rather than dividing by zero', () => {
      expect(borderBackdropFraction(blank(0, 0))).toBe(0);
    });
  });

  describe('assessBackdrop', () => {
    it('passes flash art on white as strippable', () => {
      expect(assessBackdrop(flashArtOnWhite()).kind).toBe('strippable');
    });

    it('passes an RGBA cut-out straight through as transparent', () => {
      expect(assessBackdrop(rgbaCutout()).kind).toBe('transparent');
    });

    it('REFUSES an on-skin render — the guard this module exists for', () => {
      expect(assessBackdrop(onSkinRender()).kind).toBe('opaque-scene');
    });
  });

  describe('stripBackdrop', () => {
    it('erases the paper and leaves the ink untouched', () => {
      const buf = flashArtOnWhite();
      stripBackdrop(buf);

      const alphaAt = (x: number, y: number) => buf.data[(y * SIZE + x) * 4 + 3];
      expect(alphaAt(1, 1)).toBe(0); // corner paper — gone
      expect(alphaAt(SIZE / 2, SIZE / 2)).toBe(255); // ink — fully opaque
    });

    it('ramps the anti-aliased edge instead of hard-cutting it', () => {
      // 245 sits halfway up the 235..255 ramp, so alpha lands halfway too.
      const buf = paint(blank(2, 2), () => [245, 245, 245, 255]);
      stripBackdrop(buf);
      expect(buf.data[3]).toBe(128);

      // 235 is the ramp floor: still fully opaque, so mid-greys never fade.
      const floor = paint(blank(2, 2), () => [235, 235, 235, 255]);
      stripBackdrop(floor);
      expect(floor.data[3]).toBe(255);
    });

    it('leaves an on-skin frame all but fully opaque — which is exactly why it must be blocked', () => {
      // This is the bug in evidence. Stripping does essentially nothing to a
      // photograph: only the odd specular highlight clears the threshold, so
      // without assessBackdrop() the frame would multiply onto the user's own
      // photo as a near-solid rectangle of someone else's arm.
      const buf = onSkinRender();
      stripBackdrop(buf);

      const alphas = [...buf.data].filter((_, i) => i % 4 === 3);
      const stillOpaque = alphas.filter((a) => a === 255).length / alphas.length;
      expect(stillOpaque).toBeGreaterThan(0.99);
    });
  });
});
