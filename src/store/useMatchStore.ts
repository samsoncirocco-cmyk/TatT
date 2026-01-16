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
    breakdown?: Record<string, number>;
}

interface MatchState {
    matches: ArtistMatch[];
    currentMatchId: string | null;
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null; // Timestamp

    setMatches: (matches: ArtistMatch[]) => void;
    selectMatch: (id: string | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearMatches: () => void;
    updateMatch: (id: string, updates: Partial<ArtistMatch>) => void;
}

export const useMatchStore = create<MatchState>()(
    persist(
        (set) => ({
            matches: [],
            currentMatchId: null,
            isLoading: false,
            error: null,
            lastUpdated: null,

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
        }),
        {
            name: 'tatt-match-storage',
            storage: createJSONStorage(() => localStorage),
            // Skip persisting loading state to avoid stuck skeletons on reload
            partialize: (state) => ({
                matches: state.matches,
                currentMatchId: state.currentMatchId,
                lastUpdated: state.lastUpdated
            }),
        }
    )
);
