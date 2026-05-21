"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function DesignDetailError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Design"
      description="This design's detail view crashed."
      backHref="/designs"
      backLabel="Back to Designs"
    />
  );
}
