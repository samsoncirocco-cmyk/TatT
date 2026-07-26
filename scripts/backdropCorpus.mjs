/**
 * Backdrop pass-rate measurement over a directory of renders.
 *
 * Side-effect free so both the CLI (scripts/measure-backdrop.mjs) and the
 * regression test can import it. Runs the REAL `assessBackdrop` guard
 * (src/lib/designBackdrop.ts) — the same code the placement preview gates
 * on — so the number this reports is the number that matters in product.
 *
 * Decoding is via sharp into raw RGBA, byte-identical to what
 * `CanvasRenderingContext2D.getImageData()` hands the guard in the browser.
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { assessBackdrop } from '../src/lib/designBackdrop.ts';

const IMAGE_RE = /\.(png|jpe?g|webp)$/i;

/** Decode one image file to the PixelBuffer shape the guard expects. */
export async function loadPixels(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Assess every image in `dir`. Returns one row per file. */
export async function measureDir(dir) {
  const files = (await readdir(dir)).filter(f => IMAGE_RE.test(f)).sort();
  const results = [];
  for (const file of files) {
    const verdict = assessBackdrop(await loadPixels(path.join(dir, file)));
    results.push({ file, kind: verdict.kind, fraction: verdict.borderBackdropFraction });
  }
  return results;
}

/** Roll rows up into the pass-rate summary. `opaque-scene` is the only failure. */
export function summarize(results) {
  const total = results.length;
  const byKind = {};
  for (const r of results) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  const failed = byKind['opaque-scene'] || 0;
  return { total, passed: total - failed, failed, byKind, passRate: total ? (total - failed) / total : 0 };
}
