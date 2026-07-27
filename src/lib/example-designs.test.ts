/**
 * The homepage example showcase is the one place a visitor sees the product's
 * output with zero signup and zero spend (TAT-36) — a dead image there is a
 * blank first impression. Same rot story as demo-images.test.ts: repo-local
 * paths are pinned to existing files so a missing asset fails here, at build
 * time, instead of on the landing page.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { EXAMPLE_DESIGNS } from './example-designs';

const PUBLIC_DIR = join(process.cwd(), 'public');

describe('EXAMPLE_DESIGNS', () => {
    it('serves every image from the repo, never a third-party URL', () => {
        for (const { src } of EXAMPLE_DESIGNS) {
            expect(src.startsWith('/')).toBe(true);
        }
    });

    it('points every entry at a file that actually exists', () => {
        for (const { src } of EXAMPLE_DESIGNS) {
            expect(existsSync(join(PUBLIC_DIR, src))).toBe(true);
        }
    });

    it('labels every entry for honest presentation (style + alt)', () => {
        for (const d of EXAMPLE_DESIGNS) {
            expect(d.style.length).toBeGreaterThan(0);
            // Alt text must say the work is AI-generated — the showcase's
            // honesty contract, kept even for screen-reader users.
            expect(d.alt).toMatch(/AI-generated/);
        }
    });
});
