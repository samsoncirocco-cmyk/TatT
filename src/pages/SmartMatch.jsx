import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';
import artistsData from '../data/artists.json';
import { calculateMatches } from '../utils/matching';

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
  const navigate = useNavigate();
  const { toast, toasts, removeToast } = useToast();

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

  const handleStartSwiping = () => {
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

    // Pass preferences to the swipe interface
    navigate('/swipe', { state: { preferences } });
  };

  const handleZipSelect = (zip) => {
    setPreferences({ ...preferences, zipCode: zip });
    setShowZipSuggestions(false);
  };

  const totalArtists = artistsData.artists?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-2xl">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-6xl font-black mb-3 tracking-tight bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              Neural Ink
            </h1>
            <p className="text-sm text-gray-400 uppercase tracking-widest font-semibold mb-6">
              AI-Powered Artist Matching Engine
            </p>
            
            {/* Dynamic Match Counter */}
            {(matchCount > 0 || isThinking) && (
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                {isThinking ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                      Analyzing {totalArtists}+ artists...
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
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
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                Select Style Filters
              </label>
              <div className="flex flex-wrap gap-2">
                {stylesOptions.map((style) => (
                  <button
                    key={style}
                    onClick={() => handleStyleChange(style)}
                    className={`px-4 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                      preferences.styles.includes(style)
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30 scale-105'
                        : 'bg-white/5 border border-white/10 text-gray-300 hover:border-green-500/50 hover:bg-white/10'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                Detail Keywords
              </label>
              <input
                type="text"
                placeholder="e.g. dragon, floral, geometric"
                value={preferences.keywords}
                onChange={(e) => setPreferences({ ...preferences, keywords: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all backdrop-blur-sm"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                Zip/City
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 78701"
                  value={preferences.zipCode}
                  onChange={(e) => setPreferences({ ...preferences, zipCode: e.target.value })}
                  onFocus={() => preferences.zipCode.length >= 3 && setShowZipSuggestions(true)}
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all backdrop-blur-sm ${
                    zipError
                      ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50'
                      : 'border-white/10 focus:ring-green-500/50 focus:border-green-500/50'
                  }`}
                />
                {zipError && (
                  <p className="mt-1 text-xs text-red-400">{zipError}</p>
                )}
                {showZipSuggestions && zipSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden">
                    {zipSuggestions.map((zip) => (
                      <button
                        key={zip}
                        onClick={() => handleZipSelect(zip)}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors"
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
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-green-400 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
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
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Radius
                    </label>
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all backdrop-blur-sm appearance-none"
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
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Budget: ${preferences.budget}
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="50"
                      value={preferences.budget}
                      onChange={(e) => setPreferences({ ...preferences, budget: parseInt(e.target.value, 10) })}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CTA Button */}
            <div className="pt-4">
              <button
                onClick={handleStartSwiping}
                disabled={isThinking}
                className={`w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-black py-4 px-6 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:shadow-green-500/30 uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed ${
                  isThinking ? 'animate-pulse' : ''
                }`}
              >
                {isThinking ? 'Analyzing Matches...' : 'Execute Artist Match'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default SmartMatch;
