"use client";

import PunkErrorBoundary from "@/components/punk/PunkErrorBoundary";

export default function SignupError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PunkErrorBoundary
      {...props}
      label="Signup"
      description="Sign up form failed to load."
      backHref="/login"
      backLabel="Try Login Instead"
    />
  );
}
