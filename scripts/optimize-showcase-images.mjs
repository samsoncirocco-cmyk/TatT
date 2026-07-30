// Generate web-optimized copies of the homepage showcase images (TAT-52).
//
// The four EXAMPLE_DESIGNS entries (src/lib/example-designs.ts) are raw
// 1024x1024 pipeline PNGs at ~1-1.4 MB each — ~4.6 MB of imagery on the
// landing page for tiles that render at ~264 CSS px. This script writes
// 640px WebP copies (2x retina for the largest tile) to
// public/portfolio/web/, leaving the originals untouched: demo mode
// (src/lib/demo-images.ts) and the placement preview keep consuming the
// full-resolution PNGs.
//
// Idempotent — re-running overwrites the copies. Run after changing the
// showcase set:
//   node scripts/optimize-showcase-images.mjs
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'portfolio', 'web');
mkdirSync(outDir, { recursive: true });

// Keep in sync with src/lib/example-designs.ts.
const SHOWCASE = [
    'artist_39_1768520785625_1',
    'artist_82_1768521419475_1',
    'artist_57_1768521126874_2',
    'artist_53_1768521082894_1',
];

const WIDTH = 640;
const QUALITY = 82;

for (const name of SHOWCASE) {
    const src = join(root, 'public', 'portfolio', `${name}.png`);
    const out = join(outDir, `${name}.webp`);
    const { size } = await sharp(src)
        .resize(WIDTH, WIDTH, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 6 })
        .toFile(out);
    console.log(`${name}.webp  ${(size / 1024).toFixed(1)} KB`);
}
