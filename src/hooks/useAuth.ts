/**
 * useAuth Hook
 *
 * Client-side authentication state management using Firebase Auth.
 * Provides signup, login, logout functions with error handling.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase-client';
import { setCurrentUser } from '../services/storage/StorageFactory';
import { hasPendingMigration, isMigrationComplete, migrateLocalStorageToFirestore } from '../services/storage/migrationService';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  signUp: (email: string, password: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

type UseAuthReturn = AuthState & AuthActions;

/**
 * Firebase error code to user-friendly message mapping
 */
function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please log in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'An error occurred. Please try again.';
  }
}

/**
 * useAuth Hook
 *
 * @returns Auth state and actions (signUp, logIn, logOut, getIdToken)
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Listen to auth state changes (handles persistence automatically)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
        setError(null);
      },
      (authError) => {
        console.error('[useAuth] Auth state change error:', authError);
        setError(authError);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Side effects on auth changes: update storage factory and run one-time migration.
  useEffect(() => {
    setCurrentUser(user ? { uid: user.uid } : null);

    if (!user) return;
    if (!hasPendingMigration()) return;
    if (isMigrationComplete(user.uid)) return;

    migrateLocalStorageToFirestore(user.uid)
      .then((res) => {
        if (res.designsMigrated > 0) {
          console.log(`[Auth] Migrated ${res.designsMigrated} designs from localStorage`);
        }
        if (res.errors.length > 0) {
          console.error('[Auth] Migration errors:', res.errors);
        }
      })
      .catch((err) => {
        console.error('[Auth] Migration failed:', err);
      });
  }, [user?.uid]);

  /**
   * Set server-side session cookie via /api/login endpoint.
   * Required for middleware to recognize authenticated users.
   */
  const setSessionCookie = async (idToken: string): Promise<void> => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });
    if (!response.ok) {
      console.warn('[useAuth] Failed to set session cookie:', response.status);
    }
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string): Promise<void> => {
    setError(null);
    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      await setSessionCookie(idToken);
    } catch (err: any) {
      const errorMessage = getAuthErrorMessage(err.code);
      const error = new Error(errorMessage);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log in with email and password
   */
  const logIn = async (email: string, password: string): Promise<void> => {
    setError(null);
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      await setSessionCookie(idToken);
    } catch (err: any) {
      const errorMessage = getAuthErrorMessage(err.code);
      const error = new Error(errorMessage);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log out current user
   */
  const logOut = async (): Promise<void> => {
    setError(null);
    setLoading(true);

    try {
      await fetch('/api/logout', { method: 'POST' });
      await signOut(auth);
    } catch (err: any) {
      const error = new Error('Failed to log out. Please try again.');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get ID token for authenticated user (for API calls)
   */
  const getIdToken = async (): Promise<string | null> => {
    if (!user) {
      return null;
    }

    try {
      return await user.getIdToken();
    } catch (err) {
      console.error('[useAuth] Failed to get ID token:', err);
      return null;
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signUp,
    logIn,
    logOut,
    getIdToken,
  };
}
