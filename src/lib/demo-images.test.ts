/**
 * Demo mock images are the ONLY thing a demo-mode reveal renders, so a dead
 * URL is a blank grid at the beat the whole session builds to. Two of the
 * four Unsplash photos this list used had 404'd by 2026-07-25, and the
 * design-session reveal showed two empty tiles out of four with no error —
 * the exact silent-failure class this repo refuses to ship. The mock artist
 * portfolios (match-pulse + firebase demo paths) used the same four photos
 * and rotted the same way.
 *
 * Pinning them to repo-local assets removes the failure mode entirely: a
 * missing file breaks the build-time check below instead of the demo.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { DEMO_MOCK_IMAGES, DEMO_PORTFOLIO_IMAGES, DEMO_AVATAR_IMAGES } from './demo-images';
import { assessBackdrop } from './designBackdrop';

const PUBLIC_DIR = join(process.cwd(), 'public');

describe.each([
  { list: 'DEMO_MOCK_IMAGES', images: DEMO_MOCK_IMAGES, designImagery: true },
  { list: 'DEMO_PORTFOLIO_IMAGES', images: DEMO_PORTFOLIO_IMAGES, designImagery: true },
  // Avatars are pinned to exist, but are exempt from the flash-on-white
  // gate — they are profile marks, not design imagery.
  { list: 'DEMO_AVATAR_IMAGES', images: DEMO_AVATAR_IMAGES, designImagery: false },
])('$list', ({ images, designImagery }) => {
  it('serves every image from the repo, never a third-party URL', () => {
    for (const src of images) {
      expect(src.startsWith('/')).toBe(true);
    }
  });

  it('points every entry at a file that actually exists', () => {
    for (const src of images) {
      expect(existsSync(join(PUBLIC_DIR, src))).toBe(true);
    }
  });

  /*
   * Flash art on white is a hard product constraint (ADR-0023), and the
   * placement preview enforces it on the actual pixels — an `opaque-scene`
   * verdict is refused outright. Demo renders have to clear the same bar as
   * real ones, or demo mode reaches the placement step and gets rejected.
   * Asserted against assessBackdrop rather than by eye, so swapping in a
   * photograph fails here instead of downstream. (Several public/portfolio
   * files ARE photos of paper on a desk, so this gate is live, not
   * theoretical.)
   */
  if (designImagery) {
    it.each(images)('is flash art on white, not a scene: %s', async (src) => {
      const { data, info } = await sharp(readFileSync(join(PUBLIC_DIR, src)))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const verdict = assessBackdrop({
        data: new Uint8ClampedArray(data),
        width: info.width,
        height: info.height,
      });
      expect(verdict.kind).not.toBe('opaque-scene');
    });
  }
});

describe('DEMO_MOCK_IMAGES', () => {
  it('has one image per reveal slot (ADR-0012)', () => {
    expect(DEMO_MOCK_IMAGES).toHaveLength(4);
  });
});

describe('DEMO_AVATAR_IMAGES', () => {
  it('has one avatar per getMockMatches artist', () => {
    expect(DEMO_AVATAR_IMAGES).toHaveLength(5);
  });
});

/*
 * ArtistCard.jsx falls back to this path whenever an artist record has no
 * profileImage. The fallback shipped pointing at a file that did not exist —
 * a broken image behind every avatar-less artist — so its presence is pinned
 * here alongside the demo sets.
 */
describe('default avatar fallback', () => {
  it('exists at the path ArtistCard falls back to', () => {
    expect(existsSync(join(PUBLIC_DIR, '/default-avatar.svg'))).toBe(true);
  });
});

describe('DEMO_PORTFOLIO_IMAGES', () => {
  it('has one image per mock artist persona', () => {
    expect(DEMO_PORTFOLIO_IMAGES).toHaveLength(4);
  });

  it('never reuses a generation mock, so a demo artist cannot appear to have already tattooed the generated design', () => {
    for (const src of DEMO_PORTFOLIO_IMAGES) {
      expect(DEMO_MOCK_IMAGES).not.toContain(src);
    }
  });
});
