/**
 * Demo mock images are the ONLY thing a demo-mode reveal renders, so a dead
 * URL is a blank grid at the beat the whole session builds to. Two of the
 * four Unsplash photos this list used had 404'd by 2026-07-25, and the
 * design-session reveal showed two empty tiles out of four with no error —
 * the exact silent-failure class this repo refuses to ship.
 *
 * Pinning them to repo-local assets removes the failure mode entirely: a
 * missing file breaks the build-time check below instead of the demo.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { DEMO_MOCK_IMAGES } from './demo-images';

const PUBLIC_DIR = join(process.cwd(), 'public');

describe('DEMO_MOCK_IMAGES', () => {
  it('has one image per reveal slot (ADR-0012)', () => {
    expect(DEMO_MOCK_IMAGES).toHaveLength(4);
  });

  it('serves every image from the repo, never a third-party URL', () => {
    for (const src of DEMO_MOCK_IMAGES) {
      expect(src.startsWith('/')).toBe(true);
    }
  });

  it('points every entry at a file that actually exists', () => {
    for (const src of DEMO_MOCK_IMAGES) {
      expect(existsSync(join(PUBLIC_DIR, src))).toBe(true);
    }
  });
});
