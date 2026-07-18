import { create } from 'zustand';

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
    signInPromptVisible: boolean;

    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
    promptSignIn: () => void;
    dismissSignInPrompt: () => void;
}

export const useAuthStore = create<AuthState>()(
        (set) => ({
            token: null,
            user: null,
            isAuthenticated: false,
            signInPromptVisible: false,

            login: (token, user) => set({
                token,
                user,
                isAuthenticated: true,
                signInPromptVisible: false
            }),

            promptSignIn: () => set({ signInPromptVisible: true }),

            dismissSignInPrompt: () => set({ signInPromptVisible: false }),

            logout: () => set({
                token: null,
                user: null,
                isAuthenticated: false
            }),

            updateUser: (updates) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null
            })),
        })
);
