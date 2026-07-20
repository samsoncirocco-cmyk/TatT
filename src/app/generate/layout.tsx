import type { ReactNode } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

/** The Forge spends real generation budget — signed-in users only. */
export default function GenerateLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
