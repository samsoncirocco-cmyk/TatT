'use client';

import type { ReactNode } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import AuthModal from '@/components/auth/AuthModal';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FEE123] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return <>{children}</>;
}
