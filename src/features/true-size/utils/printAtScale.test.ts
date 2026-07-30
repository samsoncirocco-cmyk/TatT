import { describe, it, expect, vi, beforeEach } from "vitest";

// The stencil feature's PDF factory is reused read-only; here it is mocked
// so the assertions are about OUR contract with it — that a chosen physical
// width in mm arrives as exactly the right number of inches.
const createStencilPDF = vi.fn();
vi.mock("@/features/stencil/utils/pdfGenerator", () => ({
  createStencilPDF: (...args: unknown[]) => createStencilPDF(...args),
}));

import {
  buildTrueSizePdf,
  fitsOnOneSheet,
  PRINT_TOO_BIG_MESSAGE,
  RULER_LENGTH_MM,
} from "./printAtScale";

type FakePdf = {
  line: ReturnType<typeof vi.fn>;
  text: ReturnType<typeof vi.fn>;
  setFontSize: ReturnType<typeof vi.fn>;
  setDrawColor: ReturnType<typeof vi.fn>;
  setLineWidth: ReturnType<typeof vi.fn>;
  output: ReturnType<typeof vi.fn>;
};

function makeFakePdf(): FakePdf {
  return {
    line: vi.fn(),
    text: vi.fn(),
    setFontSize: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    output: vi.fn(() => new Blob()),
  };
}

const PNG = "data:image/png;base64,x";

describe("buildTrueSizePdf — exact physical dimensions", () => {
  let fakePdf: FakePdf;

  beforeEach(() => {
    createStencilPDF.mockReset();
    fakePdf = makeFakePdf();
    createStencilPDF.mockReturnValue(fakePdf);
  });

  it("hands the stencil PDF factory the size in true inches", () => {
    // 101.6mm × 152.4mm is exactly 4" × 6".
    buildTrueSizePdf({
      imageDataUrl: PNG,
      widthMm: 101.6,
      heightMm: 152.4,
      designName: "Snake",
      designId: "abc",
    });

    expect(createStencilPDF).toHaveBeenCalledTimes(1);
    const [dataUrl, dims, metadata] = createStencilPDF.mock.calls[0];
    expect(dataUrl).toBe(PNG);
    expect(dims.designWidthInches).toBeCloseTo(4, 10);
    expect(dims.designHeightInches).toBeCloseTo(6, 10);
    // Letter sheet for a design this size.
    expect(dims.paperWidthInches).toBe(8.5);
    expect(dims.paperHeightInches).toBe(11);
    expect(metadata.design_name).toBe("Snake");
    expect(metadata.design_id).toBe("abc");
    expect(metadata.dimensions.width_inches).toBeCloseTo(4, 3);
  });

  it("converts an arbitrary mm width losslessly", () => {
    buildTrueSizePdf({ imageDataUrl: PNG, widthMm: 87, heightMm: 87 });
    const [, dims] = createStencilPDF.mock.calls[0];
    expect(dims.designWidthInches).toBeCloseTo(87 / 25.4, 10);
  });

  it("draws the 10cm verification ruler with a tick per centimetre", () => {
    buildTrueSizePdf({ imageDataUrl: PNG, widthMm: 100, heightMm: 100 });
    // Baseline + 11 ticks (0..10cm inclusive).
    expect(fakePdf.line).toHaveBeenCalledTimes(12);

    // Baseline spans exactly 100mm in page inches, centred on the sheet.
    const [x0, y0, x1] = fakePdf.line.mock.calls[0];
    expect(x1 - x0).toBeCloseTo(RULER_LENGTH_MM / 25.4, 10);
    expect((x0 + x1) / 2).toBeCloseTo(8.5 / 2, 10);
    expect(y0).toBeLessThan(11);
  });

  it("prints the plain-English 100%-scale instruction", () => {
    buildTrueSizePdf({ imageDataUrl: PNG, widthMm: 100, heightMm: 100 });
    const printed = fakePdf.text.mock.calls.map((c) => c[0]).join(" | ");
    expect(printed).toMatch(/10 cm/);
    expect(printed).toMatch(/100% scale/);
    expect(printed).toMatch(/fit-to-page/);
  });

  it("refuses a design that cannot print on one sheet", () => {
    expect(() =>
      buildTrueSizePdf({ imageDataUrl: PNG, widthMm: 300, heightMm: 300 })
    ).toThrow(PRINT_TOO_BIG_MESSAGE);
    expect(createStencilPDF).not.toHaveBeenCalled();
  });

  it("refuses a tall design that would overlap the verification ruler", () => {
    // Fits A4 under stencil margins alone (~284mm) but covers the ruler when centered.
    expect(() =>
      buildTrueSizePdf({ imageDataUrl: PNG, widthMm: 100, heightMm: 265 })
    ).toThrow(PRINT_TOO_BIG_MESSAGE);
    expect(createStencilPDF).not.toHaveBeenCalled();
  });
});

describe("fitsOnOneSheet", () => {
  it("accepts a forearm-sized piece", () => {
    expect(fitsOnOneSheet(100, 150)).toBe(true);
  });

  it("rejects a back piece", () => {
    expect(fitsOnOneSheet(300, 400)).toBe(false);
  });

  it("draws the line where letter paper plus margins runs out", () => {
    // 8.5" sheet − 0.5" margins = 8" ≈ 203mm printable width.
    expect(fitsOnOneSheet(203, 100)).toBe(true);
    expect(fitsOnOneSheet(210, 100)).toBe(false);
  });

  it("rejects tall designs that would cover the bottom ruler band", () => {
    // A4 max under stencil margins alone is ~284mm; with ruler clearance
    // (centered art needs 0.71" top and bottom) the cap is ~261mm.
    expect(fitsOnOneSheet(100, 260)).toBe(true);
    expect(fitsOnOneSheet(100, 265)).toBe(false);
  });
});
