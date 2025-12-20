import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import artistsData from '../data/artists.json';

function Artists() {
  const navigate = useNavigate();
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
    navigate(`/artists/${artistId}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24 border-t border-gray-100">
      {/* Header */}
      <div className="pt-32 pb-12 px-6 max-w-7xl mx-auto">
        <p className="text-ducks-green font-black text-[10px] uppercase tracking-[0.4em] mb-4">Registry // Alpha 0.1</p>
        <h1 className="text-5xl font-black tracking-tighter mb-4 italic">The <span className="text-ducks-green">Validated.</span></h1>
        <p className="text-gray-500 max-w-xl text-sm font-medium leading-relaxed">
          Every artist in the TatTester registry has passed the Samson Test for visual integrity and anatomical precision.
        </p>
      </div>

      {/* Minimal Filters - Sticky */}
      <div className="border-y border-gray-100 bg-white/80 backdrop-blur-md sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row gap-8 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[9px] font-black uppercase tracking-widest text-ducks-green mb-2">Search Registry</label>
              <input
                type="text"
                placeholder="Artist name or studio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-b-2 border-gray-100 pb-2 focus:border-ducks-green outline-none bg-transparent text-sm font-bold transition-colors"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-[9px] font-black uppercase tracking-widest text-ducks-green mb-2">Style Filter</label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full border-b-2 border-gray-100 pb-2 focus:border-ducks-green outline-none bg-transparent uppercase text-[10px] font-black tracking-wider transition-colors"
              >
                <option value="All Styles">All Profiles</option>
                {artistsData.styles.map(style => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-[9px] font-black uppercase tracking-widest text-ducks-green mb-2">Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full border-b-2 border-gray-100 pb-2 focus:border-ducks-green outline-none bg-transparent uppercase text-[10px] font-black tracking-wider transition-colors"
              >
                <option value="All Locations">Global Hubs</option>
                {artistsData.cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-6 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-ducks-green animate-pulse"></div>
            <div className="text-[9px] text-gray-400 uppercase tracking-widest font-black">
              {filteredArtists.length}{' '}
              {filteredArtists.length === 1 ? 'Record' : 'Records'} Found
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {filteredArtists.map((artist) => (
            <div
              key={artist.id}
              onClick={() => handleArtistClick(artist.id)}
              className="group cursor-pointer"
            >
              {/* Image */}
              <div className="aspect-[4/5] overflow-hidden bg-gray-50 rounded-3xl mb-6 relative">
                <img
                  src={artist.portfolioImages[0]}
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-6 right-6 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[8px] font-black uppercase tracking-widest text-ducks-green">View Profile</p>
                </div>
              </div>

              {/* Info */}
              <div className="px-2">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-black tracking-tighter text-gray-900 group-hover:text-ducks-green transition-colors">{artist.name}</h3>
                  <span className="text-[10px] bg-gray-50 px-2 py-0.5 rounded font-black text-gray-400 tracking-tighter uppercase">{artist.rating}★</span>
                </div>
                <p className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-widest">{artist.shopName}</p>
                <div className="flex flex-wrap gap-2">
                  {artist.styles?.slice(0, 2).map(style => (
                    <span key={style} className="text-[9px] border border-gray-100 px-2 py-0.5 rounded text-gray-400 uppercase font-black tracking-widest">{style}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredArtists.length === 0 && (
          <div className="text-center py-32 border-2 border-dashed border-gray-100 rounded-[3rem]">
            <h3 className="text-3xl font-black mb-4 tracking-tighter italic">No Matches in Database.</h3>
            <p className="text-gray-400 mb-8 max-w-xs mx-auto text-sm font-medium">
              The selection criteria resulted in zero valid nodes. Adjust your search parameters to re-initialize.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStyle('All Styles');
                setSelectedLocation('All Locations');
              }}
              className="btn-cocreate text-[10px]"
            >
              Clear Records
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Artists;
