import type { ReactNode } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

/** The Studio spends real generation budget — signed-in users only. */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
