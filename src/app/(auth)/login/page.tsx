'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuthContext } from '@/components/auth/AuthProvider';

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FEE123] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome back</h1>
          <p className="text-white/50 font-sans">Sign in to your TatT account</p>
        </div>
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
