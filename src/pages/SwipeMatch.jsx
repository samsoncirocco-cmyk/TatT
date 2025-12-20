import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import TinderCard from 'react-tinder-card';
import { calculateMatches, trackSwipe } from '../utils/matching';
import artistsData from '../data/artists.json';

function SwipeMatch() {
  const location = useLocation();
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedArtists, setLikedArtists] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      if (!location.state || !location.state.preferences) {
        navigate('/smart-match');
        return;
      }

      const preferences = location.state.preferences;
      if (!artistsData || !artistsData.artists) {
        setError('Artist data registry offline.');
        setIsLoading(false);
        return;
      }

      const matchedArtists = calculateMatches(preferences, artistsData.artists);
      if (matchedArtists.length === 0) {
        setError('No artists found matching your biometric intent.');
        setIsLoading(false);
        return;
      }

      setArtists(matchedArtists);
      setCurrentIndex(matchedArtists.length - 1);
      setIsLoading(false);
    } catch (err) {
      setError('System Error: Selection Protocol Failed.');
      setIsLoading(false);
    }
  }, [location.state, navigate]);

  const swiped = (direction, artist) => {
    if (direction === 'right') {
      setLikedArtists((prev) => [...prev, artist]);
    }
    trackSwipe('user-123', artist.id, direction, artist.score);
    setCurrentIndex((prev) => prev - 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-ducks-green border-t-ducks-yellow rounded-full animate-spin mb-6"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-ducks-green animate-pulse">Initializing Selection Protocol...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md border-2 border-red-500/20 p-12 rounded-3xl bg-red-50/50">
          <h2 className="text-3xl font-black mb-4 tracking-tighter text-red-600">Protocol Halt.</h2>
          <p className="text-gray-500 mb-8 font-medium italic">"{error}"</p>
          <button
            onClick={() => navigate('/smart-match')}
            className="btn-cocreate bg-red-600 hover:bg-red-700"
          >
            Reset Preferences
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4 border-t border-gray-100 overflow-hidden">
      <div className="mb-12 text-center relative z-10">
        <p className="text-ducks-green font-black text-[9px] uppercase tracking-[0.5em] mb-2">Sim-Link Active // 0x4A2</p>
        <h1 className="text-4xl font-black tracking-tighter">Selection <span className="text-ducks-green italic">Protocol.</span></h1>
      </div>

      <div className="w-full max-w-sm h-[520px] relative">
        {artists.map((artist, index) => (
          <TinderCard
            key={artist.id}
            onSwipe={(dir) => swiped(dir, artist)}
            preventSwipe={['up', 'down']}
            className="absolute w-full h-full"
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full h-full border border-gray-100 overflow-hidden flex flex-col group transition-transform duration-500">
              <div className="relative h-2/3 overflow-hidden">
                <img
                  src={artist.portfolioImages[0] || 'https://via.placeholder.com/400x600'}
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-6 left-6 bg-ducks-green text-ducks-yellow text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                  Sim Score: {Math.round(artist.score)}%
                </div>
                <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 to-transparent text-white">
                  <h2 className="text-3xl font-black tracking-tighter leading-none mb-1">{artist.name}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-ducks-yellow/80">{artist.shopName}</p>
                </div>
              </div>

              <div className="p-8 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-4">Integrity Alignment:</h3>
                  <div className="flex flex-wrap gap-2">
                    {artist.reasons.slice(0, 3).map((reason, i) => (
                      <span key={i} className="text-[10px] bg-gray-50 border border-gray-100 px-3 py-1 rounded-full font-bold text-gray-500 italic">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between gap-4 mt-6">
                  <button
                    onClick={() => swiped('left', artist)}
                    className="flex-1 border-2 border-red-100 text-red-400 hover:bg-red-50 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => swiped('right', artist)}
                    className="flex-1 bg-ducks-green text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-ducks-green/20"
                  >
                    Initialize Link
                  </button>
                </div>
              </div>
            </div>
          </TinderCard>
        ))}
      </div>

      {currentIndex < 0 && (
        <div className="text-center mt-12 animate-in fade-in duration-700 font-black relative z-10">
          <p className="text-ducks-green text-[10px] uppercase tracking-[0.4em] mb-4">Selection Loop Complete.</p>
          <h2 className="text-3xl tracking-tighter mb-8 italic">Registry Compiled.</h2>
          <button
            onClick={() => navigate('/artists', { state: { likedIds: likedArtists.map(a => a.id) } })}
            className="btn-cocreate-yellow text-md px-12 py-5"
          >
            Access My Matches →
          </button>
        </div>
      )}

      {/* Background Decor */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] pointer-events-none opacity-[0.03] rotate-12 bg-[radial-gradient(#154733_1px,transparent_1px)] [background-size:32px_32px]"></div>
    </div>
  );
}

export default SwipeMatch;