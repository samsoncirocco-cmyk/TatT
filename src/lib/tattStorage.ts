/**
 * tattStorage — local-only persistence for the punk demo UX.
 *
 * Separate from the real Firebase AuthProvider in @/components/AuthProvider.
 * These hooks back the customer-facing punk pages (designs, favorites,
 * bookings, demo "sign in") with localStorage so the app feels alive
 * without any network calls. SSR-safe: reads happen in useEffect, never
 * during render.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export const STORAGE_KEYS = {
  designs: "tatt:designs",
  favorites: "tatt:favorites",
  bookings: "tatt:bookings",
  user: "tatt:user",
} as const;

// Cross-tab + same-tab listeners
const SAME_TAB_EVENT = "tatt:storage";
function emitChange(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT, { detail: { key } }));
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    emitChange(key);
  } catch {
    /* quota / serialization failures are non-fatal in the demo */
  }
}

function safeRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
    emitChange(key);
  } catch {
    /* noop */
  }
}


// ─── Types ─────────────────────────────────────────────────────────────

export type TattDesign = {
  id: string;
  prompt: string;
  createdAt: number; // epoch ms
  color: string;     // tailwind bg class for the placeholder tile
  title?: string;
};

export type TattBooking = {
  id: string;
  artistSlug?: string;
  artistName?: string;
  designId?: string;
  date: string;     // ISO "YYYY-MM-DD"
  createdAt: number;
  depositPaid?: boolean;
};

export type TattUser = {
  id: string;
  email: string;
  name?: string;
  createdAt: number;
};

// ─── Generic hook for the list keys ────────────────────────────────────

function useStoredList<T>(key: string): {
  items: T[];
  hydrated: boolean;
  setItems: (next: T[]) => void;
} {
  const [items, setItemsState] = useState<T[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItemsState(safeRead<T[]>(key, []));
    setHydrated(true);
    const sync = (e: Event) => {
      if ("detail" in e && (e as CustomEvent).detail?.key !== key) return;
      setItemsState(safeRead<T[]>(key, []));
    };
    const storageSync = (e: StorageEvent) => {
      if (e.key === key) setItemsState(safeRead<T[]>(key, []));
    };
    window.addEventListener(SAME_TAB_EVENT, sync);
    window.addEventListener("storage", storageSync);
    return () => {
      window.removeEventListener(SAME_TAB_EVENT, sync);
      window.removeEventListener("storage", storageSync);
    };
  }, [key]);

  const setItems = useCallback(
    (next: T[]) => {
      setItemsState(next);
      safeWrite(key, next);
    },
    [key],
  );

  return { items, hydrated, setItems };
}


// ─── Designs ───────────────────────────────────────────────────────────

const DESIGN_COLORS = [
  "bg-pink",
  "bg-bone",
  "bg-cream",
  "bg-pink-deep",
  "bg-white/10",
];

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Non-hook write — for callers outside React render (event handlers in
 * non-React code, async callbacks that fire long after a hook closure
 * would have stale state). The hook variant inside `useDesigns` is
 * preferred when you're in a component because it updates local state
 * immediately; this helper just persists + fires the cross-tab event.
 */
export function addDesignToStorage(
  prompt: string,
  extra?: Partial<TattDesign>,
): TattDesign {
  const design: TattDesign = {
    id: genId(),
    prompt: (prompt || "").trim(),
    createdAt: Date.now(),
    color: DESIGN_COLORS[Math.floor(Math.random() * DESIGN_COLORS.length)],
    ...extra,
  };
  const current = safeRead<TattDesign[]>(STORAGE_KEYS.designs, []);
  safeWrite(STORAGE_KEYS.designs, [design, ...current]);
  return design;
}

export function useDesigns() {
  const { items, hydrated, setItems } = useStoredList<TattDesign>(STORAGE_KEYS.designs);

  const addDesign = useCallback(
    (prompt: string, extra?: Partial<TattDesign>): TattDesign => {
      const design: TattDesign = {
        id: genId(),
        prompt: prompt.trim(),
        createdAt: Date.now(),
        color: DESIGN_COLORS[Math.floor(Math.random() * DESIGN_COLORS.length)],
        ...extra,
      };
      const current = safeRead<TattDesign[]>(STORAGE_KEYS.designs, []);
      const next = [design, ...current];
      safeWrite(STORAGE_KEYS.designs, next);
      return design;
    },
    [],
  );

  const removeDesign = useCallback(
    (id: string) => {
      const current = safeRead<TattDesign[]>(STORAGE_KEYS.designs, []);
      setItems(current.filter((d) => d.id !== id));
    },
    [setItems],
  );

  return { designs: items, hydrated, addDesign, removeDesign };
}

// ─── Favorites ─────────────────────────────────────────────────────────

export function useFavorites() {
  const { items, hydrated, setItems } = useStoredList<string>(STORAGE_KEYS.favorites);

  const isFavorite = useCallback((slug: string) => items.includes(slug), [items]);

  const toggleFavorite = useCallback(
    (slug: string) => {
      const current = safeRead<string[]>(STORAGE_KEYS.favorites, []);
      const next = current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [slug, ...current];
      setItems(next);
    },
    [setItems],
  );

  return { favorites: items, hydrated, isFavorite, toggleFavorite };
}

