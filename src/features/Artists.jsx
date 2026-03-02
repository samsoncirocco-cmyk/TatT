import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import artistsData from '../data/artists.json';
import { Search, MapPin, Palette } from 'lucide-react';

function Artists() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('All Styles');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [filteredArtists, setFilteredArtists] = useState(artistsData.artists);

  // Filter artists based on search and filters
  useEffect(() => {
    let results = artistsData.artists;

    // Filter by search query (name or shop)
    if (searchQuery.trim()) {
      results = results.filter(
        artist =>
          artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          artist.shopName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by style
    if (selectedStyle !== 'All Styles') {
      results = results.filter(artist =>
        artist.styles?.includes(selectedStyle)
      );
    }

    // Filter by location
    if (selectedLocation !== 'All Locations') {
      results = results.filter(artist => artist.location === selectedLocation);
    }

    setFilteredArtists(results);
  }, [searchQuery, selectedStyle, selectedLocation]);

  const handleArtistClick = (artistId) => {
    router.push(`/artists/${artistId}`);
  };

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <p className="text-ducks-green font-mono font-bold text-[10px] uppercase tracking-[0.4em] mb-4">Registry // Alpha 0.1</p>
        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tighter mb-4 italic text-white">The <span className="text-ducks-green">Validated.</span></h1>
        <p className="text-gray-400 max-w-xl text-sm font-light leading-relaxed">
          Every artist in the TatTester registry has passed the Samson Test for visual integrity and anatomical precision.
        </p>
      </div>

      {/* Filters - Sticky Glass Bar */}
      <div className="sticky top-4 z-40 mb-12">
        <div className="glass-panel rounded-2xl p-4 shadow-hard backdrop-blur-xl border border-white/10 flex flex-col md:flex-row gap-4 items-center">

          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search registry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-ducks-green focus:outline-none transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-48">
              <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-8 py-3 text-sm text-white focus:border-ducks-green focus:outline-none appearance-none cursor-pointer"
              >
                <option value="All Styles">All Styles</option>
                {artistsData.styles.map(style => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>

            <div className="relative w-full md:w-48">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-8 py-3 text-sm text-white focus:border-ducks-green focus:outline-none appearance-none cursor-pointer"
              >
                <option value="All Locations">Global Hubs</option>
                {artistsData.cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredArtists.map((artist, index) => (
          <div
            key={artist.id}
            onClick={() => handleArtistClick(artist.id)}
            className="group cursor-pointer"
          >
            {/* Card Container */}
            <div className="glass-panel p-3 rounded-3xl border border-white/5 hover:border-ducks-green/30 transition-all duration-300 hover:shadow-glow-green">

              {/* Image */}
              <div className="aspect-[4/5] overflow-hidden rounded-2xl mb-4 relative bg-black">
                <img
                  src={artist.portfolioImages[0]}
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                />
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-mono text-ducks-yellow border border-ducks-yellow/20">
                  {artist.rating} ★
                </div>
              </div>

              {/* Metadata */}
              <div className="px-2 pb-2">
                <div className="flex justify-between items-end mb-1">
                  <h3 className="text-lg font-display font-bold text-white group-hover:text-ducks-green transition-colors">{artist.name}</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{artist.shopName}</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {artist.styles?.slice(0, 3).map(style => (
                    <span key={style} className="text-[9px] bg-white/5 px-2 py-1 rounded text-gray-400 border border-white/5 group-hover:border-white/10 transition-colors">
                      {style}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredArtists.length === 0 && (
        <div className="text-center py-32 rounded-[3rem] border border-white/5 bg-white/5">
          <h3 className="text-2xl font-bold mb-4 text-white">No Matches Found</h3>
          <p className="text-gray-400 mb-8">Try adjusting your style or location filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedStyle('All Styles');
              setSelectedLocation('All Locations');
            }}
            className="text-ducks-green hover:text-white transition-colors text-sm font-bold uppercase tracking-wider"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}

export default Artists;
