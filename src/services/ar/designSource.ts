/**
 * Design source analysis for the live AR overlay.
 *
 * A design can only be overlaid on a camera feed if its background can be
 * stripped to real alpha. Flash art on white strips cleanly. An **on-skin
 * render does not** — nothing in it is white enough to remove, so the entire
 * rectangle survives opaque and the "preview" becomes a stranger's forearm
 * pasted over the user's own arm. That is the specific failure this module
 * exists to prevent, so the guard runs before anything is drawn and a
 * rejected design yields no canvas at all.
 *
 * Related: `PlacementPreview.tsx` (the static photo-composite track) carries
 * a private `stripWhiteBackground` with the same 235..255 ramp. The two were
 * written against the same constraint; once both have landed they should
 * collapse onto this module — see the PR for the follow-up.
 */

/** Pixels at or above this on every channel are treated as background white. */
const WHITE_FLOOR = 235;

/** Fully-white point of the ramp. Between the two, alpha falls off smoothly. */
const WHITE_CEIL = 255;

/** Below this alpha a pixel counts as already-transparent. */
const ALPHA_OPAQUE = 250;

/**
 * If this share of pixels already carries alpha, the provider returned true
 * RGBA and there is no white background to reason about.
 */
const NATIVE_ALPHA_MIN_FRACTION = 0.02;

/** Width of the sampled border ring, as a fraction of the shorter edge. */
const BORDER_FRACTION = 0.1;

/**
 * Share of the border ring that must be near-white to accept the design.
 *
 * The separation here is not subtle: flash art on white measures ~1.0 and an
 * on-skin render measures ~0.0, because skin fails the all-channels test (its
 * blue channel sits far below the others even on very pale tones). 0.6 sits
 * in the empty middle, leaving room for art that bleeds toward the edges.
 */
const WHITE_BORDER_MIN_FRACTION = 0.6;

export type DesignSourceReason =
  | 'native-alpha'
  | 'white-background'
  | 'on-skin-render'
  | 'unreadable-pixels';

export interface DesignSourceVerdict {
  usable: boolean;
  reason: DesignSourceReason;
  /** Measured share of near-white border pixels; null when pixels were unreadable. */
  whiteBorderFraction: number | null;
  /** User-facing explanation. Empty for the usable cases. */
  message: string;
}

/** Anything we can hand to `drawImage` and measure. */
export type DesignSource = HTMLImageElement | HTMLCanvasElement;

function sourceSize(source: DesignSource): { width: number; height: number } {
  const width =
    (source as HTMLImageElement).naturalWidth || (source as HTMLCanvasElement).width || 0;
  const height =
    (source as HTMLImageElement).naturalHeight || (source as HTMLCanvasElement).height || 0;
  return { width, height };
}

/**
 * Draw the source into a scratch canvas and read it back.
 * Returns null when the pixels are unreadable (tainted cross-origin canvas).
 */
function readPixels(
  source: DesignSource,
): { data: Uint8ClampedArray; width: number; height: number } | null {
  const { width, height } = sourceSize(source);
  if (!width || !height) return null;

  const scratch = document.createElement('canvas');
  scratch.width = width;
  scratch.height = height;
  const ctx = scratch.getContext('2d');
  if (!ctx) return null;

  try {
    ctx.drawImage(source, 0, 0);
    const image = ctx.getImageData(0, 0, width, height);
    return { data: image.data, width, height };
  } catch {
    // SecurityError from a tainted canvas, or a source that never decoded.
    return null;
  }
}

function isNearWhite(r: number, g: number, b: number): boolean {
  return r >= WHITE_FLOOR && g >= WHITE_FLOOR && b >= WHITE_FLOOR;
}

/**
 * Decide whether a design render can be overlaid on a live camera feed.
 *
 * Fails closed: anything we cannot measure is rejected rather than rendered
 * on a guess.
 */
