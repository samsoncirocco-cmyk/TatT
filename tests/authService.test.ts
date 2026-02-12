import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/auth before importing the service
const mockSignInWithPopup = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({})),
}));

import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  onAuthStateChanged,
} from '@/services/authService';

const fakeUser = {
  uid: 'u1',
  email: 'test@test.com',
  displayName: 'Test',
  photoURL: null,
};

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signInWithGoogle returns the user', async () => {
    mockSignInWithPopup.mockResolvedValue({ user: fakeUser });
    const user = await signInWithGoogle();
    expect(user).toEqual(fakeUser);
    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
  });

  it('signInWithEmail calls signInWithEmailAndPassword', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
    const user = await signInWithEmail('a@b.com', 'pass');
    expect(user).toEqual(fakeUser);
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'a@b.com',
      'pass',
    );
  });

  it('signUpWithEmail calls createUserWithEmailAndPassword', async () => {
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: fakeUser });
    const user = await signUpWithEmail('a@b.com', 'pass');
    expect(user).toEqual(fakeUser);
    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'a@b.com',
      'pass',
    );
  });

  it('signOut delegates to firebase signOut', async () => {
    mockSignOut.mockResolvedValue(undefined);
    await signOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('onAuthStateChanged registers a listener and returns unsubscribe', () => {
    const unsub = vi.fn();
    mockOnAuthStateChanged.mockReturnValue(unsub);
    const cb = vi.fn();
    const result = onAuthStateChanged(cb);
    expect(mockOnAuthStateChanged).toHaveBeenCalledWith(expect.anything(), cb);
    expect(result).toBe(unsub);
  });

  it('signInWithGoogle propagates errors', async () => {
    mockSignInWithPopup.mockRejectedValue(new Error('popup closed'));
    await expect(signInWithGoogle()).rejects.toThrow('popup closed');
  });
});
