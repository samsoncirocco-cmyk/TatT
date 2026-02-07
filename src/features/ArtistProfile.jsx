import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import artistsData from '../data/artists.json';
import { getAllDesigns } from '../services/designLibraryService';
import Button from '../components/ui/Button';
import { ArrowLeft, Instagram } from 'lucide-react';

function ArtistProfile() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const artist = artistsData.artists.find(a => a.id === parseInt(id));

  const [selectedImage, setSelectedImage] = useState(0);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [savedDesigns, setSavedDesigns] = useState([]);

  // If artist not found, redirect to artists page
  if (!artist) {
    setTimeout(() => router.push('/artists'), 0);
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen pt-24 pb-32 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link
          href="/artists"
          className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors text-xs font-bold uppercase tracking-widest group"
        >
          <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={16} />
          Back to Registry
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">

          {/* Left: Portfolio Gallery */}
          <div className="space-y-6">
            <div className="aspect-[4/5] glass-panel p-2 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative">
              <img
                src={artist.portfolioImages[selectedImage]}
                alt={`${artist.name} portfolio ${selectedImage + 1}`}
                className="w-full h-full object-cover rounded-[2rem]"
              />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none rounded-b-[2rem]" />
            </div>

            <div className="grid grid-cols-4 gap-4">
              {artist.portfolioImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-2xl overflow-hidden transition-all border-2 ${selectedImage === index
                    ? 'border-ducks-green shadow-glow-green scale-95 opacity-100'
                    : 'border-transparent opacity-50 hover:opacity-100 hover:border-white/20'
                    }`}
                >
                  <img
                    src={image}
                    alt={`${artist.name} thumbnail ${index + 1}`}
                    className="w-full h-full object-cover bg-white/5"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Artist Info */}
          <div className="flex flex-col pt-4">
            <div className="mb-10">
              <p className="text-ducks-green font-mono font-bold text-[10px] uppercase tracking-[0.4em] mb-4">Node Identity // {artist.id.toString(16).padStart(4, '0')}</p>
              <h1 className="text-6xl md:text-7xl font-display font-bold tracking-tighter mb-4 text-white leading-none">{artist.name}</h1>

              <div className="flex items-center gap-4 mb-8">
                <span className="text-lg font-bold text-gray-400 uppercase tracking-widest">{artist.shopName}</span>
                <div className="h-1 w-1 rounded-full bg-gray-600"></div>
                <span className="text-[10px] bg-ducks-green/20 text-ducks-green border border-ducks-green/30 px-3 py-1 rounded-full font-bold uppercase tracking-widest shadow-glow-green">Verified</span>
              </div>

              <div className="grid grid-cols-3 gap-8 py-8 border-y border-white/5">
                <div>
                  <div className="text-3xl font-display font-bold tracking-tighter text-white mb-1">{artist.rating}★</div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Alignment</div>
                </div>
                <div>
                  <div className="text-3xl font-display font-bold tracking-tighter text-white mb-1">{artist.yearsExperience}yr</div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Retention</div>
                </div>
                <div>
                  <div className="text-3xl font-display font-bold tracking-tighter text-white mb-1">${artist.hourlyRate}</div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Hourly Scale</div>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-ducks-green mb-4">Biomedical Narrative</h2>
              <p className="text-gray-300 leading-relaxed font-light text-lg">
                "{artist.bio}"
              </p>
            </div>

            <div className="space-y-4 mt-auto">
              <Button
                onClick={handleRequestQuote}
                disabled={!artist.bookingAvailable}
                className="w-full py-6 text-sm"
                variant={artist.bookingAvailable ? 'primary' : 'secondary'}
              >
                {artist.bookingAvailable ? 'Initialize Booking Interface' : 'Registry Closed'}
              </Button>

              <Button
                onClick={handleContact}
                variant="secondary"
                className="w-full py-6 text-sm"
                icon={Instagram}
              >
                Direct Contact // IG
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {artist.styles?.map(style => (
                <span key={style} className="text-[9px] bg-white/5 border border-white/5 px-3 py-1 rounded-full font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors">{style}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quote Request Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="glass-panel border-white/10 p-8 md:p-12 max-w-lg w-full rounded-[2rem] shadow-2xl relative bg-black/50">
            <button
              onClick={() => setShowQuoteModal(false)}
              className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"
            >
              ✕
            </button>
            <p className="text-ducks-green font-mono font-bold text-[9px] uppercase tracking-[0.4em] mb-4 text-center">Data Intake Protocol</p>
            <h3 className="text-4xl font-display font-bold mb-8 tracking-tighter text-center text-white">Request <span className="text-ducks-yellow">Quote.</span></h3>

            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert('Request transmitted to Life.exe'); setShowQuoteModal(false); }}>
              <div className="space-y-2">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Subject Name</label>
                <input
                  type="text"
                  required
                  className="w-full border-b border-white/10 py-3 focus:border-ducks-green outline-none bg-transparent font-bold text-white text-sm transition-colors placeholder-gray-700"
                  placeholder="IDENTITY"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Communication Node</label>
                <input
                  type="email"
                  required
                  className="w-full border-b border-white/10 py-3 focus:border-ducks-green outline-none bg-transparent font-bold text-white text-sm transition-colors placeholder-gray-700"
                  placeholder="LINK@LIFE.EXE"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Simulation Intent</label>
                <textarea
                  rows="4"
                  required
                  className="w-full border border-white/10 p-4 focus:border-ducks-green outline-none bg-black/40 rounded-xl resize-none font-medium text-white text-sm transition-colors placeholder-gray-700"
                  placeholder="Describe your design path..."
                ></textarea>
              </div>

              <Button
                type="submit"
                className="w-full py-5 text-xs"
              >
                Transmit Quote Request
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtistProfile;
