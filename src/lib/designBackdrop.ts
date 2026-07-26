/**
 * Design backdrop analysis — the gate in front of every placement composite.
 *
 * The placement preview composites a generated design onto a photo of the
 * user's own body with a `multiply` blend. That only works when the design
 * is flash art on a plain white background: the near-white pixels are ramped
 * to real alpha first, so only ink lands on the skin.
 *
 * When the render is instead *photographed on skin* the strip finds nothing
 * to remove — no pixel is near-white — and the whole opaque frame survives.
 * Multiply then blends a stranger's forearm onto the user's own photo. That
 * is the failure this module exists to prevent: ADR-0023 pins presentation
 * to flash-art-on-white so it should never happen, but a prompt is a request,
 * not a guarantee, and the provider is free to ignore it. So we measure the
 * actual pixels rather than trusting the session's intent.
 *
 * The discriminating signal is the BORDER, not the overall white fraction.
 * Flash art on white always has white margins, however dense the artwork
 * gets — a solid blackwork panel still floats on paper. An on-skin render
 * has skin or studio background at the edges and scores near zero. A global
 * white fraction would fail a dense design; the border does not.
 *
 * DOM-free by design: it takes plain pixel buffers, so both the placement
 * preview (canvas 2D) and any future consumer can share one implementation
 * and one threshold. If you need this in another surface, import it — do not
 * write a second copy that drifts from this one.
 */

/** The shape of a `CanvasRenderingContext2D.getImageData()` result. */
export interface PixelBuffer {
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
}

/**
 * A pixel counts as backdrop when its DARKEST channel is still this bright —
 * i.e. every channel is >= this, so the pixel is near-white and near-neutral.
 * Testing the darkest channel is what keeps pale skin (high red, much lower
 * blue) from reading as paper.
 */
export const BACKDROP_MIN_CHANNEL = 235;

/** Ramp width: 235 -> fully opaque, 255 -> fully transparent. Keeps anti-aliased edges. */
const RAMP = 255 - BACKDROP_MIN_CHANNEL;

/** Outer ring sampled for the border test, as a fraction of the shorter edge. */
const BORDER_RING_FRACTION = 0.04;

/** Never sample a ring thinner than this, so tiny images still get a real reading. */
const MIN_RING_PX = 2;

/**
 * A design must have at least this much of its border reading as backdrop to
 * be considered flash-art-on-white. Real flash renders sit well above 0.9;
 * on-skin photographs sit near 0. 0.5 leaves room for a design that bleeds
 * off one edge while still rejecting anything photographic.
 */
export const BACKDROP_BORDER_THRESHOLD = 0.5;

/** Alpha below this means the pixel is already carrying real transparency. */
const OPAQUE_ALPHA = 250;

function isBackdrop(data: PixelBuffer['data'], i: number): boolean {
  return Math.min(data[i], data[i + 1], data[i + 2]) >= BACKDROP_MIN_CHANNEL;
}

/**
 * True when the image already carries a real alpha channel. Such a design
 * needs no strip and no border test — the provider did the work already, and
 * an RGBA cut-out legitimately has no white margin at all.
 */
export function hasRealAlpha(pixels: PixelBuffer): boolean {
  const { data } = pixels;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < OPAQUE_ALPHA) return true;
  }
  return false;
}

/**
 * Fraction of the outer ring that reads as backdrop, 0..1. This is the
 * flash-art-on-white test.
 */
export function borderBackdropFraction(pixels: PixelBuffer): number {
  const { data, width, height } = pixels;
  if (width <= 0 || height <= 0) return 0;

  const ring = Math.max(MIN_RING_PX, Math.round(Math.min(width, height) * BORDER_RING_FRACTION));
  let backdrop = 0;
  let total = 0;

  for (let y = 0; y < height; y++) {
    const verticalEdge = y < ring || y >= height - ring;
    for (let x = 0; x < width; x++) {
      // Inside the ring on neither axis — skip the interior entirely.
      if (!verticalEdge && x >= ring && x < width - ring) continue;
      total++;
      if (isBackdrop(data, (y * width + x) * 4)) backdrop++;
    }
  }

  return total === 0 ? 0 : backdrop / total;
}

export type BackdropVerdict =
  /** Already RGBA — composite as-is, no strip needed. */
  | { kind: 'transparent'; borderBackdropFraction: number }
  /** Flash art on white — strip the backdrop, then composite. */
  | { kind: 'strippable'; borderBackdropFraction: number }
  /** Opaque and not on white. Compositing this would paste the whole frame. */
  | { kind: 'opaque-scene'; borderBackdropFraction: number };

/**
 * Classify a design render. The caller must refuse to composite anything
 * that comes back `opaque-scene` — that is the on-skin case, and blending it
 * lays a photograph of someone else's body over the user's own.
 */
export function assessBackdrop(pixels: PixelBuffer): BackdropVerdict {
  const fraction = borderBackdropFraction(pixels);
  if (hasRealAlpha(pixels)) return { kind: 'transparent', borderBackdropFraction: fraction };
  if (fraction >= BACKDROP_BORDER_THRESHOLD)
    return { kind: 'strippable', borderBackdropFraction: fraction };
  return { kind: 'opaque-scene', borderBackdropFraction: fraction };
}

/**
 * Ramp the near-white backdrop to real alpha, in place. Only meaningful on a
 * `strippable` buffer — call `assessBackdrop` first.
 */
export function stripBackdrop(pixels: PixelBuffer): void {
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    const darkest = Math.min(data[i], data[i + 1], data[i + 2]);
    if (darkest >= BACKDROP_MIN_CHANNEL) {
      data[i + 3] = Math.round(255 * (1 - (darkest - BACKDROP_MIN_CHANNEL) / RAMP));
    }
  }
}

/** Copy that explains a rejection to the user without blaming them. */
export const OPAQUE_SCENE_MESSAGE =
  'This render is a photo, not flash art on white — it can’t be laid onto your own photo without pasting the whole picture. Pick another design.';

export const UNREADABLE_MESSAGE =
  'This design couldn’t be read for preview (its host blocked pixel access). Pick another design.';
