import type { ReactNode } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function SmartMatchLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
