'use client';

import { useState, type FormEvent } from 'react';
import { useAuthContext } from '@/components/AuthProvider';

export default function AuthModal() {
  const { loginWithGoogle, loginWithEmail, signUpEmail, error, loading } = useAuthContext();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUpEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FEE123] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-lg">
        <h2
          className="mb-1 text-center text-2xl font-bold text-white"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="mb-6 text-center text-sm text-white/50">
          {isSignUp ? 'Start your tattoo journey' : 'Sign in to continue'}
        </p>

        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={submitting}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/30">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#154733]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#154733]"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#154733] py-3 text-sm font-semibold text-[#FEE123] transition hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-center text-xs text-red-400">{error}</p>
        )}

        <p className="mt-4 text-center text-xs text-white/40">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setEmail('');
              setPassword('');
            }}
            className="text-[#FEE123] underline underline-offset-2 hover:brightness-110"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}
