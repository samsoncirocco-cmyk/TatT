/**
 * Design source preparation for the live AR overlay — the DOM adapter in
 * front of `@/lib/designBackdrop`.
 *
 * The classification itself (is this flash art on white, an RGBA cut-out, or a
 * photograph?) and the alpha ramp both live in `designBackdrop`, shared with
 * the placement-preview composite. That module is DOM-free and takes plain
 * pixel buffers; this one supplies the browser plumbing AR needs — reading an
 * <img> or <canvas> back, handling a tainted canvas, and returning something
 * renderable — without duplicating a single threshold.
 *
 * Why AR needs the guard at all: an on-skin render has no white to remove, so
 * the whole rectangle survives opaque and compositing it pastes a stranger's
 * forearm over the user's live camera feed.
 */

import {
  assessBackdrop,
  stripBackdrop,
  type PixelBuffer,
} from '@/lib/designBackdrop';

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

/**
 * AR-specific rejection copy. The shared module's messages talk about laying a
 * design onto "your own photo", which is the composite surface; here the
 * design would land on a live camera feed instead.
 */
const ON_SKIN_MESSAGE =
  "This design was rendered onto skin rather than as flash art on white, so it has no background to remove — overlaying it would paste someone else's skin onto your camera. Regenerate the design as flash art to use the live preview.";

const UNREADABLE_MESSAGE =
  "This design's image could not be read, so we can't confirm its background will lift cleanly off your skin. Try re-opening the design, or use the photo preview instead.";

function sourceSize(source: DesignSource): { width: number; height: number } {
  const width =
    (source as HTMLImageElement).naturalWidth || (source as HTMLCanvasElement).width || 0;
  const height =
    (source as HTMLImageElement).naturalHeight || (source as HTMLCanvasElement).height || 0;
  return { width, height };
}

interface ReadResult {
  pixels: PixelBuffer & { data: Uint8ClampedArray };
  imageData: ImageData;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

/**
 * Draw the source into a scratch canvas and read it back.
 * Returns null when the pixels are unreadable (tainted cross-origin canvas).
 */
function readPixels(source: DesignSource): ReadResult | null {
  const { width, height } = sourceSize(source);
  if (!width || !height) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
    ctx.drawImage(source, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    return {
      imageData,
      canvas,
      ctx,
      pixels: { data: imageData.data, width, height },
    };
  } catch {
    // SecurityError from a tainted canvas, or a source that never decoded.
    return null;
  }
}

/**
 * Decide whether a design render can be overlaid on a live camera feed.
 *
 * Fails closed: anything we cannot measure is rejected rather than rendered
 * on a guess.
 */
export function analyzeDesignSource(source: DesignSource): DesignSourceVerdict {
  const read = readPixels(source);
  if (!read) {
    return {
      usable: false,
      reason: 'unreadable-pixels',
      whiteBorderFraction: null,
      message: UNREADABLE_MESSAGE,
    };
  }

  const verdict = assessBackdrop(read.pixels);
  const fraction = verdict.borderBackdropFraction;

  switch (verdict.kind) {
    case 'transparent':
      return { usable: true, reason: 'native-alpha', whiteBorderFraction: fraction, message: '' };
    case 'strippable':
      return {
        usable: true,
        reason: 'white-background',
        whiteBorderFraction: fraction,
        message: '',
      };
    case 'opaque-scene':
    default:
      return {
        usable: false,
        reason: 'on-skin-render',
        whiteBorderFraction: fraction,
        message: ON_SKIN_MESSAGE,
      };
  }
}

/**
 * Re-draw a design with its near-white background lifted to real alpha.
 *
 * Callers should run {@link analyzeDesignSource} first — stripping a
 * photographic render is a no-op that leaves the rectangle opaque.
 */
export function stripWhiteBackground(source: DesignSource): HTMLCanvasElement {
  const read = readPixels(source);
  if (!read) {
    // Unreadable — hand back an empty canvas of the right size rather than a
    // half-drawn one. The guard will already have rejected this.
    const { width, height } = sourceSize(source);
    const blank = document.createElement('canvas');
    blank.width = width;
    blank.height = height;
    return blank;
  }

  stripBackdrop(read.pixels);
  read.ctx.putImageData(read.imageData, 0, 0);
  return read.canvas;
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
