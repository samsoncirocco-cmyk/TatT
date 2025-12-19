import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  const handleStyleChange = (style) => {
    setPreferences((prev) => ({
      ...prev,
      styles: prev.styles.includes(style)
        ? prev.styles.filter((s) => s !== style)
        : [...prev.styles, style],
    }));
  };

  const handleStartSwiping = () => {
    // Pass preferences to the swipe interface
    navigate('/swipe', { state: { preferences } });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-4xl font-light text-center mb-8">Find Your Match</h1>
        <div className="space-y-6">
          {/* Styles */}
          <div>
            <label className="block text-lg font-light mb-2">Styles</label>
            <div className="flex flex-wrap gap-2">
              {stylesOptions.map((style) => (
                <button
                  key={style}
                  onClick={() => handleStyleChange(style)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    preferences.styles.includes(style)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label htmlFor="keywords" className="block text-lg font-light mb-2">
              Keywords
            </label>
            <input
              id="keywords"
              type="text"
              value={preferences.keywords}
              onChange={(e) => setPreferences({ ...preferences, keywords: e.target.value })}
              placeholder="e.g., dragon, floral, geometric"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="zipCode" className="block text-lg font-light mb-2">
              Your Location
            </label>
            <input
              id="zipCode"
              type="text"
              value={preferences.zipCode}
              onChange={(e) => setPreferences({ ...preferences, zipCode: e.target.value })}
              placeholder="e.g., 78701 or Austin, TX"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Budget */}
          <div>
            <label htmlFor="budget" className="block text-lg font-light mb-2">
              Budget: ${preferences.budget}
            </label>
            <input
              id="budget"
              type="range"
              min="100"
              max="2000"
              step="50"
              value={preferences.budget}
              onChange={(e) => setPreferences({ ...preferences, budget: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Distance */}
          <div>
            <label htmlFor="distance" className="block text-lg font-light mb-2">
              Distance: {preferences.distance} miles
            </label>
            <input
              id="distance"
              type="range"
              min="5"
              max="100"
              step="5"
              value={preferences.distance}
              onChange={(e) => setPreferences({ ...preferences, distance: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={handleStartSwiping}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Start Swiping
          </button>
        </div>
      </div>
    </div>
  );
}

export default SmartMatch;
