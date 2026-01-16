import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;

    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isAuthenticated: false,

            login: (token, user) => set({
                token,
                user,
                isAuthenticated: true
            }),

            logout: () => set({
                token: null,
                user: null,
                isAuthenticated: false
            }),

            updateUser: (updates) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null
            })),
        }),
        {
            name: 'tatt-auth-storage',
            storage: createJSONStorage(() => localStorage),
            // Optional: partialize if we only want to persist some fields
            // partialize: (state) => ({ token: state.token, user: state.user }),
        }
    )
);
