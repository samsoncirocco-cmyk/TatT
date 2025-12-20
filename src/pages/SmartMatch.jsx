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
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-4 border-t border-gray-100">
      <div className="w-full max-w-lg bg-gray-50 p-8 rounded-3xl shadow-xl border border-gray-100">
        <h1 className="text-4xl font-black text-center mb-4 tracking-tighter">Samson <span className="text-ducks-green italic">Match.</span></h1>
        <p className="text-center text-xs text-gray-500 uppercase tracking-widest font-bold mb-10">Cross-referencing Bio-Preferences...</p>

        <div className="space-y-8">
          {/* Styles */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-ducks-green mb-4">Select Style Filters</label>
            <div className="flex flex-wrap gap-2">
              {stylesOptions.map((style) => (
                <button
                  key={style}
                  onClick={() => handleStyleChange(style)}
                  className={`px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase transition-all ${preferences.styles.includes(style)
                    ? 'bg-ducks-green text-white scale-105 shadow-lg'
                    : 'bg-white border border-gray-200 text-gray-400 hover:border-ducks-green'
                    }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-ducks-green mb-2">
              Detail Keywords
            </label>
            <input
              type="text"
              placeholder="e.g. dragon, floral, geometric"
              value={preferences.keywords}
              onChange={(e) => setPreferences({ ...preferences, keywords: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ducks-green transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-ducks-green mb-2">
                Zip/City
              </label>
              <input
                type="text"
                placeholder="e.g. 78701"
                value={preferences.zipCode}
                onChange={(e) => setPreferences({ ...preferences, zipCode: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ducks-green transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-ducks-green mb-2">
                Radius
              </label>
              <select
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ducks-green appearance-none"
                value={preferences.distance}
                onChange={(e) => setPreferences({ ...preferences, distance: parseInt(e.target.value) })}
              >
                <option value="10">10 miles</option>
                <option value="25">25 miles</option>
                <option value="50">50 miles</option>
                <option value="100">100 miles</option>
              </select>
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-ducks-green mb-2">
              Budget Constraint: ${preferences.budget}
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={preferences.budget}
              onChange={(e) => setPreferences({ ...preferences, budget: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-ducks-green"
            />
          </div>
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={handleStartSwiping}
            className="w-full bg-ducks-green hover:bg-black text-white font-black py-4 px-4 rounded-xl transition-all shadow-xl hover:shadow-ducks-green/20 uppercase text-xs tracking-[0.2em]"
          >
            Execute Artist Match
          </button>
        </div>
      </div>
    </div>
  );
}

export default SmartMatch;
