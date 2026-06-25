'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  onAuthStateChanged,
} from '@/services/authService';
import { useAuthStore } from '@/store/useAuthStore';

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, login, logout: clearStore } = useAuthStore();

  const syncUser = useCallback(
    async (firebaseUser: User | null) => {
      if (firebaseUser) {
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
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      syncUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, [syncUser]);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(msg);
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Email sign-in failed';
      setError(msg);
    }
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signUpWithEmail(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-up failed';
      setError(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await signOut();
      clearStore();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-out failed';
      setError(msg);
    }
  }, [clearStore]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    loginWithGoogle,
    loginWithEmail,
    signUpEmail,
    logout,
  };
}
