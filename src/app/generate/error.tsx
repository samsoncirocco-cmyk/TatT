"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function GenerateError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Forge"
      headline="jammed"
      description="The Forge couldn't finish that generation."
      backHref="/generate/stencil"
      backLabel="Start From Stencil"
    />
  );
}