export function analyzeDesignSource(source: DesignSource): DesignSourceVerdict {
  const pixels = readPixels(source);

  if (!pixels) {
    return {
      usable: false,
      reason: 'unreadable-pixels',
      whiteBorderFraction: null,
      message:
        "This design's image could not be read, so we can't confirm its background will lift cleanly off your skin. Try re-opening the design, or use the photo preview instead.",
    };
  }

  const { data, width, height } = pixels;

  // 1. Already RGBA? Then there is no white background in play.
  let transparentCount = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < ALPHA_OPAQUE) transparentCount++;
  }
  const totalPixels = width * height;
  if (transparentCount / totalPixels >= NATIVE_ALPHA_MIN_FRACTION) {
    return {
      usable: true,
      reason: 'native-alpha',
      whiteBorderFraction: 1,
      message: '',
    };
  }

  // 2. Sample the border ring. Ink lives in the middle in both cases, so the
  //    edge is what distinguishes paper from skin.
  const band = Math.max(1, Math.floor(Math.min(width, height) * BORDER_FRACTION));
  let borderCount = 0;
  let whiteCount = 0;

  for (let y = 0; y < height; y++) {
    const inVerticalBand = y < band || y >= height - band;
    for (let x = 0; x < width; x++) {
      const inBand = inVerticalBand || x < band || x >= width - band;
      if (!inBand) continue;
      const i = (y * width + x) * 4;
      borderCount++;
      if (isNearWhite(data[i], data[i + 1], data[i + 2])) whiteCount++;
    }
  }

  const whiteBorderFraction = borderCount > 0 ? whiteCount / borderCount : 0;

  if (whiteBorderFraction >= WHITE_BORDER_MIN_FRACTION) {
    return {
      usable: true,
      reason: 'white-background',
      whiteBorderFraction,
      message: '',
    };
  }

  return {
    usable: false,
    reason: 'on-skin-render',
    whiteBorderFraction,
    message:
      'This design was rendered onto skin rather than as flash art on white, so it has no background to remove — overlaying it would paste someone else\'s skin onto your camera. Regenerate the design as flash art to use the live preview.',
  };
}

/**
 * Re-draw a design with its near-white background lifted to real alpha.
 *
 * The soft 235..255 ramp keeps anti-aliased linework from developing hard
 * jagged edges. Callers should run {@link analyzeDesignSource} first —
 * stripping an on-skin render is a no-op that leaves the rectangle opaque.
 */
export function stripWhiteBackground(source: DesignSource): HTMLCanvasElement {
  const { width, height } = sourceSize(source);
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  if (!ctx) return out;

  ctx.drawImage(source, 0, 0);

  let image: ImageData;
  try {
    image = ctx.getImageData(0, 0, width, height);
  } catch {
    return out; // Tainted — the guard will already have rejected this.
  }

  const data = image.data;
  const span = WHITE_CEIL - WHITE_FLOOR;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // already clear

    const brightest = Math.max(data[i], data[i + 1], data[i + 2]);
    const darkest = Math.min(data[i], data[i + 1], data[i + 2]);

    // Only lift low-saturation bright pixels — coloured ink stays put.
    if (darkest < WHITE_FLOOR) continue;

    const ramp = (darkest - WHITE_FLOOR) / span; // 0 at the floor, 1 at pure white
    const nextAlpha = Math.round(data[i + 3] * (1 - ramp));
    data[i + 3] = Math.max(0, Math.min(255, nextAlpha));
    void brightest;
  }

  ctx.putImageData(image, 0, 0);
  return out;
}

export interface PreparedDesign {
  verdict: DesignSourceVerdict;
  /** Overlay-ready canvas, or null when the design was rejected. */
  canvas: HTMLCanvasElement | null;
}

/**
 * Guard then strip. A rejected design returns `canvas: null` so no caller can
 * render it by forgetting to check the verdict.
 */
export function prepareDesignForOverlay(source: DesignSource): PreparedDesign {
  const verdict = analyzeDesignSource(source);
  if (!verdict.usable) {
    return { verdict, canvas: null };
  }
  return { verdict, canvas: stripWhiteBackground(source) };
}
