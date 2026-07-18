'use client';

import { useAuthStore } from '@/store/useAuthStore';
import AuthModal from './AuthModal';

/**
 * Renders the sign-in modal whenever an API call fails with
 * 401 AUTH_REQUIRED (or a client call needs a missing session).
 * Mounted once in the root layout; state lives in useAuthStore so
 * non-React code (fetchWithAbort, client-api-auth) can trigger it.
 */
export default function SignInPromptGate() {
  const visible = useAuthStore((s) => s.signInPromptVisible);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const dismiss = useAuthStore((s) => s.dismissSignInPrompt);

  if (!visible || isAuthenticated) return null;

  return <AuthModal onClose={dismiss} />;
}
