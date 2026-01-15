import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getHybridArtistMatches } from '../services/matchService.js';

const MATCH_STORAGE_KEY = 'tatt_match_pulse';

function safeSessionGet(key, fallback) {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn('[MatchPulse] Failed to read session storage:', error);
    return fallback;
  }
}

function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[MatchPulse] Failed to write session storage:', error);
  }
}

export function useArtistMatching({ context, debounceMs = 2000 } = {}) {
  const [matches, setMatches] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const debounceRef = useRef(null);
  const lastSignatureRef = useRef('');

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
    const cached = safeSessionGet(MATCH_STORAGE_KEY, null);
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
    } catch (err) {
      console.error('[MatchPulse] Matching failed:', err);
      setError('Match data temporarily unavailable');
    } finally {
      setIsLoading(false);
    }
  }, [contextSignature, context]); // Use contextSignature instead of context


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
  }, [contextSignature, debounceMs]); // refreshMatches is stable, don't include it


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
