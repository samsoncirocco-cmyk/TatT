"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function ArtistProfileError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Profile"
      description="This artist's profile couldn't load."
      backHref="/artists"
      backLabel="Back to Roster"
    />
  );
}
