'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import { authDoorHref } from '@/lib/knownUser';

/**
 * Client-side auth gate for app surfaces (Forge/generate, Matches,
 * Designs, Book). Signed-out visitors are redirected with a `redirect`
 * param so they land back where they were headed after signing in —
 * to /signup on a device we've never seen sign in (the new-visitor
 * default, issue #101), to /login on a known device. While Firebase
 * resolves the session we show a styled hold state — never a white
 * flash, never a dead end.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || isAuthenticated) return;
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const destination = `${pathname ?? '/'}${search}`;
    router.replace(authDoorHref(destination));
  }, [loading, isAuthenticated, pathname, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-black">
        <span className="font-body text-[10px] uppercase tracking-[0.28em] text-white/50">
          <span className="text-pink">●</span>&nbsp;&nbsp;Checking&nbsp;your&nbsp;pass&hellip;
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
