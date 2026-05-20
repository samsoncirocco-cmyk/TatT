"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function LoginError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Login"
      description="Login failed to load."
      backHref="/"
      backLabel="Go Home"
    />
  );
}
