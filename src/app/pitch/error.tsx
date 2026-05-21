"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function PitchError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Pitch"
      description="The pitch view crashed before it could render."
      backHref="/"
      backLabel="Go Home"
    />
  );
}
