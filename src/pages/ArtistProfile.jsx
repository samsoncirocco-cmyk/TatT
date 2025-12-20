import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import artistsData from '../data/artists.json';
import { getAllDesigns } from '../services/designLibraryService';

function ArtistProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const artist = artistsData.artists.find(a => a.id === parseInt(id));

  const [selectedImage, setSelectedImage] = useState(0);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [savedDesigns, setSavedDesigns] = useState([]);

  // If artist not found, redirect to artists page
  if (!artist) {
    setTimeout(() => navigate('/artists'), 0);
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-ducks-green border-t-transparent"></div>
      </div>
    );
  }

  // Load saved designs when modal opens
  useEffect(() => {
    if (showQuoteModal) {
      setSavedDesigns(getAllDesigns());
    }
  }, [showQuoteModal]);

  const handleRequestQuote = () => {
    setShowQuoteModal(true);
  };

  const handleContact = () => {
    window.open(`https://instagram.com/${artist.instagram.replace('@', '')}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Back Button */}
        <Link
          to="/artists"
          className="inline-flex items-center text-gray-400 hover:text-ducks-green mb-12 transition-colors text-[10px] font-black uppercase tracking-[0.3em]"
        >
          <span className="mr-3 text-lg">←</span>
          Return to Registry
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left: Portfolio Gallery */}
          <div className="space-y-6">
            <div className="aspect-[4/5] bg-gray-50 rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-2xl group">
              <img
                src={artist.portfolioImages[selectedImage]}
                alt={`${artist.name} portfolio ${selectedImage + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              {artist.portfolioImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-2xl overflow-hidden bg-gray-50 transition-all border-2 ${selectedImage === index
                    ? 'border-ducks-green scale-95 shadow-lg'
                    : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                >
                  <img
                    src={image}
                    alt={`${artist.name} thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Artist Info */}
          <div className="flex flex-col">
            <div className="mb-10">
              <p className="text-ducks-green font-black text-[10px] uppercase tracking-[0.4em] mb-4">Node Identity // {artist.id.toString(16).padStart(4, '0')}</p>
              <h1 className="text-6xl font-black tracking-tighter mb-4 italic leading-none">{artist.name}</h1>
              <div className="flex items-center gap-4 mb-8">
                <span className="text-lg font-bold text-gray-400 uppercase tracking-widest">{artist.shopName}</span>
                <div className="h-1 w-1 rounded-full bg-gray-300"></div>
                <span className="text-[10px] bg-ducks-green text-ducks-yellow px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg">Samson Verified</span>
              </div>

              <div className="grid grid-cols-3 gap-8 py-8 border-y border-gray-100">
                <div>
                  <div className="text-3xl font-black tracking-tighter text-gray-900 mb-1">{artist.rating}★</div>
                  <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Alignment</div>
                </div>
                <div>
                  <div className="text-3xl font-black tracking-tighter text-gray-900 mb-1">{artist.yearsExperience}yr</div>
                  <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Retention</div>
                </div>
                <div>
                  <div className="text-3xl font-black tracking-tighter text-gray-900 mb-1">${artist.hourlyRate}</div>
                  <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Hourly Scale</div>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-ducks-green mb-4">Biomedical Narrative</h2>
              <p className="text-gray-500 leading-relaxed font-medium italic text-lg">
                "{artist.bio}"
              </p>
            </div>

            <div className="space-y-4 mt-auto">
              <button
                onClick={handleRequestQuote}
                disabled={!artist.bookingAvailable}
                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-xl ${artist.bookingAvailable
                    ? 'bg-ducks-green text-white hover:scale-[1.02] hover:shadow-ducks-green/20'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {artist.bookingAvailable ? 'Initialize Booking Interface' : 'Registry Closed'}
              </button>
              <button
                onClick={handleContact}
                className="w-full border-2 border-gray-100 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-gray-50 transition-all text-gray-400"
              >
                Direct Contact // IG
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {artist.styles?.map(style => (
                <span key={style} className="text-[8px] bg-gray-50 border border-gray-100 px-3 py-1 rounded-full font-black uppercase tracking-widest text-gray-400">{style}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quote Request Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white p-12 max-w-lg w-full rounded-[3rem] shadow-2xl relative">
            <button
              onClick={() => setShowQuoteModal(false)}
              className="absolute top-8 right-8 text-gray-300 hover:text-gray-900 text-2xl"
            >
              ✕
            </button>
            <p className="text-ducks-green font-black text-[9px] uppercase tracking-[0.4em] mb-4 text-center">Data Intake Protocol</p>
            <h3 className="text-4xl font-black mb-8 tracking-tighter text-center italic">Request <span className="text-ducks-green">Quote.</span></h3>

            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert('Request transmitted to Life.exe'); setShowQuoteModal(false); }}>
              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-widest text-ducks-green">Subject Name</label>
                <input
                  type="text"
                  required
                  className="w-full border-b-2 border-gray-100 py-3 focus:border-ducks-green outline-none bg-transparent font-bold text-sm transition-colors"
                  placeholder="IDENTITY"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-widest text-ducks-green">Communication Node (Email)</label>
                <input
                  type="email"
                  required
                  className="w-full border-b-2 border-gray-100 py-3 focus:border-ducks-green outline-none bg-transparent font-bold text-sm transition-colors"
                  placeholder="LINK@LIFE.EXE"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-widest text-ducks-green">Simulation Intent</label>
                <textarea
                  rows="4"
                  required
                  className="w-full border-2 border-gray-100 p-4 focus:border-ducks-green outline-none bg-gray-50 rounded-2xl resize-none font-medium text-sm transition-colors"
                  placeholder="Describe your design path..."
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-ducks-yellow text-ducks-green py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] transition-all shadow-xl shadow-yellow-900/10"
              >
                Transmit Quote Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtistProfile;