// ─── Bookings ──────────────────────────────────────────────────────────

export function useBookings() {
  const { items, hydrated, setItems } = useStoredList<TattBooking>(STORAGE_KEYS.bookings);

  const addBooking = useCallback(
    (booking: Omit<TattBooking, "id" | "createdAt">): TattBooking => {
      const entry: TattBooking = {
        ...booking,
        id: genId(),
        createdAt: Date.now(),
      };
      const current = safeRead<TattBooking[]>(STORAGE_KEYS.bookings, []);
      safeWrite(STORAGE_KEYS.bookings, [entry, ...current]);
      return entry;
    },
    [],
  );

  const removeBooking = useCallback(
    (id: string) => {
      const current = safeRead<TattBooking[]>(STORAGE_KEYS.bookings, []);
      setItems(current.filter((b) => b.id !== id));
    },
    [setItems],
  );

  return { bookings: items, hydrated, addBooking, removeBooking };
}


// ─── User (Firebase Auth backed) ───────────────────────────────────────
//
// Source of truth is Firebase Auth. tatt:user localStorage is kept as a
// UX cache so the nav can render the signed-in chip before Firebase's
// onAuthStateChanged callback fires after hydration.
//
// signIn / signUp / signOut / updateUser are all async and surface
// errors via the returned `error` field (null when OK).

function firebaseToTattUser(fbUser: {
  uid: string;
  email: string | null;
  displayName: string | null;
}): TattUser {
  return {
    id: fbUser.uid,
    email: (fbUser.email || "").toLowerCase(),
    name: fbUser.displayName || undefined,
    createdAt: Date.now(),
  };
}

export function useUser() {
  const [user, setUserState] = useState<TattUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from cache + subscribe to Firebase
  useEffect(() => {
    // Read cache immediately so the nav doesn't flicker
    setUserState(safeRead<TattUser | null>(STORAGE_KEYS.user, null));
    setHydrated(true);

    let unsub: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const [
          { onAuthStateChanged: fbOnAuthStateChanged },
          { auth },
        ] = await Promise.all([
          import("firebase/auth"),
          import("@/lib/firebase"),
        ]);
        if (cancelled) return;
        unsub = fbOnAuthStateChanged(auth, (fbUser) => {
          if (fbUser) {
            const mapped = firebaseToTattUser(fbUser);
            safeWrite(STORAGE_KEYS.user, mapped);
            setUserState(mapped);
          } else {
            safeRemove(STORAGE_KEYS.user);
            setUserState(null);
          }
        });
      } catch (e) {
        // If Firebase fails to load (offline dev, missing env), the
        // localStorage cache stays as-is so the UI doesn't break.
        console.warn("[tattStorage] Firebase auth unavailable:", e);
      }
    })();

    // Cross-tab sync — picks up auth state changes from other tabs that
    // hit onAuthStateChanged → safeWrite first.
    const storageSync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.user) {
        setUserState(safeRead<TattUser | null>(STORAGE_KEYS.user, null));
      }
    };
    window.addEventListener("storage", storageSync);

    return () => {
      cancelled = true;
      if (unsub) unsub();
      window.removeEventListener("storage", storageSync);
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<TattUser | null> => {
      setError(null);
      try {
        const [{ signInWithEmail }] = await Promise.all([
          import("@/services/authService"),
        ]);
        const fbUser = await signInWithEmail(email.trim(), password);
        return firebaseToTattUser(fbUser);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Sign-in failed";
        setError(msg);
        return null;
      }
    },
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<TattUser | null> => {
      setError(null);
      try {
        const { signUpWithEmail } = await import("@/services/authService");
        const fbUser = await signUpWithEmail(email.trim(), password);
        return firebaseToTattUser(fbUser);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Sign-up failed";
        setError(msg);
        return null;
      }
    },
    [],
  );

  const updateUser = useCallback(
    async (patch: Partial<Pick<TattUser, "name" | "email">>) => {
      setError(null);
      try {
        const [{ updateProfile }, { auth }] = await Promise.all([
          import("firebase/auth"),
          import("@/lib/firebase"),
        ]);
        if (!auth.currentUser) return;
        if (patch.name !== undefined) {
          await updateProfile(auth.currentUser, {
            displayName: patch.name || null,
          });
        }
        // Email updates need re-auth; intentionally not supported here.
        // Sync cache from new Firebase state.
        const next = firebaseToTattUser(auth.currentUser);
        safeWrite(STORAGE_KEYS.user, next);
        setUserState(next);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Update failed";
        setError(msg);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    setError(null);
    try {
      const { signOut: fbSignOut } = await import("@/services/authService");
      await fbSignOut();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-out failed";
      setError(msg);
    }
  }, []);

  return { user, hydrated, error, signIn, signUp, updateUser, signOut };
}

/**
 * Back-compat alias — `useDemoUser` was the localStorage-only hook before
 * this file bridged to Firebase. Existing callsites (StudioShell, /login,
 * /signup, /settings) keep working via the alias; new code should import
 * useUser directly.
 */
export const useDemoUser = useUser;
