import { useEffect, useMemo, useRef } from 'react';
import { subscribeToMatches } from '../services/firebase-match-service';
import { requestMatchUpdate } from '../services/matchUpdateService';
import { useMatchStore } from '../store/useMatchStore';

export function useRealtimeMatchPulse({ userId, context, currentDesign, debounceMs = 2000 } = {}) {
  const {
    matches,
    isLoading,
    error,
    setMatches,
    setLoading,
    setError
  } = useMatchStore();

  const totalMatches = matches.length;

  const debounceRef = useRef(null);

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

    const unsubscribe = subscribeToMatches(userId, (matchData) => {
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

    debounceRef.current = setTimeout(async () => {
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
