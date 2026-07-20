import type { ReactNode } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function BookLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
