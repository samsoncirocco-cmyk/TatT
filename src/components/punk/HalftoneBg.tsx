import type { ReactNode } from "react";

/**
 * Halftone + VHS grain wrapper — the screenprint texture under the punk
 * studio. StudioShell uses this implicitly; standalone pages outside the
 * shell (404, marketing, future onboarding) can use this directly.
 *
 * Pair halftone + grain. They're a unit per the design system. Don't
 * use one without the other.
 */
type Props = {
  children: ReactNode;
  className?: string;
  as?: "div" | "main" | "section";
};

export default function HalftoneBg({
  children,
  className = "",
  as: Tag = "div",
}: Props) {
  return (
    <Tag
      className={`halftone grain min-h-screen text-white font-body bg-black ${className}`}
    >
      {children}
    </Tag>
  );
}
