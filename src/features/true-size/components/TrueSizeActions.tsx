"use client";

import { useState } from "react";
import TrueSizeModal from "./TrueSizeModal";

/**
 * The two size-reality entries on /designs/[id] — "see it actual size" and
 * "print it 1:1". Rendered as a fragment so both buttons sit inside the
 * page's existing CTA row (coordinate visually, don't restructure it).
 * Both open the same modal: the screen view and the print both hang off the
 * one question, "how wide will it really be?".
 */

const BUTTON_CLASS =
  "text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-black hover:bg-pink border-2 hairline px-4 py-4 press font-body inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white/70";

export default function TrueSizeActions({
  imageUrl,
  designName,
  designId,
}: {
  /** The design's cut. Undefined means a placeholder tile — nothing to size. */
  imageUrl?: string;
  designName: string;
  designId: string;
}) {
  const [open, setOpen] = useState(false);
  const disabled = !imageUrl;
  const hint = disabled
    ? "No cut on this design yet — nothing to size."
    : undefined;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={hint}
        className={BUTTON_CLASS}
      >
        ▸ See it actual size
      </button>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={hint}
        className={BUTTON_CLASS}
      >
        ▸ Print it 1:1
      </button>
      {open && imageUrl ? (
        <TrueSizeModal
          imageUrl={imageUrl}
          designName={designName}
          designId={designId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
