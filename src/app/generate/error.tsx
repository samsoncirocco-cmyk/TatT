"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function GenerateError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Studio"
      headline="jammed"
      description="The Studio couldn't finish that generation."
      backHref="/generate/stencil"
      backLabel="Start From Stencil"
    />
  );
}
