/**
 * `assessBackdrop` against REAL generator output, not synthetic buffers.
 *
 * designBackdrop.test.ts pins the guard's arithmetic with hand-built pixel
 * buffers. This pins its verdict on twelve actual Vertex Imagen renders, six
 * from each side of the prompt fix:
 *
 *   flash-*  the presentation clause front-loaded and the body-part anchor
 *            removed — flash art on white, which the guard must accept.
 *   scene-*  the previous prompt, which returned photographs of tattoos on
 *            forearms 12 times out of 12 — which the guard must reject.
 *
 * Two failures this catches that synthetic fixtures cannot:
 *
 *   1. A prompt regression that reintroduces on-skin renders is only visible
 *      as a pass-rate drop over real output. The `scene-*` half is a
 *      standing sample of exactly what that looks like.
 *   2. A guard loosened until it "passes more designs" — the fixtures make
 *      the on-skin half fail loudly rather than quietly becoming strippable.
 *      Compositing one of those pastes a stranger's arm onto the user's own
 *      photo, which is the bug the guard exists to prevent.
 *
 * Fixtures are downscaled to 320px lossless WebP purely for repo weight; the
 * verdicts are identical at full resolution.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { assessBackdrop } from './designBackdrop';

const FIXTURE_DIR = path.resolve(__dirname, '../../tests/fixtures/backdrop');

async function verdictFor(file: string) {
  const { data, info } = await sharp(path.join(FIXTURE_DIR, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return assessBackdrop({ data, width: info.width, height: info.height });
}

const fixtures = readdirSync(FIXTURE_DIR).filter(f => f.endsWith('.webp')).sort();
const flashArt = fixtures.filter(f => f.startsWith('flash-'));
const scenes = fixtures.filter(f => f.startsWith('scene-'));

describe('assessBackdrop over real renders', () => {
  it('has both halves of the corpus', () => {
    expect(flashArt).toHaveLength(6);
    expect(scenes).toHaveLength(6);
  });

  it.each(flashArt)('accepts flash art on white: %s', async file => {
    const verdict = await verdictFor(file);
    expect(verdict.kind).toBe('strippable');
    expect(verdict.borderBackdropFraction).toBeGreaterThan(0.9);
  });

  it.each(scenes)('rejects the on-skin photograph: %s', async file => {
    const verdict = await verdictFor(file);
    expect(verdict.kind).toBe('opaque-scene');
  });

  it('scores the two halves far apart, so the threshold is not a coin flip', async () => {
    const worstFlash = Math.min(
      ...(await Promise.all(flashArt.map(async f => (await verdictFor(f)).borderBackdropFraction)))
    );
    const bestScene = Math.max(
      ...(await Promise.all(scenes.map(async f => (await verdictFor(f)).borderBackdropFraction)))
    );
    // Real output clusters at the extremes rather than around the 0.5 line.
    // If this gap ever narrows, the guard is being asked to make a judgement
    // call it was never designed to make.
    expect(worstFlash - bestScene).toBeGreaterThan(0.5);
  });
});
