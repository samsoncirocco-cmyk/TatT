import type { ReactNode } from "react";

/**
 * Quiet-dark headline (ADR-0032) — same display family as the loud register,
 * volume down: sentence case, smaller sizes, warm gray, no slash, no pink
 * period. Used on every commitment screen in place of SlashHeadline.
 */
type Size = "page" | "card";

type Props = {
  children: ReactNode;
  size?: Size;
  className?: string;
  as?: "h1" | "h2" | "h3";
};

const SIZES: Record<Size, string> = {
  page: "text-[30px] md:text-[40px] leading-[1.08]",
  card: "text-[20px] md:text-[24px] leading-[1.15]",
};

export default function QuietHeadline({
  children,
  size = "page",
  className = "",
  as: Tag = "h1",
}: Props) {
  return (
    <Tag className={`font-display-quiet text-quiet ${SIZES[size]} ${className}`}>
      {children}
    </Tag>
  );
}
