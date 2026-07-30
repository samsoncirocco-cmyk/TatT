/**
 * True-size math — the whole feature rests on one number: pixels per
 * millimetre of the user's actual screen. CSS pixels lie (a "96dpi" CSS inch
 * is a fiction on nearly every panel), so we never guess PPI. The user holds
 * a standard ID-1 card (credit card, driver's licence — every one on earth is
 * 85.60mm wide) against the screen and drags an on-screen outline until it
 * matches. The outline's pixel width divided by 85.6 IS the screen's px/mm.
 *
 * Everything here is pure so the arithmetic is testable without a browser.
 */

/** ISO/IEC 7810 ID-1 — credit cards, bank cards, driver's licences. */
export const CARD_WIDTH_MM = 85.6;
/** ID-1 height, used only to draw the outline with the right proportions. */
export const CARD_HEIGHT_MM = 53.98;

export const MM_PER_INCH = 25.4;
export const MM_PER_CM = 10;

export type SizeUnit = "cm" | "in";

/**
 * Plausibility window for a calibration, in px/mm. 2 px/mm is a ~50 PPI
 * panel, 24 px/mm is ~600 PPI — nothing anyone owns falls outside it, so a
 * stored value outside the window is corrupt, not exotic hardware.
 */
export const MIN_PX_PER_MM = 2;
export const MAX_PX_PER_MM = 24;

/** Tattoo width bounds, mm. Below 10mm nothing reads; above 400mm no single
 *  sheet prints it and no screen shows it. */
export const MIN_TATTOO_WIDTH_MM = 10;
export const MAX_TATTOO_WIDTH_MM = 400;
/** A sane opener: 10cm — a solid forearm piece. */
export const DEFAULT_TATTOO_WIDTH_MM = 100;

/**
 * The calibration equation. The user matched an on-screen outline of
 * `cardWidthPx` pixels to a physical 85.6mm card, so the screen draws
 * `cardWidthPx / 85.6` pixels per millimetre.
 */
export function pxPerMmFromCardWidth(cardWidthPx: number): number {
  if (!Number.isFinite(cardWidthPx) || cardWidthPx <= 0) {
    throw new Error("Card width in pixels must be a positive number.");
  }
  return cardWidthPx / CARD_WIDTH_MM;
}

/** True when a px/mm value could describe a real screen. */
export function isPlausiblePxPerMm(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_PX_PER_MM &&
    value <= MAX_PX_PER_MM
  );
}

export function toMm(value: number, unit: SizeUnit): number {
  return unit === "in" ? value * MM_PER_INCH : value * MM_PER_CM;
}

export function fromMm(mm: number, unit: SizeUnit): number {
  return unit === "in" ? mm / MM_PER_INCH : mm / MM_PER_CM;
}

/** Round a user-facing size to one decimal for display (7.6cm, 3.0in). */
export function displaySize(mm: number, unit: SizeUnit): number {
  return Math.round(fromMm(mm, unit) * 10) / 10;
}

export function clampTattooWidthMm(mm: number): number {
  if (!Number.isFinite(mm)) return DEFAULT_TATTOO_WIDTH_MM;
  return Math.min(MAX_TATTOO_WIDTH_MM, Math.max(MIN_TATTOO_WIDTH_MM, mm));
}

/** How many screen pixels render a physical width, given a calibration. */
export function pxForMm(mm: number, pxPerMm: number): number {
  if (!Number.isFinite(mm) || mm < 0) {
    throw new Error("Physical size must be a non-negative number.");
  }
  if (!isPlausiblePxPerMm(pxPerMm)) {
    throw new Error("Calibration is out of range — recalibrate the screen.");
  }
  return mm * pxPerMm;
}

/**
 * Height that keeps the design's aspect ratio at a chosen physical width.
 * Trusting the image's own pixel ratio is exactly right: physical print and
 * screen scale are both uniform.
 */
export function heightMmForWidth(
  widthMm: number,
  naturalWidthPx: number,
  naturalHeightPx: number
): number {
  if (
    !Number.isFinite(naturalWidthPx) ||
    !Number.isFinite(naturalHeightPx) ||
    naturalWidthPx <= 0 ||
    naturalHeightPx <= 0
  ) {
    throw new Error("Image dimensions must be positive numbers.");
  }
  return widthMm * (naturalHeightPx / naturalWidthPx);
}
