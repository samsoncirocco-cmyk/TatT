"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function MatchesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Matches"
      description="Couldn't load your matches. Your favorites are still saved."
      backHref="/artists"
      backLabel="Browse Roster Instead"
    />
  );
}
