"use client";

import Link from "next/link";
import type { ReactNode, MouseEvent } from "react";

/**
 * Quiet-dark action (ADR-0032) — TapeCTA's calm sibling for commitment
 * screens. No tape, no shadow, no rotation, no pink: a solid warm-gray
 * fill for the primary action, a hairline outline for the secondary.
 * Same href/button API as TapeCTA so surfaces can swap one for the other.
 */
type Size = "sm" | "md" | "lg";
type Variant = "solid" | "ghost";

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
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

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-5 py-2.5 text-[13px]",
  md: "px-7 py-3.5 text-[14px]",
  lg: "px-8 py-4 text-[15px]",
};

export default function QuietCTA(props: Props) {
  const {
    children,
    variant = "solid",
    size = "md",
    className = "",
    fullWidth = false,
  } = props;

  const base = `press inline-flex items-center justify-center font-body leading-none ${
    SIZE_CLASSES[size]
  } ${fullWidth ? "w-full" : ""}`;
  const variantCls =
    variant === "solid"
      ? "bg-quiet text-black hover:bg-white"
      : "border hairline-quiet text-quiet hover:border-quiet hover:text-white bg-transparent";

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={`${base} ${variantCls} ${className}`}>
        {children}
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
      {children}
    </button>
  );
}
