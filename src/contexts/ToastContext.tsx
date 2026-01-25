/**
 * ToastContext
 *
 * Global toast notification system using React Context
 * Provides toast notifications accessible from any component
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types
export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export interface ToastFunction {
  (message: string): number;
  success: (message: string) => number;
  error: (message: string) => number;
  warning: (message: string) => number;
}

export interface ToastContextValue {
  toast: ToastFunction;
  toasts: Toast[];
  removeToast: (id: number) => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

// Context
const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info'): number => {
    const id = ++toastIdCounter;

    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500); // Slightly longer than toast duration for smooth exit

    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast: ToastFunction = useCallback((message: string) => addToast(message, 'info'), [addToast]) as ToastFunction;
  toast.success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
  toast.error = useCallback((message: string) => addToast(message, 'error'), [addToast]);
  toast.warning = useCallback((message: string) => addToast(message, 'warning'), [addToast]);

  const value: ToastContextValue = {
    toast,
    toasts,
    removeToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}
