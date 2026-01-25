import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getHybridArtistMatches } from '../services/matchService.js';

// Types
export interface MatchContext {
  style?: string;
  bodyPart?: string;
  layerCount?: number;
  location?: string;
  embeddingVector?: number[] | null;
  [key: string]: any;
}

export interface ArtistMatch {
  id: string;
  name: string;
  score: number;
  location?: string;
  styles?: string[];
  portfolioImages?: string[];
  breakdown?: Record<string, number>;
  reasoning?: string;
  [key: string]: any;
}

export interface CachedMatchData {
  matches: ArtistMatch[];
  total: number;
  updatedAt: string;
}

export interface UseArtistMatchingOptions {
  context?: MatchContext;
  debounceMs?: number;
}

export interface UseArtistMatchingReturn {
  matches: ArtistMatch[];
  totalMatches: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refreshMatches: () => Promise<void>;
}

const MATCH_STORAGE_KEY = 'tatt_match_pulse';

function safeSessionGet<T>(key: string, fallback: T): T {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn('[MatchPulse] Failed to read session storage:', error);
    return fallback;
  }
}

function safeSessionSet(key: string, value: any): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[MatchPulse] Failed to write session storage:', error);
  }
}

export function useArtistMatching(
  { context, debounceMs = 2000 }: UseArtistMatchingOptions = {}
): UseArtistMatchingReturn {
  const [matches, setMatches] = useState<ArtistMatch[]>([]);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSignatureRef = useRef<string>('');

  const contextSignature = useMemo(() => {
    if (!context) return '';
    return JSON.stringify({
      style: context.style,
      bodyPart: context.bodyPart,
      layerCount: context.layerCount,
      location: context.location,
      embeddingVector: context.embeddingVector ? 'vector' : null
    });
  }, [context]);

  const loadFromSession = useCallback(() => {
    const cached = safeSessionGet<CachedMatchData | null>(MATCH_STORAGE_KEY, null);
    if (cached?.matches) {
      setMatches(cached.matches);
      setTotalMatches(cached.total || cached.matches.length);
      setLastUpdated(cached.updatedAt || null);
    }
  }, []);

  const refreshMatches = useCallback(async () => {
    if (!context?.style && !context?.bodyPart && !context?.embeddingVector) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getHybridArtistMatches(context, {
        embeddingVector: context.embeddingVector,
        limit: 20
      });
      setMatches(result.matches || []);
      setTotalMatches(result.total || 0);
      setLastUpdated(new Date().toISOString());

      safeSessionSet(MATCH_STORAGE_KEY, {
        matches: result.matches || [],
        total: result.total || 0,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('[MatchPulse] Matching failed:', err);
      setError('Match data temporarily unavailable');
    } finally {
      setIsLoading(false);
    }
  }, [contextSignature, context]);

  useEffect(() => {
    loadFromSession();
  }, [loadFromSession]);

  useEffect(() => {
    if (!contextSignature) return;
    if (contextSignature === lastSignatureRef.current) return;

    lastSignatureRef.current = contextSignature;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      refreshMatches();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [contextSignature, debounceMs, refreshMatches]);

  useEffect(() => {
    if (!error) return;
    const retryTimer = setTimeout(() => {
      refreshMatches();
    }, 30000);
    return () => clearTimeout(retryTimer);
  }, [error, refreshMatches]);

  return {
    matches,
    totalMatches,
    isLoading,
    error,
    lastUpdated,
    refreshMatches
  };
}
