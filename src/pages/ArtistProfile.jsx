import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import artistsData from '../data/artists.json';

function ArtistProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const artist = artistsData.artists.find(a => a.id === parseInt(id));

  const [selectedImage, setSelectedImage] = useState(0);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // If artist not found, redirect to artists page
  if (!artist) {
    setTimeout(() => navigate('/artists'), 0);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Artist not found...</p>
      </div>
    );
  }

  const handleRequestQuote = () => {
    setShowQuoteModal(true);
  };

  const handleContact = () => {
    window.open(`https://instagram.com/${artist.instagram.replace('@', '')}`, '_blank');
  };

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Back Button */}
        <Link
          to="/artists"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-opacity text-sm uppercase tracking-wider"
        >
          <span className="mr-2">←</span>
          Back
        </Link>

        {/* Artist Header */}
        <div className="border-b border-gray-200 pb-12 mb-12">
          <h1 className="text-5xl font-light tracking-tight mb-3 text-gray-900">{artist.name}</h1>
          <p className="text-xl text-gray-600 font-light mb-6">{artist.shopName}</p>

          <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-8">
            <span>{artist.location.display}</span>
            <span>{artist.yearsExperience} years experience</span>
            <span>{artist.rating} / 5.0</span>
          </div>

          {/* Specialties */}
          <div className="mb-8">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Specialties</p>
            <div className="flex flex-wrap gap-3">
              {artist.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="text-sm text-gray-700 border-b border-gray-300"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRequestQuote}
              disabled={!artist.bookingAvailable}
              className={artist.bookingAvailable ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}
            >
              Request Quote
            </button>
            <button
              onClick={handleContact}
              className="btn-secondary"
            >
              Contact
            </button>
          </div>
        </div>

        {/* Portfolio Gallery */}
        <div className="mb-12">
          <h2 className="text-2xl font-light mb-8 tracking-tight text-gray-900">Portfolio</h2>

          {/* Main Image */}
          <div className="mb-6 bg-gray-100 overflow-hidden">
            <img
              src={artist.portfolioImages[selectedImage]}
              alt={`${artist.name} portfolio ${selectedImage + 1}`}
              className="w-full h-[600px] object-cover"
            />
          </div>

          {/* Thumbnail Gallery */}
          <div className="grid grid-cols-4 gap-4">
            {artist.portfolioImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`overflow-hidden bg-gray-100 transition-opacity ${
                  selectedImage === index
                    ? 'opacity-100'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={image}
                  alt={`${artist.name} portfolio ${index + 1}`}
                  className="w-full aspect-square object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Bio Section */}
        <div className="border-t border-gray-200 pt-12">
          <h2 className="text-2xl font-light mb-6 tracking-tight text-gray-900">About</h2>
          <p className="text-gray-700 leading-relaxed max-w-3xl font-light">
            {artist.bio}
          </p>

          <div className="mt-12 grid md:grid-cols-3 gap-8 max-w-3xl">
            <div>
              <div className="text-3xl font-light text-gray-900 mb-1">{artist.yearsExperience}+</div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">Years</div>
            </div>
            <div>
              <div className="text-3xl font-light text-gray-900 mb-1">{artist.reviewCount}</div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">Clients</div>
            </div>
            <div>
              <div className="text-3xl font-light text-gray-900 mb-1">${artist.startingPrice}+</div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">Starting</div>
            </div>
          </div>

          <div className="mt-8">
            <a
              href={`https://instagram.com/${artist.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider"
            >
              Instagram {artist.instagram}
            </a>
          </div>
        </div>
      </div>

      {/* Quote Request Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-12 max-w-lg w-full">
            <h3 className="text-3xl font-light mb-6 tracking-tight">Request a Quote</h3>
            <p className="text-gray-600 mb-8 font-light">
              Fill out this form to request a quote from {artist.name}
            </p>

            <form className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-600 mb-2">Your Name</label>
                <input
                  type="text"
                  className="w-full border-b border-gray-300 pb-2 focus:border-gray-900 outline-none bg-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-600 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full border-b border-gray-300 pb-2 focus:border-gray-900 outline-none bg-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-600 mb-2">Tattoo Description</label>
                <textarea
                  rows="4"
                  className="w-full border border-gray-300 p-3 focus:border-gray-900 outline-none bg-transparent resize-none"
                  placeholder="Describe your tattoo idea..."
                ></textarea>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-600 mb-2">Placement</label>
                <input
                  type="text"
                  className="w-full border-b border-gray-300 pb-2 focus:border-gray-900 outline-none bg-transparent"
                  placeholder="e.g., Forearm, Back, etc."
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-600 mb-2">Approximate Size</label>
                <input
                  type="text"
                  className="w-full border-b border-gray-300 pb-2 focus:border-gray-900 outline-none bg-transparent"
                  placeholder="e.g., 4 inches x 6 inches"
                />
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Quote request sent! (This is a demo)');
                    setShowQuoteModal(false);
                  }}
                  className="btn-primary flex-1"
                >
                  Send Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtistProfile;
