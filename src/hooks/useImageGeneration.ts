import { useCallback, useEffect, useRef, useState } from 'react';
import { generateHighResDesign } from '../services/replicateService';
import { createAbortController } from '../services/fetchWithAbort';
import { optimizeForAR } from '../services/imageProcessingService';

// Types
export type ProgressStatus = 'idle' | 'running' | 'completed' | 'error';
export type GenerationMode = 'refine' | 'final';

export interface GenerationProgress {
  status: ProgressStatus;
  percent: number;
  etaSeconds: number | null;
}

export interface UserInput {
  subject?: string;
  style?: string;
  bodyPart?: string;
  vibes?: string[];
  negativePrompt?: string;
  aiModel?: string;
  [key: string]: any;
}

export interface GenerationResult {
  images?: string[];
  metadata?: Record<string, any>;
  userInput?: UserInput | null;
  [key: string]: any;
}

export interface ARAsset {
  url: string;
  size: number;
  sourceId: string;
}

export interface SessionEntry {
  id: string;
  parentId: string | null;
  mode: GenerationMode;
  images: string[];
  metadata: Record<string, any>;
  userInput: UserInput | null;
  createdAt: string;
}

export interface GenerateHighResOptions {
  finalize?: boolean;
  parentId?: string | null;
  userInputOverride?: UserInput | null;
}

export interface UseImageGenerationOptions {
  userInput?: UserInput;
}

export interface UseImageGenerationReturn {
  result: GenerationResult | null;
  arAsset: ARAsset | null;
  isGenerating: boolean;
  error: string | null;
  progress: GenerationProgress;
  queueLength: number;
  generateHighRes: (options?: GenerateHighResOptions) => Promise<GenerationResult | null>;
  cancelCurrent: () => void;
}

interface QueueTask<T> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

const GENERATION_STORAGE_KEY = 'tattester_generation_session';

function safeStorageGet<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn('[ImageGeneration] Failed to read storage:', error);
    return fallback;
  }
}

function safeStorageSet(key: string, value: any): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('[ImageGeneration] Failed to write storage:', error);
    return false;
  }
}

function createId(prefix: string = 'gen'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function buildSessionEntry(
  result: GenerationResult,
  mode: GenerationMode,
  parentId: string | null
): SessionEntry {
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

export function useImageGeneration(
  { userInput }: UseImageGenerationOptions = {}
): UseImageGenerationReturn {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [arAsset, setArAsset] = useState<ARAsset | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [queueLength, setQueueLength] = useState<number>(0);
  const [progress, setProgress] = useState<GenerationProgress>({
    status: 'idle',
    percent: 0,
    etaSeconds: null
  });

  const queueRef = useRef<QueueTask<GenerationResult | null>[]>([]);
  const processingRef = useRef<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const storeResult = useCallback((entry: SessionEntry) => {
    const existing = safeStorageGet<SessionEntry[]>(GENERATION_STORAGE_KEY, []);
    const updated = [...existing, entry].slice(-50);
    safeStorageSet(GENERATION_STORAGE_KEY, updated);
  }, []);

  const startProgressTimer = useCallback((expectedSeconds: number) => {
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

  const stopProgressTimer = useCallback((status: ProgressStatus = 'idle') => {
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

  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      queueRef.current.push({ task, resolve, reject } as any);
      setQueueLength(queueRef.current.length);
      processQueue();
    });
  }, [processQueue]);

  const cancelCurrent = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const generateHighRes = useCallback(async (
    options: GenerateHighResOptions = {}
  ): Promise<GenerationResult | null> => {
    const { finalize = false, parentId = null, userInputOverride = null } = options;
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
            .then((asset: any) => {
              setArAsset({
                url: asset.url,
                size: asset.size,
                sourceId: entry.id
              });
            })
            .catch((assetError: Error) => {
              console.warn('[ImageGeneration] AR optimization failed:', assetError);
            });
        }

        return response;
      } catch (err: any) {
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
