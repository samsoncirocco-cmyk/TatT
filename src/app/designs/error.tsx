"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function DesignsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Designs"
      description="Your saved designs didn't load — they're still in localStorage."
      backHref="/generate/stencil"
      backLabel="Start a New Design"
    />
  );
}
