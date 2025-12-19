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
        artist.specialties.includes(selectedStyle)
      );
    }

    // Filter by location
    if (selectedLocation !== 'All Locations') {
      results = results.filter(artist => artist.location.display === selectedLocation);
    }

    setFilteredArtists(results);
  }, [searchQuery, selectedStyle, selectedLocation]);

  const handleArtistClick = (artistId) => {
    navigate(`/artists/${artistId}`);
  };

  return (
    <div className="min-h-screen pt-20">
      {/* Minimal Filters - Sticky */}
      <div className="border-b border-gray-200 bg-white sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-b border-gray-300 pb-2 focus:border-gray-900 outline-none bg-transparent text-sm"
            />
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="border-b border-gray-300 pb-2 focus:border-gray-900 outline-none bg-transparent uppercase text-sm tracking-wider"
            >
              {artistsData.styles.map(style => (
                <option key={style}>{style}</option>
              ))}
            </select>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="border-b border-gray-300 pb-2 focus:border-gray-900 outline-none bg-transparent uppercase text-sm tracking-wider"
            >
              {artistsData.cities.map(city => (
                <option key={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Results count */}
          <div className="mt-4 text-xs text-gray-500 uppercase tracking-wider">
            {filteredArtists.length === 0 ? (
              <span>No artists found</span>
            ) : (
              <span>
                {filteredArtists.length}{' '}
                {filteredArtists.length === 1 ? 'Artist' : 'Artists'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {filteredArtists.map((artist) => (
            <div
              key={artist.id}
              onClick={() => handleArtistClick(artist.id)}
              className="group cursor-pointer"
            >
              {/* Image */}
              <div className="aspect-square overflow-hidden bg-gray-100 mb-4">
                <img
                  src={artist.portfolioImages[0]}
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>

              {/* Info */}
              <div>
                <h3 className="text-lg font-light mb-1 text-gray-900">{artist.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{artist.shopName}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {artist.styles?.slice(0, 2).join(', ') || 'Various Styles'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredArtists.length === 0 && (
          <div className="text-center py-20">
            <h3 className="text-2xl font-light mb-4 text-gray-900">No Artists Found</h3>
            <p className="text-gray-600 mb-8 font-light">
              Try adjusting your search criteria
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStyle('All Styles');
                setSelectedLocation('All Locations');
              }}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Artists;
