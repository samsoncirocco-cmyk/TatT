"use client";

import { useMemo, useState } from "react";
import {
  CARD_WIDTH_MM,
  CARD_HEIGHT_MM,
  DEFAULT_TATTOO_WIDTH_MM,
  clampTattooWidthMm,
  displaySize,
  pxPerMmFromCardWidth,
  toMm,
  type SizeUnit,
} from "../utils/trueSizeMath";
import {
  loadCalibration,
  saveCalibration,
  type TrueSizeCalibration,
} from "../utils/calibrationStore";
import {
  exportTrueSizePdf,
  fitsOnOneSheet,
  PRINT_TOO_BIG_MESSAGE,
} from "../utils/printAtScale";
import { downloadStencil } from "@/features/stencil/services/stencilService";

/**
 * True-size modal — regret story #1 is "I didn't know it would be that big"
 * (or that small). This is the one surface where the design meets real-world
 * millimetres, twice over:
 *
 * 1. On screen, after a one-time card calibration (every bank card on earth
 *    is 85.6mm wide — matching an outline to one tells us this screen's
 *    px/mm, stored per device).
 * 2. On paper, as a print-at-100% PDF with a measurable 10cm check bar.
 *
 * Loud surface, plain words: the layout keeps the punk chrome, but every
 * instruction here reads like a friend explaining it — the user is about to
 * judge a permanent decision, so nothing cryptic.
 */

const CARD_PX_MIN = 200;
const CARD_PX_MAX = 640;
const CARD_PX_DEFAULT = 340;

const GHOST_BUTTON =
  "text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-black hover:bg-pink border-2 hairline px-4 py-3 press font-body inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white/70";

