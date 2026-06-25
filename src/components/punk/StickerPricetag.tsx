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
  const primarySize = size === "sm" ? "text-[10px]" : "text-[11px]";
  return (
    <div className={`sticker ${pad} ${className}`}>
      <div
        className={`font-display ${primarySize} tracking-widest leading-none`}
      >
        {primary}
      </div>
      {secondary && (
        <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
          {secondary}
        </div>
      )}
    </div>
  );
}
