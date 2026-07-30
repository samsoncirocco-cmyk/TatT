import { describe, it, expect } from "vitest";
import {
  CARD_WIDTH_MM,
  DEFAULT_TATTOO_WIDTH_MM,
  MAX_TATTOO_WIDTH_MM,
  MIN_TATTOO_WIDTH_MM,
  clampTattooWidthMm,
  displaySize,
  fromMm,
  heightMmForWidth,
  isPlausiblePxPerMm,
  pxForMm,
  pxPerMmFromCardWidth,
  toMm,
} from "./trueSizeMath";

describe("pxPerMmFromCardWidth — the calibration equation", () => {
  it("divides the matched outline width by the ID-1 card width", () => {
    // Outline matched at 342.4px against an 85.6mm card → 4 px/mm.
    expect(pxPerMmFromCardWidth(342.4)).toBeCloseTo(4, 10);
  });

  it("recovers the exact px/mm for a typical laptop panel", () => {
    // A 4.5 px/mm screen draws the card at 385.2px.
    const cardPx = 4.5 * CARD_WIDTH_MM;
    expect(pxPerMmFromCardWidth(cardPx)).toBeCloseTo(4.5, 10);
  });

  it.each([[0], [-10], [NaN], [Infinity]])(
    "rejects a non-positive or non-finite card width (%s)",
    (bad) => {
      expect(() => pxPerMmFromCardWidth(bad)).toThrow(/positive/);
    }
  );
});

describe("isPlausiblePxPerMm", () => {
  it("accepts real-screen densities", () => {
    expect(isPlausiblePxPerMm(3.78)).toBe(true); // 96 PPI
    expect(isPlausiblePxPerMm(18)).toBe(true); // ~460 PPI phone
  });

  it("rejects corrupt values", () => {
    expect(isPlausiblePxPerMm(0)).toBe(false);
    expect(isPlausiblePxPerMm(1000)).toBe(false);
    expect(isPlausiblePxPerMm(NaN)).toBe(false);
    expect(isPlausiblePxPerMm("4")).toBe(false);
    expect(isPlausiblePxPerMm(null)).toBe(false);
  });
});

describe("unit conversion (cm/in toggle)", () => {
  it("converts cm to mm", () => {
    expect(toMm(7.5, "cm")).toBeCloseTo(75, 10);
  });

  it("converts inches to mm", () => {
    expect(toMm(3, "in")).toBeCloseTo(76.2, 10);
  });

  it("round-trips through both units without drift", () => {
    const mm = 123.4;
    expect(toMm(fromMm(mm, "cm"), "cm")).toBeCloseTo(mm, 10);
    expect(toMm(fromMm(mm, "in"), "in")).toBeCloseTo(mm, 10);
  });

  it("keeps the physical size identical across a toggle", () => {
    // 10cm shown, user flips to inches: same mm, new number.
    const mm = toMm(10, "cm");
    expect(displaySize(mm, "in")).toBeCloseTo(3.9, 10);
    expect(displaySize(mm, "cm")).toBe(10);
  });

  it("rounds display values to one decimal", () => {
    expect(displaySize(76.2, "in")).toBe(3);
    expect(displaySize(87, "cm")).toBe(8.7);
  });
});

describe("clampTattooWidthMm", () => {
  it("passes sane widths through", () => {
    expect(clampTattooWidthMm(120)).toBe(120);
  });

  it("clamps to the floor and ceiling", () => {
    expect(clampTattooWidthMm(1)).toBe(MIN_TATTOO_WIDTH_MM);
    expect(clampTattooWidthMm(9999)).toBe(MAX_TATTOO_WIDTH_MM);
  });

  it("falls back to the default for garbage", () => {
    expect(clampTattooWidthMm(NaN)).toBe(DEFAULT_TATTOO_WIDTH_MM);
  });
});

describe("pxForMm — physical size to screen pixels", () => {
  it("multiplies mm by the calibration", () => {
    // A 100mm tattoo on a 4 px/mm screen is 400 screen pixels.
    expect(pxForMm(100, 4)).toBe(400);
  });

  it("refuses an implausible calibration rather than rendering a lie", () => {
    expect(() => pxForMm(100, 0)).toThrow(/recalibrate/i);
    expect(() => pxForMm(100, 500)).toThrow(/recalibrate/i);
  });
});

describe("heightMmForWidth — aspect ratio preservation", () => {
  it("scales height by the image's pixel ratio", () => {
    // 1024×1536 image at 80mm wide → 120mm tall.
    expect(heightMmForWidth(80, 1024, 1536)).toBeCloseTo(120, 10);
  });

  it("is identity for square images", () => {
    expect(heightMmForWidth(100, 2048, 2048)).toBe(100);
  });

  it("rejects degenerate image dimensions", () => {
    expect(() => heightMmForWidth(100, 0, 100)).toThrow(/positive/);
    expect(() => heightMmForWidth(100, 100, NaN)).toThrow(/positive/);
  });
});
