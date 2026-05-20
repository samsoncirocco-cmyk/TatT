import type { ReactNode } from "react";

/**
 * Slash headline — pink diagonal through one word, trailing pink period.
 * Per design system: exactly one slashed word per screen.
 *
 *   <SlashHeadline before="Describe the" slashed="tattoo" />
 *
 * Renders an h1 by default (override with `as`). Sizes default to the
 * stencil page's hero scale but accept any Tailwind text-[...] classes
 * via sizeClassName.
 */
type Size = "hero" | "section" | "form";

type Props = {
  before?: ReactNode;
  slashed: string;
  after?: ReactNode;
  period?: boolean;
  size?: Size;
  className?: string;
  as?: "h1" | "h2" | "h3";
};

const SIZES: Record<Size, string> = {
  hero: "text-[72px] sm:text-[112px] md:text-[148px] leading-[0.88]",
  section: "text-[48px] md:text-[80px] leading-[0.88]",
  form: "text-[40px] sm:text-[56px] leading-[0.92]",
};

export default function SlashHeadline({
  before,
  slashed,
  after,
  period = true,
  size = "section",
  className = "",
  as: Tag = "h1",
}: Props) {
  return (
    <Tag
      className={`font-display text-white tracking-[0.005em] ${SIZES[size]} ${className}`}
    >
      {before}
      {before ? <>&nbsp;</> : null}
      <span className="slash">
        <span>{slashed}</span>
      </span>
      {after ? <>&nbsp;{after}</> : null}
      {period && <span className="text-pink">.</span>}
    </Tag>
  );
}
