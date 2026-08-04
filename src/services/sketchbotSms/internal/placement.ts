/**
 * "See it on your own body", over SMS.
 *
 * On the web this is a browser canvas: the user uploads a photo, the design's
 * near-white backdrop is ramped to real alpha, and the ink is multiplied onto
 * their skin. SMS has no canvas, so the same composite runs server-side with
 * sharp — the texter MMSes a photo of the placement and gets it back with the
 * design on it.
 *
 * The keying and the safety gate are IMPORTED from `@/lib/designBackdrop`,
 * not reimplemented. That module is deliberately DOM-free and says so: one
 * threshold, one ramp, one definition of "this render is safe to composite",
 * shared with the web preview. A second copy here would drift.
 *
 * PRIVACY: the body photo is composited from bytes in memory and never
 * persisted. The web never stores it either — it uploads only the flattened
 * result — and a channel that quietly started keeping photographs of
 * customers' bodies in a bucket would be a materially different product from
 * the one on the website. Only the composite is stored, and only because the
 * Brief carries it to the artist.
 */
import sharp from 'sharp';
import { assessBackdrop, stripBackdrop } from '@/lib/designBackdrop';

/** Fraction of the photo's width the design covers by default. */
const DEFAULT_WIDTH_FRACTION = 0.45;

/** Bounds on the size hint, so "way bigger" cannot swallow the whole frame. */
const MIN_WIDTH_FRACTION = 0.15;
const MAX_WIDTH_FRACTION = 0.9;

/** Cap on the photo we composite onto — carriers transcode large MMS anyway. */
const MAX_PHOTO_EDGE = 1600;

export type PlacementRefusal = 'unusable-design';

export interface PlacementComposite {
  /** PNG bytes of the design laid onto the photo. */
  buffer: Buffer;
}

/**
 * Read a size hint out of the texter's own words. This is the SMS analogue
 * of dragging a corner on the web canvas: not as expressive, but it is the
 * one adjustment that matters and it costs nothing to honour, since
 * compositing is local pixel work rather than a paid render.
 */
export function widthFractionFor(message: string): number {
  const text = (message || '').toLowerCase();
  let fraction = DEFAULT_WIDTH_FRACTION;
  if (/\b(?:bigger|larger|scale up|way bigger|huge|big)\b/.test(text)) fraction += 0.2;
  if (/\b(?:smaller|tinier|scale down|way smaller|tiny|small)\b/.test(text)) fraction -= 0.2;
  return Math.min(MAX_WIDTH_FRACTION, Math.max(MIN_WIDTH_FRACTION, fraction));
}

/**
 * Lay `designBuffer` onto `photoBuffer` and return the flattened PNG.
 *
 * Refuses with 'unusable-design' when the design is an opaque scene rather
 * than flash art on white. That refusal is the whole reason the gate is
 * shared with the web: multiplying an on-skin render onto the texter's photo
 * lays a STRANGER'S body over their own, which looks like a working feature
 * and is the exact failure `designBackdrop` exists to prevent.
 */
export async function compositeOnBody(
  designBuffer: Buffer,
  photoBuffer: Buffer,
  widthFraction: number = DEFAULT_WIDTH_FRACTION
): Promise<PlacementComposite | PlacementRefusal> {
  // Decode the design to raw RGBA so the shared pixel helpers can read it.
  const design = sharp(designBuffer).ensureAlpha();
  const { data, info } = await design
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = { data, width: info.width, height: info.height };
  const verdict = assessBackdrop(pixels);
  if (verdict.kind === 'opaque-scene') return 'unusable-design';
  if (verdict.kind === 'strippable') stripBackdrop(pixels);

  const keyed = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const photo = sharp(photoBuffer).rotate().resize({
    width: MAX_PHOTO_EDGE,
    height: MAX_PHOTO_EDGE,
    fit: 'inside',
    withoutEnlargement: true,
  });
  const photoMeta = await photo.metadata();
  const photoWidth = photoMeta.width ?? MAX_PHOTO_EDGE;
  const photoHeight = photoMeta.height ?? MAX_PHOTO_EDGE;

  const targetWidth = Math.max(1, Math.round(photoWidth * widthFraction));
  const scaled = await sharp(keyed)
    .resize({ width: targetWidth, fit: 'inside', withoutEnlargement: false })
    .toBuffer({ resolveWithObject: true });

  // Centred. The web lets the user drag; SMS has no pointer, so the honest
  // default is the middle of whatever they photographed.
  const left = Math.max(0, Math.round((photoWidth - scaled.info.width) / 2));
  const top = Math.max(0, Math.round((photoHeight - scaled.info.height) / 2));

  const buffer = await (await photo.toBuffer().then((b) => sharp(b)))
    .composite([{ input: scaled.data, left, top, blend: 'multiply' }])
    .png()
    .toBuffer();

  return { buffer };
}
