import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function Pulse({ children, className = '' }: { children?: ReactNode; className?: string }) {
  // Prefer CSS pulse to avoid layout jank in skeletons.
  return <div className={`animate-pulse ${className}`.trim()}>{children}</div>;
}

export function FadeIn({
  children,
  className = '',
  delay = 0
}: {
  children?: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideUp({
  children,
  className = '',
  delay = 0
}: {
  children?: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ type: 'spring', damping: 22, stiffness: 260, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

