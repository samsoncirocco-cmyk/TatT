/**
 * useToast Hook
 * 
 * Provides toast notification functionality throughout the app
 */

import { useState, useCallback } from 'react';

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdCounter;
    
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500); // Slightly longer than toast duration for smooth exit

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message) => addToast(message, 'info'), [addToast]);
  toast.success = useCallback((message) => addToast(message, 'success'), [addToast]);
  toast.error = useCallback((message) => addToast(message, 'error'), [addToast]);
  toast.warning = useCallback((message) => addToast(message, 'warning'), [addToast]);

  return {
    toast,
    toasts,
    removeToast
  };
}

