"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function BookError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Booking"
      description="The booking flow crashed. No deposit was charged."
      backHref="/artists"
      backLabel="Pick a Different Artist"
    />
  );
}
