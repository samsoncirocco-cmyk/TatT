import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generatePreviewDesign } from '../services/replicateService';
import { createAbortController } from '../services/fetchWithAbort';

const PREVIEW_STORAGE_KEY = 'tattester_generation_session';

function safeStorageGet(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn('[SmartPreview] Failed to read storage:', error);
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('[SmartPreview] Failed to write storage:', error);
    return false;
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `preview-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function useSmartPreview({ userInput, enabled = true, debounceMs = 300 } = {}) {
  const [preview, setPreview] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const lastRequestedSignatureRef = useRef('');

  const inputSignature = useMemo(() => {
    if (!userInput) return '';
    try {
      return JSON.stringify(userInput);
    } catch (error) {
      return '';
    }
  }, [userInput]);

  const storePreview = useCallback((result, previewId) => {
    const existing = safeStorageGet(PREVIEW_STORAGE_KEY, []);
    const entry = {
      id: previewId,
      mode: 'preview',
      images: result.images || [],
      metadata: result.metadata || {},
      userInput: result.userInput || userInput,
      createdAt: new Date().toISOString()
    };
    const updated = [...existing, entry].slice(-50);
    safeStorageSet(PREVIEW_STORAGE_KEY, updated);
  }, [userInput]);

  const requestPreview = useCallback(async () => {
    if (!enabled || !userInput || !userInput.subject?.trim()) {
      return null;
    }

    if (inputSignature && lastRequestedSignatureRef.current === inputSignature) {
      return preview;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = createAbortController();
    abortRef.current = controller;

    setIsPreviewing(true);
    setError(null);
    lastRequestedSignatureRef.current = inputSignature;

    try {
      const result = await generatePreviewDesign(userInput, { signal: controller.signal });
      const previewId = createId();
      const previewResult = {
        ...result,
        metadata: {
          ...result.metadata,
          generationId: previewId
        }
      };
      setPreview(previewResult);
      setLastUpdatedAt(new Date().toISOString());
      storePreview(previewResult, previewId);
      return previewResult;
    } catch (err) {
      if (!err.message?.includes('cancelled')) {
        // Provide actionable error messages based on error type
        let errorMessage = err.message || 'Preview generation failed.';
        
        if (err.message?.includes('too long')) {
          errorMessage = 'Prompt too long. Simplify your design description or disable council enhancement.';
        } else if (err.message?.includes('authentication') || err.message?.includes('auth')) {
          errorMessage = 'Authentication failed. Check your configuration and restart.';
        } else if (err.message?.includes('timeout')) {
          errorMessage = 'Server took too long to respond. Try again in a moment.';
        } else if (err.message?.includes('rate limit') || err.message?.includes('429')) {
          errorMessage = 'Too many requests. Please wait before trying again.';
        } else if (err.message?.includes('cancelled')) {
          return null;
        }
        
        console.error('[SmartPreview] Generation error:', err);
        setError(errorMessage);
      }
      return null;
    } finally {
      setIsPreviewing(false);
      abortRef.current = null;
    }
  }, [enabled, userInput, storePreview, inputSignature, preview]);

  useEffect(() => {
    if (!enabled || !userInput || !userInput.subject?.trim()) {
      setPreview(null);
      setError(null);
      setLastUpdatedAt(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      requestPreview();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [enabled, userInput, debounceMs, inputSignature, requestPreview]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return {
    preview,
    isPreviewing,
    error,
    lastUpdatedAt,
    requestPreview
  };
}
