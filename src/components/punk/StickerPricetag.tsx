/**
 * Sticker pricetag — cream paper, rotated -3deg, Anton over Space Mono.
 * Per design system: max one per screen. The "primary" line is Anton,
 * the "secondary" is Space Mono. Used for matches %, "Verified" badges,
 * "EXPLICIT / Content" warnings on the canvas.
 *
 *   <StickerPricetag primary="98%" secondary="Match" />
 */
type Props = {
  primary: string;
  secondary?: string;
  className?: string;
  size?: "sm" | "md";
};

export default function StickerPricetag({
  primary,
  secondary,
  className = "",
  size = "md",
}: Props) {
  const pad = size === "sm" ? "px-2 py-1" : "px-3 py-1";
  // Both lines scale together: the pricetag reads as a tidy rectangle only
  // while the condensed Anton primary and the wide Space Mono secondary
  // render at roughly equal width (Anton ≈ 1.4x the Mono px for equal width).
  const primarySize = size === "sm" ? "text-[13px]" : "text-[14px]";
  return (
    <div className={`sticker ${pad} ${className}`}>
      <div
        className={`font-display ${primarySize} tracking-widest leading-none`}
      >
        {primary}
      </div>
      {secondary && (
        <div className="font-body text-[10px] uppercase tracking-widest leading-none mt-0.5">
          {secondary}
        </div>
      )}
    </div>
  );
}
