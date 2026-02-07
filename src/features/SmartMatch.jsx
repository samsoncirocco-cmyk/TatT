import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';
import { useMatchStore } from '../store/useMatchStore';
import artistsData from '../data/artists.json';
import { calculateMatches } from '../utils/matching';
import EmptyMatchState from '../components/EmptyMatchState';

const stylesOptions = [
  'Anime',
  'Traditional',
  'Fine Line',
  'Tribal',
  'Watercolor',
  'Blackwork',
  'Realism',
  'Geometric',
  'Japanese',
  'Minimalist',
];

function SmartMatch() {
  const [preferences, setPreferences] = useState({
    styles: [],
    keywords: '',
    budget: 1000,
    distance: 25,
    zipCode: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [zipSuggestions, setZipSuggestions] = useState([]);
  const [showZipSuggestions, setShowZipSuggestions] = useState(false);
  const [zipError, setZipError] = useState('');
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchProgress, setSearchProgress] = useState(0);
  const [showEmptyState, setShowEmptyState] = useState(false);

  const router = useRouter();
  const { toast, toasts, removeToast } = useToast();
  const setMatches = useMatchStore((state) => state.setMatches);
  const searchTimerRef = useRef(null);

  // Calculate match count in real-time
  useEffect(() => {
    if (preferences.styles.length > 0 || preferences.keywords.trim() || preferences.zipCode.trim()) {
      setIsThinking(true);
      const timer = setTimeout(() => {
        try {
          const matches = calculateMatches(
            {
              styles: preferences.styles,
              keywords: preferences.keywords,
              budget: preferences.budget,
              distance: preferences.distance,
              location: preferences.zipCode || 'Phoenix, AZ',
            },
            artistsData.artists || []
          );
          setMatchCount(matches.length);
          setIsThinking(false);
        } catch (error) {
          setIsThinking(false);
          setMatchCount(0);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setMatchCount(0);
      setIsThinking(false);
    }
  }, [preferences.styles, preferences.keywords, preferences.zipCode]);

  // Zip code autosuggest (simplified for demo)
  useEffect(() => {
    if (preferences.zipCode.length >= 3) {
      const commonZips = ['78701', '78702', '78703', '78704', '78705', '78721', '78722', '78723', '78731', '78732'];
      const filtered = commonZips.filter(zip => zip.startsWith(preferences.zipCode));
      setZipSuggestions(filtered);
      setShowZipSuggestions(filtered.length > 0);
    } else {
      setZipSuggestions([]);
      setShowZipSuggestions(false);
    }
  }, [preferences.zipCode]);

  // Zip code validation
  useEffect(() => {
    if (preferences.zipCode && preferences.zipCode.length > 0) {
      const isValid = /^\d{5}$/.test(preferences.zipCode);
      setZipError(isValid ? '' : 'Invalid zip code format (must be 5 digits)');
    } else {
      setZipError('');
    }
  }, [preferences.zipCode]);

  const handleStyleChange = (style) => {
    setPreferences((prev) => ({
      ...prev,
      styles: prev.styles.includes(style)
        ? prev.styles.filter((s) => s !== style)
        : [...prev.styles, style],
    }));
  };

  const handleStartSwiping = async () => {
    // Validation
    if (preferences.styles.length === 0) {
      toast.error('Please select at least one style');
      return;
    }
    if (preferences.zipCode && zipError) {
      toast.error('Please enter a valid zip code');
      return;
    }
    if (!preferences.zipCode.trim()) {
      toast.error('Please enter your location');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setShowEmptyState(false);
    setSearchProgress(0);

    // Initial progress bar animation
    const progressInterval = setInterval(() => {
      setSearchProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 50);

    try {
      let matchedArtists = [];

      if (useSemanticSearch) {
        // Semantic search via API
        const response = await fetch('/api/v1/match/semantic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer dev-token-change-in-production' // Use real token in prod
          },
          body: JSON.stringify({
            query: preferences.keywords,
            location: preferences.zipCode,
            style_preferences: preferences.styles,
            budget: preferences.budget,
            radius: preferences.distance,
            max_results: 20
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Semantic search protocol failed.');
        }

        const data = await response.json();
        matchedArtists = data.matches;
      } else {
        // Keyword search locally
        matchedArtists = calculateMatches(
          {
            styles: preferences.styles,
            keywords: preferences.keywords,
            budget: preferences.budget,
            distance: preferences.distance,
            location: preferences.zipCode,
          },
          artistsData.artists || []
        );
      }

      clearInterval(progressInterval);
      setSearchProgress(100);

      if (matchedArtists.length === 0) {
        setTimeout(() => {
          setShowEmptyState(true);
          setIsSearching(false);
        }, 300);
        return;
      }

      // Small delay for visual feedback
      setTimeout(() => {
        setIsSearching(false);
        // Store matches in zustand for the swipe page
        setMatches(matchedArtists.map(m => ({
          artistId: m.id,
          artistName: m.name,
          matchScore: m.matchScore || 0,
          tags: m.styles || [],
          bio: m.bio,
          location: m.location,
          styles: m.styles,
          imageUrl: m.portfolioImages?.[0],
          instagramUrl: m.instagram,
          availability: m.availability,
          distance: m.distance,
          reasoning: m.reasoning,
          breakdown: m.breakdown,
        })));
        router.push('/swipe');
      }, 500);

    } catch (err) {
      clearInterval(progressInterval);
      console.error('[SmartMatch] Search error:', err);

      const errorMessage = err.message.includes('timeout')
        ? 'Search taking longer than expected (500ms limit reached).'
        : err.message || 'System error: selection protocol failed.';

      setSearchError(errorMessage);
      setIsSearching(false);
      toast.error(errorMessage);
    }
  };

  const handleAdjustFilters = (action) => {
    setShowEmptyState(false);
    setSearchError(null);

    // Suggest adjustments by expanding specific sections
    setShowAdvanced(true);

    if (action === 'increase_radius') {
      setPreferences(prev => ({ ...prev, distance: 50 }));
    } else if (action === 'reduce_styles') {
      // Keep only first two styles if many
      setPreferences(prev => ({ ...prev, styles: prev.styles.slice(0, 2) }));
    }

    // Auto-scroll to form if needed
  };

  const handleStartOver = () => {
    setPreferences({
      styles: [],
      keywords: '',
      budget: 1000,
      distance: 25,
      zipCode: '',
    });
    setShowEmptyState(false);
    setSearchError(null);
  };

  const handleZipSelect = (zip) => {
    setPreferences({ ...preferences, zipCode: zip });
    setShowZipSuggestions(false);
  };

  const totalArtists = artistsData.artists?.length || 0;

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 flex items-center justify-center relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-2xl">
        <div className="glass-panel border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-500 relative">

          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-ducks-green/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

          {/* Loading Overly */}
          {isSearching && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="w-20 h-20 relative mb-6">
                <div className="absolute inset-0 border-4 border-ducks-green/20 rounded-full"></div>
                <div
                  className="absolute inset-0 border-4 border-t-ducks-green rounded-full animate-spin"
                  style={{ animationDuration: '0.8s' }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-black text-ducks-green">{(searchProgress / 100 * 0.5).toFixed(1)}s</span>
                </div>
              </div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-ducks-green animate-pulse">
                Analyzing Neural Style...
              </p>
              <div className="mt-8 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-ducks-green transition-all duration-300"
                  style={{ width: `${searchProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Empty Results State */}
          {showEmptyState ? (
            <EmptyMatchState
              searchParams={preferences}
              onAdjustFilters={handleAdjustFilters}
              onStartOver={handleStartOver}
            />
          ) : searchError ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-glow-red">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-3xl font-display font-bold mb-4 tracking-tight text-white">Search Protocol Halted</h2>
              <p className="text-gray-400 mb-12 italic border-l-2 border-red-500/50 pl-4 text-left max-w-sm mx-auto">"{searchError}"</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleStartSwiping}
                  className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all uppercase tracking-widest text-xs shadow-lg shadow-red-900/20"
                >
                  Retry Search
                </button>
                <button
                  onClick={() => setSearchError(null)}
                  className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl transition-all uppercase tracking-widest text-xs hover:bg-white/10"
                >
                  Adjust Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 md:p-12 relative z-10">
              {/* Header */}
              <div className="text-center mb-10">
                <h1 className="text-5xl md:text-6xl font-display font-bold mb-3 tracking-tighter text-white">
                  Neural <span className="text-ducks-green">Ink.</span>
                </h1>
                <p className="text-xs text-gray-400 uppercase tracking-[0.3em] font-bold mb-6">
                  AI-Powered Artist Matching Engine
                </p>

                {/* Dynamic Match Counter */}
                {(matchCount > 0 || isThinking) && (
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-ducks-green/10 border border-ducks-green/20 rounded-full animate-fade-in shadow-glow-green">
                    {isThinking ? (
                      <>
                        <div className="w-2 h-2 bg-ducks-green rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-ducks-green uppercase tracking-widest">
                          Analyzing {totalArtists}+ artists...
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-ducks-green rounded-full"></div>
                        <span className="text-[10px] font-bold text-ducks-green uppercase tracking-widest">
                          {matchCount} matches found
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {/* Styles */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 ml-1">
                    Select Style Filters
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {stylesOptions.map((style) => (
                      <button
                        key={style}
                        onClick={() => handleStyleChange(style)}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all duration-200 ${preferences.styles.includes(style)
                          ? 'bg-ducks-green text-white shadow-glow-green scale-105 border border-transparent'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:border-ducks-green/50 hover:text-white hover:bg-white/10'
                          }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">
                    Detail Keywords
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. dragon, floral, geometric"
                    value={preferences.keywords}
                    onChange={(e) => setPreferences({ ...preferences, keywords: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-ducks-green transition-all"
                  />
                </div>

                {/* Semantic Search Toggle */}
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group hover:border-white/20 transition-colors">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                      Search Mode
                    </label>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {useSemanticSearch
                        ? 'Semantic: Find artists by visual style similarity'
                        : 'Keyword: Find artists by exact tag matches'}
                    </p>
                  </div>
                  <button
                    onClick={() => setUseSemanticSearch(!useSemanticSearch)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useSemanticSearch ? 'bg-ducks-green' : 'bg-gray-700'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useSemanticSearch ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">
                    Zip/City
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 78701"
                      value={preferences.zipCode}
                      onChange={(e) => setPreferences({ ...preferences, zipCode: e.target.value })}
                      onFocus={() => preferences.zipCode.length >= 3 && setShowZipSuggestions(true)}
                      className={`w-full bg-black/40 border rounded-xl px-4 py-4 text-sm text-white placeholder-gray-600 focus:outline-none transition-all ${zipError
                        ? 'border-red-500/50 focus:border-red-500'
                        : 'border-white/10 focus:border-ducks-green'
                        }`}
                    />
                    {zipError && (
                      <p className="mt-1 text-[10px] font-bold text-red-400 pl-1">{zipError}</p>
                    )}
                    {showZipSuggestions && zipSuggestions.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                        {zipSuggestions.map((zip) => (
                          <button
                            key={zip}
                            onClick={() => handleZipSelect(zip)}
                            className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/10 transition-colors font-mono"
                          >
                            {zip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced Filters Toggle */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Advanced Filters
                  </button>
                </div>

                {/* Advanced Filters (Progressive Disclosure) */}
                {showAdvanced && (
                  <div className="space-y-6 pt-4 border-t border-white/10 animate-slide-down">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">
                          Radius
                        </label>
                        <select
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-ducks-green transition-all appearance-none"
                          value={preferences.distance}
                          onChange={(e) => setPreferences({ ...preferences, distance: parseInt(e.target.value) })}
                        >
                          <option value="10">10 miles</option>
                          <option value="25">25 miles</option>
                          <option value="50">50 miles</option>
                          <option value="100">100 miles</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">
                          Budget: ${preferences.budget}
                        </label>
                        <input
                          type="range"
                          min="100"
                          max="2000"
                          step="50"
                          value={preferences.budget}
                          onChange={(e) => setPreferences({ ...preferences, budget: parseInt(e.target.value, 10) })}
                          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-ducks-green mt-3"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                <div className="pt-4">
                  <button
                    onClick={handleStartSwiping}
                    disabled={isThinking || isSearching}
                    className={`w-full bg-white text-black font-black py-4 px-6 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] uppercase text-xs tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed ${isThinking || isSearching ? 'animate-pulse' : ''
                      }`}
                  >
                    {isSearching ? 'Executing Search...' : isThinking ? 'Analyzing Matches...' : 'Execute Artist Match'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default SmartMatch;
