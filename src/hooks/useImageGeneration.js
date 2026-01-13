import { useCallback, useEffect, useRef, useState } from 'react';
import { generateHighResDesign } from '../services/replicateService';
import { createAbortController } from '../services/fetchWithAbort';
import { optimizeForAR } from '../services/imageProcessingService';

const GENERATION_STORAGE_KEY = 'tattester_generation_session';

function safeStorageGet(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn('[ImageGeneration] Failed to read storage:', error);
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('[ImageGeneration] Failed to write storage:', error);
    return false;
  }
}

function createId(prefix = 'gen') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function buildSessionEntry(result, mode, parentId) {
  return {
    id: createId(mode),
    parentId: parentId || null,
    mode,
    images: result.images || [],
    metadata: result.metadata || {},
    userInput: result.userInput || null,
    createdAt: new Date().toISOString()
  };
}

export function useImageGeneration({ userInput } = {}) {
  const [result, setResult] = useState(null);
  const [arAsset, setArAsset] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [queueLength, setQueueLength] = useState(0);
  const [progress, setProgress] = useState({
    status: 'idle',
    percent: 0,
    etaSeconds: null
  });

  const queueRef = useRef([]);
  const processingRef = useRef(false);
  const abortRef = useRef(null);
  const progressTimerRef = useRef(null);

  const storeResult = useCallback((entry) => {
    const existing = safeStorageGet(GENERATION_STORAGE_KEY, []);
    const updated = [...existing, entry].slice(-50);
    safeStorageSet(GENERATION_STORAGE_KEY, updated);
  }, []);

  const startProgressTimer = useCallback((expectedSeconds) => {
    const startTime = Date.now();
    setProgress({
      status: 'running',
      percent: 0,
      etaSeconds: expectedSeconds
    });

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    progressTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, expectedSeconds - elapsed);
      const percent = Math.min(0.95, elapsed / expectedSeconds);
      setProgress({
        status: 'running',
        percent,
        etaSeconds: Math.ceil(remaining)
      });
    }, 1000);
  }, []);

  const stopProgressTimer = useCallback((status = 'idle') => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setProgress(prev => ({
      status,
      percent: status === 'completed' ? 1 : 0,
      etaSeconds: status === 'completed' ? 0 : prev.etaSeconds
    }));
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) {
      setQueueLength(0);
      return;
    }

    processingRef.current = true;
    setQueueLength(queueRef.current.length);

    try {
      const response = await next.task();
      next.resolve(response);
    } catch (err) {
      next.reject(err);
    } finally {
      processingRef.current = false;
      processQueue();
    }
  }, []);

  const enqueue = useCallback((task) => {
    return new Promise((resolve, reject) => {
      queueRef.current.push({ task, resolve, reject });
      setQueueLength(queueRef.current.length);
      processQueue();
    });
  }, [processQueue]);

  const cancelCurrent = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const generateHighRes = useCallback(async ({ finalize = false, parentId = null, userInputOverride = null } = {}) => {
    const resolvedInput = userInputOverride || userInput;
    if (!resolvedInput || !resolvedInput.subject?.trim()) {
      setError('Please provide a prompt before generating.');
      return null;
    }

    return enqueue(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = createAbortController();
      abortRef.current = controller;

      setIsGenerating(true);
      setError(null);
      startProgressTimer(finalize ? 28 : 20);

      try {
        const response = await generateHighResDesign(resolvedInput, {
          finalize,
          signal: controller.signal
        });
        setResult(response);
        stopProgressTimer('completed');

        const entry = buildSessionEntry(response, finalize ? 'final' : 'refine', parentId);
        storeResult(entry);

        if (response.images?.length) {
          optimizeForAR(response.images[0])
            .then((asset) => {
              setArAsset({
                url: asset.url,
                size: asset.size,
                sourceId: entry.id
              });
            })
            .catch((assetError) => {
              console.warn('[ImageGeneration] AR optimization failed:', assetError);
            });
        }

        return response;
      } catch (err) {
        if (!err.message?.includes('cancelled')) {
          setError(err.message || 'High-res generation failed.');
        }
        stopProgressTimer('error');
        return null;
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    });
  }, [enqueue, startProgressTimer, stopProgressTimer, storeResult, userInput]);

  useEffect(() => {
    return () => {
      cancelCurrent();
      stopProgressTimer('idle');
    };
  }, [cancelCurrent, stopProgressTimer]);

  return {
    result,
    arAsset,
    isGenerating,
    error,
    progress,
    queueLength,
    generateHighRes,
    cancelCurrent
  };
}
