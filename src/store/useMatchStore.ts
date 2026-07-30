import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Define Match Interface based on Artist/Match data structure
export interface ArtistMatch {
    artistId: string;
    artistName: string;
    matchScore: number;
    tags: string[];
    bio?: string;
    location?: string;
    styles?: string[];
    imageUrl?: string;
    instagramUrl?: string;
    availability?: string;
    distance?: number;
    reasoning?: string;
    /** Honest "why this artist" chips derived from the match payload at
     *  search time (src/features/match-pulse/services/matchReasonChips). */
    reasonChips?: string[];
    breakdown?: Record<string, number>;
}

interface MatchState {
    matches: ArtistMatch[];
    currentMatchId: string | null;
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null; // Timestamp
    /** False until zustand-persist finishes reading localStorage. */
    hasHydrated: boolean;

    setMatches: (matches: ArtistMatch[]) => void;
    selectMatch: (id: string | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearMatches: () => void;
    updateMatch: (id: string, updates: Partial<ArtistMatch>) => void;
    setHasHydrated: (hydrated: boolean) => void;
}

export const useMatchStore = create<MatchState>()(
    persist(
        (set) => ({
            matches: [],
            currentMatchId: null,
            isLoading: false,
            error: null,
            lastUpdated: null,
            hasHydrated: false,

            setMatches: (matches) => set({
                matches,
                lastUpdated: Date.now(),
                isLoading: false,
                error: null
            }),

            selectMatch: (id) => set({ currentMatchId: id }),

            setLoading: (loading) => set({ isLoading: loading }),

            setError: (error) => set({ error }),

            clearMatches: () => set({
                matches: [],
                currentMatchId: null,
                lastUpdated: null,
                error: null
            }),

            updateMatch: (id, updates) => set((state) => ({
                matches: state.matches.map(m =>
                    m.artistId === id ? { ...m, ...updates } : m
                )
            })),

            setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
        }),
        {
            name: 'tatt-match-storage',
            storage: createJSONStorage(() => localStorage),
            // Skip persisting loading/hydration flags — they are runtime-only.
            partialize: (state) => ({
                matches: state.matches,
                currentMatchId: state.currentMatchId,
                lastUpdated: state.lastUpdated
            }),
            onRehydrateStorage: () => (state, error) => {
                // Always flip the flag when rehydration settles (success or
                // empty/missing storage). Without this, consumers that treat
                // matches=[] as "no deck" flash that empty state on reload.
                if (error) {
                    console.warn('[MatchStore] Failed to rehydrate:', error);
                }
                // Prefer the action on the rehydrated snapshot — referencing
                // `useMatchStore` here can hit the temporal dead zone because
                // persist may invoke this during `create()`.
                state?.setHasHydrated(true);
            },
        }
    )
);

// Safety net: if rehydration errored with an undefined snapshot, or finished
// before a consumer subscribed, still unblock UI that waits on hasHydrated.
useMatchStore.persist.onFinishHydration(() => {
    useMatchStore.setState({ hasHydrated: true });
});
if (useMatchStore.persist.hasHydrated()) {
    useMatchStore.setState({ hasHydrated: true });
}
