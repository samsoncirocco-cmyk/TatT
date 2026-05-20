"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function BookingsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Bookings"
      description="Your bookings list didn't load — they're still in localStorage."
      backHref="/artists"
      backLabel="Browse Roster"
    />
  );
}
