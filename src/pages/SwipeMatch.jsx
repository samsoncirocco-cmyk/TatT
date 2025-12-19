import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TinderCard from 'react-tinder-card';
import { calculateMatches, trackSwipe } from '../utils/matching';
import artistsData from '../data/artists.json';

function SwipeMatch() {
  const location = useLocation();
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastDirection, setLastDirection] = useState();
  const [likedArtists, setLikedArtists] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Validate preferences exist
      if (!location.state || !location.state.preferences) {
        navigate('/smart-match');
        return;
      }

      const preferences = location.state.preferences;

      // Validate preferences structure
      if (!preferences.styles || !Array.isArray(preferences.styles)) {
        setError('Invalid preferences: styles must be an array');
        setIsLoading(false);
        return;
      }

      // Validate artists data
      if (!artistsData || !artistsData.artists || !Array.isArray(artistsData.artists)) {
        setError('Artist data is unavailable. Please try again later.');
        setIsLoading(false);
        return;
      }

      // Calculate matches
      const matchedArtists = calculateMatches(preferences, artistsData.artists);

      // Handle no matches found
      if (matchedArtists.length === 0) {
        setError('No artists found matching your preferences. Try adjusting your filters.');
        setIsLoading(false);
        return;
      }

      setArtists(matchedArtists);
      setCurrentIndex(matchedArtists.length - 1);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading artists:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  }, [location.state, navigate]);

  const swiped = (direction, artist) => {
    setLastDirection(direction);
    if (direction === 'right') {
      setLikedArtists((prev) => [...prev, artist]);
    }
    trackSwipe('user-123', artist.id, direction, artist.score);
    setCurrentIndex((prev) => prev - 1);
  };

  const outOfFrame = (name) => {
    console.log(name + ' left the screen!');
  };

  const currentArtist = artists[currentIndex];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-lg">Loading artists...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-light mb-4">Oops!</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => navigate('/smart-match')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg"
          >
            Back to Preferences
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-light mb-4">Swipe to find your artist</h1>
      <div className="w-full max-w-md h-[600px] relative">
        {artists.map((artist, index) => (
          <TinderCard
            key={artist.id}
            onSwipe={(dir) => swiped(dir, artist)}
            onCardLeftScreen={() => outOfFrame(artist.name)}
            preventSwipe={['up', 'down']}
            className="absolute w-full h-full"
          >
            <div className="bg-gray-800 rounded-xl shadow-lg w-full h-full p-6 flex flex-col justify-between">
              <div>
                {artist.portfolioImages && artist.portfolioImages.length > 0 ? (
                  <img
                    src={artist.portfolioImages[0]}
                    alt={artist.name}
                    className="w-full h-64 object-cover rounded-lg mb-4"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                    <p className="text-gray-500">No image available</p>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold">{artist.name}</h2>
                  <span className="text-lg font-light bg-purple-600 px-3 py-1 rounded-full">
                    {Math.round(artist.score)}%
                  </span>
                </div>
                <p className="text-gray-400 mb-4">{artist.shopName}</p>
                <div className="text-sm">
                  <h3 className="font-semibold mb-2">Match Reasons:</h3>
                  <ul className="list-disc list-inside">
                    {artist.reasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex justify-around">
                <button
                  onClick={() => swiped('left', artist)}
                  className="bg-red-500 text-white font-bold py-2 px-4 rounded-full"
                >
                  Nope
                </button>
                <button
                  onClick={() => swiped('right', artist)}
                  className="bg-green-500 text-white font-bold py-2 px-4 rounded-full"
                >
                  Like
                </button>
              </div>
            </div>
          </TinderCard>
        ))}
      </div>
      {currentIndex < 0 && (
        <div className="text-center mt-8">
          <h2 className="text-2xl font-light mb-4">You've seen all the artists!</h2>
          <button
            onClick={() => navigate('/artists', { state: { likedIds: likedArtists.map(a => a.id) } })}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            View Your Matches
          </button>
        </div>
      )}
    </div>
  );
}

export default SwipeMatch;