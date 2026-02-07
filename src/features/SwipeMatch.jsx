import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TinderCard from 'react-tinder-card';
import { calculateMatches, trackSwipe } from '../utils/matching';
import artistsData from '../data/artists.json';
import Button from '../components/ui/Button';
import { useMatchStore } from '../store/useMatchStore';

function SwipeMatch() {
  const router = useRouter();
  const storedMatches = useMatchStore((state) => state.matches);
  const [artists, setArtists] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedArtists, setLikedArtists] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Use matches from store if available
      if (storedMatches && storedMatches.length > 0) {
        // Convert stored matches back to artist format
        const matchedArtists = storedMatches.map(m => ({
          id: m.artistId,
          name: m.artistName,
          score: m.matchScore,
          styles: m.styles || m.tags,
          bio: m.bio,
          location: m.location,
          portfolioImages: m.imageUrl ? [m.imageUrl] : [],
          instagram: m.instagramUrl,
          availability: m.availability,
          distance: m.distance,
          reasoning: m.reasoning,
          reasons: m.tags?.slice(0, 3),
          shopName: m.location || 'Studio',
        }));
        setArtists(matchedArtists);
        setCurrentIndex(matchedArtists.length - 1);
        setIsLoading(false);
        return;
      }

      // Fallback for development preview if direct access
      const allArtists = artistsData.artists || [];
      if (allArtists.length > 0) {
        setArtists(allArtists.slice(0, 10)); // Show top 10
        setCurrentIndex(Math.min(9, allArtists.length - 1));
        setIsLoading(false);
        return;
      }

      setError('No artists found matching your biometric intent.');
      setIsLoading(false);
    } catch (err) {
      setError('System Error: Selection Protocol Failed.');
      setIsLoading(false);
    }
  }, [storedMatches]);

  const swiped = (direction, artist) => {
    if (direction === 'right') {
      setLikedArtists((prev) => [...prev, artist]);
    }
    trackSwipe('user-123', artist.id, direction, artist.score || 85);
    setCurrentIndex((prev) => prev - 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-ducks-green border-t-ducks-yellow rounded-full animate-spin mb-6"></div>
        <p className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-ducks-green animate-pulse">Initializing Selection Protocol...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md glass-panel p-12 rounded-3xl border border-red-500/30">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-3xl font-display font-black mb-4 tracking-tighter text-red-500">Protocol Halt.</h2>
          <p className="text-gray-400 mb-8 font-medium italic">"{error}"</p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => router.push('/smart-match')}
              variant="secondary"
              className="w-full text-xs"
            >
              Adjust Biometric Intent
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden pt-20">
      <div className="mb-8 text-center relative z-10">
        <p className="text-ducks-green font-mono font-bold text-[10px] uppercase tracking-[0.5em] mb-2">Sim-Link Active // 0x4A2</p>
        <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tighter text-white">Selection <span className="text-ducks-green italic">Protocol</span></h1>
      </div>

      <div className="w-full max-w-sm h-[520px] relative">
        {artists.map((artist, index) => (
          <TinderCard
            key={artist.id}
            onSwipe={(dir) => swiped(dir, artist)}
            preventSwipe={['up', 'down']}
            className="absolute w-full h-full"
          >
            <div className="relative w-full h-full rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl group transition-transform duration-500 bg-black">

              {/* Image Layer */}
              <div className="relative h-3/4 overflow-hidden">
                <img
                  src={artist.portfolioImages[0] || 'https://via.placeholder.com/400x600'}
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                />

                {/* Match Score Badge */}
                <div className="absolute top-6 left-6 bg-black/50 backdrop-blur border border-ducks-green/50 text-ducks-yellow text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-ducks-green animate-pulse" />
                  Match: ~{Math.round(artist.score || 85)}%
                </div>

                {/* Name Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black via-black/80 to-transparent text-white pt-24">
                  <h2 className="text-3xl font-display font-bold tracking-tighter leading-none mb-1 text-white">{artist.name}</h2>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-ducks-yellow">{artist.shopName}</p>
                </div>
              </div>

              {/* Data Layer */}
              <div className="p-6 flex-1 flex flex-col justify-between bg-zinc-900/50 backdrop-blur-md">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {artist.reasons && artist.reasons.slice(0, 3).map((reason, i) => (
                      <span key={i} className="text-[9px] bg-white/5 border border-white/10 px-3 py-1 rounded-full font-bold text-gray-400">
                        {reason}
                      </span>
                    ))}
                    {!artist.reasons && (
                      <>
                        <span className="text-[9px] bg-white/5 border border-white/10 px-3 py-1 rounded-full font-bold text-gray-400">Verified Pro</span>
                        <span className="text-[9px] bg-white/5 border border-white/10 px-3 py-1 rounded-full font-bold text-gray-400">Local Studio</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-between gap-4 mt-4">
                  <button
                    onClick={() => swiped('left', artist)}
                    className="flex-1 border border-red-500/30 text-red-400 hover:bg-red-500/10 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => swiped('right', artist)}
                    className="flex-1 bg-ducks-green text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-glow hover:shadow-glow-active"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>
          </TinderCard>
        ))}
      </div>

      {currentIndex < 0 && (
        <div className="text-center mt-12 animate-fade-in font-bold relative z-10 glass-panel p-8 rounded-3xl">
          <p className="text-ducks-green text-[10px] uppercase tracking-[0.4em] mb-4">Selection Loop Complete</p>
          <h2 className="text-3xl font-display tracking-tighter mb-8 text-white">Registry <span className="text-ducks-yellow">Compiled.</span></h2>
          <Button
            onClick={() => router.push('/artists')}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Access My Matches
          </Button>
        </div>
      )}
    </div>
  );
}

export default SwipeMatch;