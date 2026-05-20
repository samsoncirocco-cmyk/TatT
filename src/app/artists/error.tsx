"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function ArtistsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Roster"
      description="The artist directory didn't load."
      backHref="/"
      backLabel="Go Home"
    />
  );
}
