'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { markKnownUser } from '@/lib/knownUser';

// authService (and with it firebase/auth + firebase/app, ~34 KB gz) is
// imported lazily. This hook sits in the root layout via AuthProvider, and
// this file's static import was the one edge that pulled Firebase into every
// route's First Load JS — every other call site (login, signup, tattStorage,
// getIdToken below) already used await import('@/services/authService').
// The auth listener still attaches on mount; it just loads after hydration
// instead of gating first paint.

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, login, logout: clearStore } = useAuthStore();

  const syncUser = useCallback(
    async (firebaseUser: User | null) => {
      if (firebaseUser) {
        // Any authenticated session marks this device as one with an
        // account, so the auth gate shows /login (not /signup) next time.
        markKnownUser();
        const token = await firebaseUser.getIdToken();
        login(token, {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        clearStore();
      }
    },
    [login, clearStore],
  );

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    import('@/services/authService').then(({ onAuthStateChanged }) => {
      if (cancelled) return;
      unsubscribe = onAuthStateChanged((firebaseUser) => {
        syncUser(firebaseUser);
        setLoading(false);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [syncUser]);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const { signInWithGoogle } = await import('@/services/authService');
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(msg);
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { signInWithEmail } = await import('@/services/authService');
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Email sign-in failed';
      setError(msg);
    }
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { signUpWithEmail } = await import('@/services/authService');
      await signUpWithEmail(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-up failed';
      setError(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      const { signOut } = await import('@/services/authService');
      await signOut();
      clearStore();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-out failed';
      setError(msg);
    }
  }, [clearStore]);

  const getIdToken = useCallback(async () => {
    const { getCurrentUser } = await import('@/services/authService');
    return getCurrentUser()?.getIdToken() ?? null;
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    loginWithGoogle,
    loginWithEmail,
    signUpEmail,
    logout,
    getIdToken,
  };
}
