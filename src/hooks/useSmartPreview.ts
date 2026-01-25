import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generatePreviewDesign } from '../services/replicateService';
import { createAbortController } from '../services/fetchWithAbort';

const PREVIEW_STORAGE_KEY = 'tattester_generation_session';

// Types
interface UserInput {
  subject?: string;
  style?: string;
  bodyPart?: string;
  size?: string;
  [key: string]: any;
}

interface PreviewMetadata {
  generationId?: string;
  [key: string]: any;
}

interface PreviewResult {
  images?: string[];
  metadata?: PreviewMetadata;
  userInput?: UserInput;
}

interface StoredPreviewEntry {
  id: string;
  mode: string;
  images: string[];
  metadata: PreviewMetadata;
  userInput: UserInput;
  createdAt: string;
}

interface UseSmartPreviewParams {
  userInput?: UserInput;
  enabled?: boolean;
  debounceMs?: number;
}

interface UseSmartPreviewReturn {
  preview: PreviewResult | null;
  isPreviewing: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
  requestPreview: () => Promise<PreviewResult | null>;
}

function safeStorageGet(key: string, fallback: StoredPreviewEntry[]): StoredPreviewEntry[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn('[SmartPreview] Failed to read storage:', error);
    return fallback;
  }
}

function safeStorageSet(key: string, value: StoredPreviewEntry[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('[SmartPreview] Failed to write storage:', error);
    return false;
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `preview-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function useSmartPreview({
  userInput,
  enabled = true,
  debounceMs = 300
}: UseSmartPreviewParams = {}): UseSmartPreviewReturn {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastRequestedSignatureRef = useRef<string>('');

  const inputSignature = useMemo(() => {
    if (!userInput) return '';
    try {
      return JSON.stringify(userInput);
    } catch (error) {
      return '';
    }
  }, [userInput]);

  const storePreview = useCallback((result: PreviewResult, previewId: string) => {
    const existing = safeStorageGet(PREVIEW_STORAGE_KEY, []);
    const entry: StoredPreviewEntry = {
      id: previewId,
      mode: 'preview',
      images: result.images || [],
      metadata: result.metadata || {},
      userInput: result.userInput || userInput || {},
      createdAt: new Date().toISOString()
    };
    const updated = [...existing, entry].slice(-50);
    safeStorageSet(PREVIEW_STORAGE_KEY, updated);
  }, [userInput]);

  const requestPreview = useCallback(async (): Promise<PreviewResult | null> => {
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
      const previewResult: PreviewResult = {
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
    } catch (err: any) {
      if (!err.message?.includes('cancelled')) {
        setError(err.message || 'Preview generation failed.');
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

    debounceRef.current = window.setTimeout(() => {
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
