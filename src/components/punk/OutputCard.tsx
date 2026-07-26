"use client";

import type { ReactNode } from "react";

/**
 * Generation output card — the "missing pattern" from DESIGN_SYSTEM.md.
 * One generated cut in a hard-edged cell: square image on bone, footer
 * row with the cut label and text actions. Selected state gets the pink
 * border, a 6px pink top bar, and a PICK sticker.
 *
 * Per design system: no radii, Anton/Space Mono only, hairline borders.
 */
type Action = {
  label: string;
  onClick: () => void;
  /** Render pink (primary action within the row). */
  accent?: boolean;
  disabled?: boolean;
};

type Props = {
  src: string;
  /** 1-based position in the batch → "Cut 01" etc. */
  index: number;
  sizeLabel?: string;
  selected?: boolean;
  onSelect?: () => void;
  /** When set, renders a "view large" affordance (click on the image itself
   *  stays "select" — enlarging is its own explicit control). */
  onExpand?: () => void;
  actions?: Action[];
  /** Extra badge content (e.g. "Saved") rendered top-left. */
  badge?: ReactNode;
  alt?: string;
};

export default function OutputCard({
  src,
  index,
  sizeLabel = "1024²",
  selected = false,
  onSelect,
  onExpand,
  actions = [],
  badge,
  alt,
}: Props) {
  return (
    <div
      className={`relative bg-black border-2 ${
        selected ? "border-pink" : "hairline"
      }`}
    >
      {selected && (
        <>
          <div className="absolute top-0 left-0 right-0 h-[6px] bg-pink z-[3]" />
          <div className="absolute top-3.5 right-3.5 sticker px-2.5 py-1 z-[3]">
            <div className="font-display text-[13px] tracking-widest leading-none">
              PICK
            </div>
            <div className="font-body text-[10px] uppercase tracking-[0.2em] leading-none mt-0.5">
              Selected
            </div>
          </div>
        </>
      )}

      {badge && (
        <div className="absolute top-3.5 left-3.5 z-[3]">{badge}</div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={onSelect}
          className="block w-full aspect-square bg-bone overflow-hidden press focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-pink"
          aria-pressed={selected}
          aria-label={`Select cut ${index}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt ?? `Generated cut ${index}`}
            className="w-full h-full object-cover"
          />
        </button>

        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            aria-label={`View cut ${index} large`}
            className="press absolute bottom-3.5 right-3.5 z-[3] bg-black/75 text-white hover:text-pink px-2.5 py-1.5 text-[10px] uppercase tracking-[0.2em] font-body border hairline-white"
          >
            ⤢ View
          </button>
        )}
      </div>

      <div className="flex items-center justify-between px-3.5 py-3 border-t-2 hairline">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-body tabular-nums">
          Cut&nbsp;{String(index).padStart(2, "0")}&nbsp;·&nbsp;{sizeLabel}
        </span>
        {actions.length > 0 && (
          <div className="flex gap-3 text-[10px] uppercase tracking-[0.15em] font-body">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
                className={`press disabled:opacity-40 disabled:cursor-not-allowed ${
                  a.accent ? "text-pink" : "text-white/60 hover:text-pink"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
