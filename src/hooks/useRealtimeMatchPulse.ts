import { useEffect, useMemo, useRef } from 'react';
import { subscribeToMatches } from '../services/firebase-match-service';
import { requestMatchUpdate } from '../services/matchUpdateService';
import { useMatchStore, ArtistMatch } from '../store/useMatchStore';

// Types
interface DesignContext {
  style?: string;
  bodyPart?: string;
  layerCount?: number;
  location?: string;
  embeddingVector?: number[] | null;
}

interface CurrentDesign {
  id: string;
  prompt: string;
  style?: string;
  bodyPart?: string;
  location?: string;
  budget?: number;
  embeddingVector?: number[] | null;
}

interface UseRealtimeMatchPulseParams {
  userId?: string;
  context?: DesignContext;
  currentDesign?: CurrentDesign;
  debounceMs?: number;
}

interface UseRealtimeMatchPulseReturn {
  matches: ArtistMatch[];
  totalMatches: number;
  isLoading: boolean;
  error: string | null;
}

export function useRealtimeMatchPulse({
  userId,
  context,
  currentDesign,
  debounceMs = 2000
}: UseRealtimeMatchPulseParams = {}): UseRealtimeMatchPulseReturn {
  const {
    matches,
    isLoading,
    error,
    setMatches,
    setLoading,
    setError
  } = useMatchStore();

  const totalMatches = matches.length;

  const debounceRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToMatches(userId, (matchData: any) => {
      if (matchData?.artists) {
        setMatches(matchData.artists);
        setLoading(false);
        setError(null);
      } else if (matchData === null) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [userId, setMatches, setLoading, setError]);

  useEffect(() => {
    if (!userId || !contextSignature || !currentDesign) return;

    setLoading(true);
    setError(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        const response = await requestMatchUpdate({
          userId,
          designId: currentDesign.id,
          prompt: currentDesign.prompt,
          style: currentDesign.style,
          bodyPart: currentDesign.bodyPart,
          location: currentDesign.location,
          budget: currentDesign.budget,
          embeddingVector: currentDesign.embeddingVector || null
        });

        if (response?.artists) {
          setMatches(response.artists);
        }
      } catch (err) {
        console.error('[MatchPulse] Update failed:', err);
        setError('Match data temporarily unavailable');
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [userId, contextSignature, currentDesign, debounceMs, setMatches, setLoading, setError]);

  return {
    matches,
    totalMatches,
    isLoading,
    error
  };
}
