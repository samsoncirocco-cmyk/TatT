/**
 * Region → inpainting mask (ADR-0038 gear 1, "point and say").
 *
 * The user circles a flaw with a thumb or taps it. Both gestures land here as
 * a list of normalized points (0–1, resolution-independent so the same region
 * works on a 375px phone and a 1024px render), and both leave as the white-on
 * -black mask the existing inpainting pipeline already expects.
 *
 * Deliberately free of DOM event handling so the geometry is unit-testable
 * without a canvas: the only DOM touch is `buildRegionMask`, which is the one
 * function that must produce a real <canvas>.
 */

export interface RegionPoint {
  x: number;
  y: number;
}

/**
 * A stroke shorter than this (in normalized units, summed) is a tap, not a
 * lasso — a thumb never lands perfectly still, so an exact-point test would
 * misread every tap as a one-pixel scribble.
 */
export const TAP_PATH_THRESHOLD = 0.04;

/**
 * Radius of the region a tap stands for, as a fraction of the smaller edge.
 * Generous on purpose: gear 1 promises no precision pointing.
 */
export const TAP_RADIUS = 0.12;

/**
 * Feather applied to a lasso, as a fraction of the smaller edge. Inpainting
 * blends badly against a hard mask edge, and a thumb-drawn loop tends to
 * undershoot the thing it means to enclose.
 */
export const LASSO_PADDING = 0.02;

export function pathLength(points: RegionPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

/** True when the gesture reads as a tap rather than a drawn loop. */
export function isTapGesture(points: RegionPoint[]): boolean {
  if (points.length === 0) return false;
  return pathLength(points) < TAP_PATH_THRESHOLD;
}

/** Normalized bounding box of a region, clamped to the canvas. */
export function regionBounds(points: RegionPoint[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (points.length === 0) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.max(0, Math.min(...xs));
  const maxX = Math.min(1, Math.max(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const maxY = Math.min(1, Math.max(...ys));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Has the user selected anything worth generating against? */
export function hasRegion(points: RegionPoint[]): boolean {
  return points.length > 0;
}

/**
 * Build the mask the inpainting service wants: black = keep, white = redraw.
 *
 * Returns null when a 2d context is unavailable (jsdom, ancient browsers) so
 * callers surface an honest failure instead of shipping an empty mask to a
 * paid endpoint.
 */
export function buildRegionMask(
  points: RegionPoint[],
  width: number,
  height: number
): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || points.length === 0) return null;
  if (!(width > 0) || !(height > 0)) return null;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';

  const minEdge = Math.min(canvas.width, canvas.height);

  if (isTapGesture(points)) {
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x * canvas.width, last.y * canvas.height, TAP_RADIUS * minEdge, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  // Fill the enclosed loop, then stroke its outline so the feather lands on
  // both sides of the line the user actually drew.
  ctx.beginPath();
  ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x * canvas.width, points[i].y * canvas.height);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'white';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = LASSO_PADDING * minEdge * 2;
  ctx.stroke();

  return canvas;
}

/** SVG polyline `points` attribute for the on-screen lasso, in element pixels. */
export function toSvgPoints(points: RegionPoint[], width: number, height: number): string {
  return points.map((p) => `${p.x * width},${p.y * height}`).join(' ');
}
