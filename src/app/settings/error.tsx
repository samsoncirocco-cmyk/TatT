"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function SettingsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Settings"
      description="Settings failed to load."
      backHref="/"
      backLabel="Go Home"
    />
  );
}