export default function TrueSizeModal({
  imageUrl,
  designName,
  designId,
  onClose,
}: {
  imageUrl: string;
  designName: string;
  designId: string;
  onClose: () => void;
}) {
  const [calibration, setCalibration] = useState<TrueSizeCalibration | null>(
    () => loadCalibration(),
  );
  const [recalibrating, setRecalibrating] = useState(false);
  const [cardPx, setCardPx] = useState(() => {
    const stored = loadCalibration();
    return stored
      ? Math.round(stored.pxPerMm * CARD_WIDTH_MM)
      : CARD_PX_DEFAULT;
  });

  const [unit, setUnit] = useState<SizeUnit>("cm");
  const [widthInput, setWidthInput] = useState(() =>
    String(displaySize(DEFAULT_TATTOO_WIDTH_MM, "cm")),
  );
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [variant, setVariant] = useState<"full" | "stencil">("full");
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  const widthMm = useMemo(() => {
    const parsed = parseFloat(widthInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TATTOO_WIDTH_MM;
    return clampTattooWidthMm(toMm(parsed, unit));
  }, [widthInput, unit]);

  const showCalibrator = recalibrating || !calibration;
  const heightMm = imageRatio === null ? null : widthMm * imageRatio;
  // During calibration the preview isn't mounted, so height is unknown —
  // exportTrueSizePdf loads dimensions itself. After calibration, wait for
  // the preview onLoad so we can show the same disabled state / refusal
  // message as once height is known (instead of enabling then failing later).
  const printable =
    heightMm === null ? showCalibrator : fitsOnOneSheet(widthMm, heightMm);

  const switchUnit = (next: SizeUnit) => {
    if (next === unit) return;
    setUnit(next);
    setWidthInput(String(displaySize(widthMm, next)));
  };

  const lockCalibration = () => {
    const saved = saveCalibration(pxPerMmFromCardWidth(cardPx));
    if (saved) {
      setCalibration(saved);
      setRecalibrating(false);
    }
  };

  const print = async () => {
    if (printing) return;
    setPrinting(true);
    setPrintError(null);
    try {
      const { blob, filename } = await exportTrueSizePdf({
        imageUrl,
        widthMm,
        designName,
        designId,
        variant,
      });
      downloadStencil(blob, filename);
    } catch (e) {
      setPrintError(
        e instanceof Error ? e.message : "Couldn't build the PDF. Try again.",
      );
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="True size"
      onClick={onClose}
    >
      <div
        className="max-w-3xl mx-auto my-8 md:my-16 bg-black border-2 hairline"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b hairline px-5 py-4">
          <div className="font-display text-white text-[24px] leading-none tracking-[0.02em]">
            Actual size<span className="text-pink">.</span>
          </div>
          <button
            onClick={onClose}
            className="text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-pink press font-body"
            aria-label="Close"
          >
            ✕ Close
          </button>
        </div>

        <div className="px-5 py-6 space-y-8">
          {showCalibrator ? (
            <section>
              <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                ▸ One-time screen setup
              </div>
              <p className="text-[14px] text-white/80 font-body leading-[1.55] max-w-prose">
                Hold any bank or ID card flat against the screen and drag the
                slider until the outline is exactly the size of your card. That
                tells us your screen&apos;s real dimensions — we save it, so you
                only do this once per device.
              </p>
              <div className="mt-6 flex items-start">
                <div
                  data-testid="card-outline"
                  className="border-2 border-pink bg-pink/10"
                  style={{
                    width: `${cardPx}px`,
                    height: `${Math.round(
                      (cardPx * CARD_HEIGHT_MM) / CARD_WIDTH_MM,
                    )}px`,
                  }}
                >
                  <span className="block p-2 text-[10px] uppercase tracking-[0.2em] text-white/60 font-body">
                    Your card goes here
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={CARD_PX_MIN}
                max={CARD_PX_MAX}
                step={1}
                value={cardPx}
                onChange={(e) => setCardPx(Number(e.target.value))}
                className="mt-6 w-full accent-pink"
                aria-label="Match the outline to your card"
              />
              <div className="mt-5 flex items-center gap-4">
                <button onClick={lockCalibration} className={GHOST_BUTTON}>
                  ▸ It matches — lock it in
                </button>
                {calibration ? (
                  <button
                    onClick={() => setRecalibrating(false)}
                    className="text-[10px] uppercase tracking-[0.25em] text-white/50 hover:text-pink press font-body"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </section>
          ) : (
            <section>
              <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                ▸ How big will it be?
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label
                  className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-body"
                  htmlFor="true-size-width"
                >
                  Width
                </label>
                <input
                  id="true-size-width"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  value={widthInput}
                  onChange={(e) => setWidthInput(e.target.value)}
                  className="w-24 bg-black border-2 hairline px-3 py-2 text-[15px] text-white font-body tabular-nums"
                />
                <div
                  className="inline-flex border-2 hairline"
                  role="group"
                  aria-label="Units"
                >
                  {(["cm", "in"] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => switchUnit(u)}
                      aria-pressed={unit === u}
                      className={`px-3 py-2 text-[10px] uppercase tracking-[0.25em] font-body press ${
                        unit === u
                          ? "bg-pink text-black"
                          : "text-white/60 hover:text-pink"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setRecalibrating(true)}
                  className="ml-auto text-[10px] uppercase tracking-[0.25em] text-white/50 hover:text-pink press font-body"
                >
                  Recalibrate screen
                </button>
              </div>

              <p className="mt-4 text-[14px] text-white/80 font-body leading-[1.55]">
                This is the real size — hold your arm (or wherever it&apos;s
                going) up against the screen.
              </p>

              <div className="mt-4 border-2 hairline overflow-auto max-h-[55vh] bg-bone/5 p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`${designName} at actual size`}
                  data-testid="true-size-image"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0) {
                      setImageRatio(img.naturalHeight / img.naturalWidth);
                    }
                  }}
                  style={{
                    width: `${widthMm * (calibration?.pxPerMm ?? 0)}px`,
                    maxWidth: "none",
                  }}
                />
              </div>
            </section>
          )}

          {/* print row — physical units, so it works calibrated or not */}
          <section className="border-t hairline pt-6">
            <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
              ▸ Print it, cut it out, tape it on
            </div>
            <p className="text-[14px] text-white/80 font-body leading-[1.55] max-w-prose">
              Print at 100% — no fit-to-page. The sheet has a 10cm bar on it;
              check it with anything metric and you&apos;ll know the print is
              honest.
            </p>
            <label className="mt-4 flex items-center gap-3 text-[12px] text-white/70 font-body cursor-pointer">
              <input
                type="checkbox"
                checked={variant === "stencil"}
                onChange={(e) =>
                  setVariant(e.target.checked ? "stencil" : "full")
                }
                className="accent-pink"
              />
              Stencil lines only (cleaner for a tape-on test)
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={print}
                disabled={printing || !printable}
                className={GHOST_BUTTON}
              >
                {printing ? "Building PDF…" : "▸ Download print-ready PDF"}
              </button>
              {!printable ? (
                <span className="text-[12px] text-pink font-body">
                  {PRINT_TOO_BIG_MESSAGE}
                </span>
              ) : null}
            </div>
            {printError ? (
              <p className="mt-3 text-[12px] text-pink font-body" role="alert">
                {printError}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
