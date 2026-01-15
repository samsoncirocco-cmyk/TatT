import { useEffect, useMemo, useRef, useState } from 'react';
import { subscribeToMatches } from '../services/firebase-match-service';
import { requestMatchUpdate } from '../services/matchUpdateService';

export function useRealtimeMatchPulse({ userId, context, currentDesign, debounceMs = 2000 } = {}) {
  const [matches, setMatches] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
        setTotalMatches(matchData.artists.length);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId || !contextSignature || !currentDesign) return;

    setIsLoading(true);
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
          setTotalMatches(response.artists.length);
        }
      } catch (err) {
        console.error('[MatchPulse] Update failed:', err);
        setError('Match data temporarily unavailable');
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [userId, contextSignature, currentDesign, debounceMs]);

  return {
    matches,
    totalMatches,
    isLoading,
    error
  };
}
