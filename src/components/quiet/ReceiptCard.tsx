import type { ReactNode } from "react";

/**
 * The one light card the quiet register allows (ADR-0032): a paper-colored
 * "receipt" for the FINAL money summary only — never a general-purpose
 * light panel, never a theme flip. At most one per screen.
 */
export default function ReceiptCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-receipt text-black p-6 md:p-8 ${className}`}>
      {children}
    </div>
  );
}
