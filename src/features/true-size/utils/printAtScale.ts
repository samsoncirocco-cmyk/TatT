/**
 * Print-at-scale — a one-tap, print-ready PDF at the design's exact physical
 * size. PDF millimetres are real millimetres, so the only way a print comes
 * out wrong is the printer dialog "fitting" the page — which is why every
 * sheet carries a 10cm ruler bar the user can check with anything metric.
 *
 * Reuses the stencil feature's PDF machinery read-only: `createStencilPDF`
 * places the image at exact physical size with crop marks and a size label;
 * this module adds the ruler bar and the plain-English print instruction on
 * top, via new call sites only.
 */

import type { jsPDF } from "jspdf";
import { createStencilPDF } from "@/features/stencil/utils/pdfGenerator";
import {
  PAPER_SIZES,
  suggestPaperSize,
} from "@/features/stencil/utils/stencilCalibration";
import { MM_PER_INCH, heightMmForWidth } from "./trueSizeMath";

/** The printed check-bar is exactly 10cm — measurable with any ruler. */
export const RULER_LENGTH_MM = 100;

export const PRINT_TOO_BIG_MESSAGE =
  "That width doesn't fit on one sheet (about 19cm is the max). A print shop can tile bigger pieces.";

type PaperPreset = {
  key: string;
  widthInches: number;
  heightInches: number;
};

export type TrueSizePdfResult = {
  pdf: jsPDF;
  paper: PaperPreset;
  widthMm: number;
  heightMm: number;
};

/** True when a design of this physical size prints on one letter/A4 sheet. */
export function fitsOnOneSheet(widthMm: number, heightMm: number): boolean {
  const suggestion = suggestPaperSize({
    widthInches: widthMm / MM_PER_INCH,
    heightInches: heightMm / MM_PER_INCH,
  });
  return suggestion !== "custom";
}

/**
 * Draw the 10cm verification ruler along the bottom margin: a baseline with
 * a tick every centimetre, taller ticks at 0/5/10.
 */
function addScaleRuler(
  pdf: jsPDF,
  paperWidthInches: number,
  paperHeightInches: number
): void {
  const rulerInches = RULER_LENGTH_MM / MM_PER_INCH; // 3.937"
  const x0 = (paperWidthInches - rulerInches) / 2;
  const y = paperHeightInches - 0.55;
  const cmInches = 10 / MM_PER_INCH;

  pdf.setDrawColor(40);
  pdf.setLineWidth(0.01);
  pdf.line(x0, y, x0 + rulerInches, y);
  for (let cm = 0; cm <= 10; cm++) {
    const x = x0 + cm * cmInches;
    const tick = cm % 5 === 0 ? 0.16 : 0.09;
    pdf.line(x, y, x, y - tick);
  }

  pdf.setFontSize(9);
  pdf.text(
    "this bar is exactly 10 cm — measure it",
    paperWidthInches / 2,
    y + 0.18,
    { align: "center" }
  );
}

function addPrintInstruction(
  pdf: jsPDF,
  paperWidthInches: number,
  paperHeightInches: number
): void {
  pdf.setFontSize(9);
  pdf.text(
    "Print at 100% scale — no fit-to-page, no shrink. If the bar above isn't 10 cm, reprint.",
    paperWidthInches / 2,
    paperHeightInches - 0.28,
    { align: "center" }
  );
}

/**
 * Build the true-size PDF. Pure given a data URL and physical dimensions —
 * the browser-bound image loading lives in `exportTrueSizePdf`.
 *
 * Throws `PRINT_TOO_BIG_MESSAGE` when the design (plus margins) exceeds a
 * single letter/A4 sheet.
 */
export function buildTrueSizePdf({
  imageDataUrl,
  widthMm,
  heightMm,
  designName,
  designId,
}: {
  imageDataUrl: string;
  widthMm: number;
  heightMm: number;
  designName?: string;
  designId?: string;
}): TrueSizePdfResult {
  const widthInches = widthMm / MM_PER_INCH;
  const heightInches = heightMm / MM_PER_INCH;

  const paperKey = suggestPaperSize({ widthInches, heightInches });
  if (paperKey === "custom") {
    throw new Error(PRINT_TOO_BIG_MESSAGE);
  }
  const paper: PaperPreset =
    paperKey === "a4" ? PAPER_SIZES.a4 : PAPER_SIZES.letter;

  const pdf = createStencilPDF(
    imageDataUrl,
    {
      paperWidthInches: paper.widthInches,
      paperHeightInches: paper.heightInches,
      designWidthInches: widthInches,
      designHeightInches: heightInches,
    },
    {
      design_name: designName || "True-size tattoo preview",
      design_id: designId,
      dimensions: {
        width_inches: Number(widthInches.toFixed(3)),
        height_inches: Number(heightInches.toFixed(3)),
      },
      paper_size: paper.key,
      format: "pdf",
    }
  ) as jsPDF;

  addScaleRuler(pdf, paper.widthInches, paper.heightInches);
  addPrintInstruction(pdf, paper.widthInches, paper.heightInches);

  return { pdf, paper, widthMm, heightMm };
}

/**
 * Load a design image and hand back a PNG data URL plus its pixel
 * dimensions. Canvas re-encode rather than fetch: the app's design images
 * are same-origin data URLs or CORS-enabled GCS objects, both of which the
 * stencil pipeline already draws this way.
 */
export function loadImageAsPngDataUrl(
  imageUrl: string
): Promise<{ dataUrl: string; naturalWidth: number; naturalHeight: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Couldn't read the design image.");
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        });
      } catch {
        reject(new Error("Couldn't read the design image."));
      }
    };
    img.onerror = () => reject(new Error("Couldn't load the design image."));
    img.src = imageUrl;
  });
}

/**
 * One tap: design image → print-ready blob at exact physical width.
 * `variant: "stencil"` runs the stencil feature's threshold conversion first
 * (clean black lines for a tape-it-on test); "full" prints the design as-is.
 */
export async function exportTrueSizePdf({
  imageUrl,
  widthMm,
  designName,
  designId,
  variant = "full",
}: {
  imageUrl: string;
  widthMm: number;
  designName?: string;
  designId?: string;
  variant?: "full" | "stencil";
}): Promise<{ blob: Blob; filename: string; widthMm: number; heightMm: number }> {
  const { dataUrl, naturalWidth, naturalHeight } =
    await loadImageAsPngDataUrl(imageUrl);

  let printDataUrl = dataUrl;
  if (variant === "stencil") {
    const { convertToStencil } = await import(
      "@/features/stencil/services/stencilService"
    );
    printDataUrl = await convertToStencil(dataUrl);
  }

  const heightMm = heightMmForWidth(widthMm, naturalWidth, naturalHeight);
  const { pdf } = buildTrueSizePdf({
    imageDataUrl: printDataUrl,
    widthMm,
    heightMm,
    designName,
    designId,
  });

  const cm = Math.round((widthMm / 10) * 10) / 10;
  const slug =
    String(designName || "tattoo")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "tattoo";

  return {
    blob: pdf.output("blob") as Blob,
    filename: `${slug}-true-size-${cm}cm.pdf`,
    widthMm,
    heightMm,
  };
}
