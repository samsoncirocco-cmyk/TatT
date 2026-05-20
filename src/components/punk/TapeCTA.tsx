"use client";

import Link from "next/link";
import type { ReactNode, MouseEvent } from "react";

/**
 * Emergency-tape primary action. Pink fill, hard white shadow, arrow.
 * Renders as Link if href is supplied, else button. Variant "pink"
 * is the loud default; "ghost" is the hairline outline used as a
 * secondary action next to the tape.
 *
 * Per design system: maximum one pink TapeCTA per screen.
 *
 * Existing pages still inline the `tape press` classes — this is a
 * drop-in replacement that captures the pattern in one place.
 * Migrate opportunistically; do not refactor everything at once.
 */
type Size = "sm" | "md" | "lg";
type Variant = "pink" | "ghost";

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  className?: string;
  fullWidth?: boolean;
};

type LinkProps = CommonProps & {
  href: string;
  onClick?: never;
  type?: never;
  disabled?: never;
};

type ButtonProps = CommonProps & {
  href?: never;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
};

type Props = LinkProps | ButtonProps;

const SIZE_CLASSES: Record<Size, { padding: string; text: string; arrow: string }> = {
  sm: { padding: "px-6 py-3", text: "text-[20px] sm:text-[24px]", arrow: "text-[14px]" },
  md: { padding: "px-8 py-4", text: "text-[24px] sm:text-[28px]", arrow: "text-[18px]" },
  lg: { padding: "px-10 py-5", text: "text-[32px] sm:text-[38px]", arrow: "text-[20px]" },
};

export default function TapeCTA(props: Props) {
  const {
    children,
    variant = "pink",
    size = "lg",
    arrow = true,
    className = "",
    fullWidth = false,
  } = props;

  const { padding, text, arrow: arrowSize } = SIZE_CLASSES[size];

  const base = `press inline-flex items-center justify-center font-display ${padding} ${text} leading-none tracking-[0.02em] ${
    fullWidth ? "w-full" : ""
  }`;
  const variantCls =
    variant === "pink"
      ? "tape"
      : "text-white/80 hover:text-black hover:bg-pink border-2 hairline bg-transparent";

  const content = (
    <>
      {children}
      {arrow && <span className={`ml-3 ${arrowSize}`}>▸</span>}
    </>
  );

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={`${base} ${variantCls} ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`${base} ${variantCls} ${className} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {content}
    </button>
  );
}
