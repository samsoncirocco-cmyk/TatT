import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import artistsData from '../data/artists.json';

export default function Home() {
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    // Filter artists who are "Booking Now"
    const bookingArtists = artistsData.artists.filter(a => a.bookingAvailable);
    setArtists(bookingArtists);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 border-t border-gray-100">

      {/* 1. TOP CAROUSEL SECTION */}
      <section className="pt-24 pb-12 overflow-hidden border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 grid md:grid-cols-[300px_1fr] gap-12 items-start">
          <div className="pt-4">
            <p className="italic text-xs text-gray-400 mb-2">Life.exe is unforgiving</p>
            <h1 className="text-2xl font-bold mb-4">Simulate Your Future Ink</h1>
            <ul className="space-y-2 mb-8 text-[11px] text-gray-600 uppercase tracking-wider font-semibold">
              <li className="flex items-center gap-2"><span className="text-green-800">✓</span> The Samson Test Verified</li>
              <li className="flex items-center gap-2"><span className="text-green-800">✓</span> Zero Latency Visuals</li>
              <li className="flex items-center gap-2"><span className="text-green-800">✓</span> Tactile Realism Simulation</li>
              <li className="flex items-center gap-2"><span className="text-green-800">✓</span> Peer-Reviewed Artist Integrity</li>
              <li className="flex items-center gap-2"><span className="text-green-800">✓</span> Permanent Panic Prevention</li>
            </ul>
            <Link to="/artists" className="btn-cocreate">Find Your Artist →</Link>
          </div>

          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-8">
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </div>
      </section>

      {/* 2. VERIFICATION SECTION */}
      <section className="py-24 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
          <div className="relative h-[400px] flex items-center justify-center">
            {/* The circular profile layout */}
            <div className="relative w-64 h-64">
              {/* Main Center Image */}
              <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-white shadow-xl z-20">
                <img src={artists[0]?.portfolioImages[0]} alt="Featured Artist" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 bg-[#FEE123] text-[#154733] rounded-full p-1 border-2 border-white">
                  <span className="text-xs font-bold">✓</span>
                </div>
              </div>
              {/* Outer orbiting images */}
              <div className="absolute -top-12 -left-12 w-16 h-16 rounded-full border-2 border-white shadow-md overflow-hidden z-10">
                <img src={artists[1]?.portfolioImages[1]} alt="Artist" className="w-full h-full object-cover" />
              </div>
              <div className="absolute top-0 -right-16 w-14 h-14 rounded-full border-2 border-white shadow-md overflow-hidden z-10">
                <img src={artists[2]?.portfolioImages[0]} alt="Artist" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-10 right-10 w-20 h-20 rounded-full border-2 border-white shadow-md overflow-hidden z-10">
                <img src={artists[3]?.portfolioImages[2]} alt="Artist" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-4 -left-20 w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden z-10">
                <img src={artists[4]?.portfolioImages[0]} alt="Artist" className="w-full h-full object-cover" />
              </div>
              <div className="absolute top-20 -left-20 w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden z-10">
                <img src={artists[5]?.portfolioImages[1]} alt="Artist" className="w-full h-full object-cover" />
              </div>

              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center w-full">
                <h3 className="text-xl font-bold tracking-tight">{artists[0]?.name}</h3>
                <p className="text-[10px] uppercase tracking-widest text-green-800 font-bold">Samson Protocol Gold</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold mb-4 leading-tight">Eliminate The "Permanence Panic"</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-sm">
              In the Life.exe universe, mistakes are written in ink. TatTester bridges the "Vision Gap" by allowing you to simulate your tattoo path before the first needle drop. Our artists pass the Samson Protocol—rigorous verification of sanity, safety, and soul.
            </p>
            <Link to="/philosophy" className="btn-cocreate-yellow">Join The Simulation →</Link>
          </div>
        </div>
      </section>

      {/* 3. SYSTEM FEATURES SECTION */}
      <section className="py-24 border-b border-gray-100 bg-gray-50/30">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-[1fr_400px] gap-20 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-8 italic">A Living System for Non-Standard Lives</h2>
            <ul className="space-y-4 mb-10">
              <FeatureItem text="Prompt-to-Simulation Architecture" />
              <FeatureItem text="Photorealistic Skin-Map AR" />
              <FeatureItem text="Samson-Verified Artist Network" />
              <FeatureItem text="Anxiety-Neutral Consultation Flow" />
              <FeatureItem text="Multi-Placement Comparison Mode" />
              <FeatureItem text="Direct Bio-Trace Communication" />
              <FeatureItem text="Secure Escrow Payment Systems" />
            </ul>
            <Link to="/generate" className="btn-cocreate">Initialize Forge ↓</Link>
          </div>

          <div className="relative">
            <div className="relative z-10 rotate-3">
              <div className="p-2 bg-[#154733] rounded-[2.5rem] shadow-2xl">
                <img src="/images/phone_tatt_mockup.png" alt="TatTester App" className="w-full max-w-[300px] mx-auto rounded-[2rem]" />
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-green-500/10 rounded-full blur-[80px] -z-10" />
          </div>
        </div>
      </section>

      {/* 4. TESTIMONIAL GRID */}
      <section className="py-24 bg-[#154733] overflow-hidden">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6">
            <QuoteCard text="I was stuck in loop for 2 years. TatTester showed me exactly how the sternum piece would flow. No more panic." author="Samson Cirocco" />
            <QuoteCard text="Finally, a way to speak artist-to-client without the noise. The AR previews are mandatory for my shop now." author="Felix Young" />
            <QuoteCard text="Life.exe is unforgiving, but this tool gave me the reset button I needed for my sleeve design." author="Alex Rivera" />
            <QuoteCard text="The Samson Test changed everything. I know my artist is legit before I even step in the door." author="Mila Chen" />
            <QuoteCard text="Best simulation tech I've seen. It's not just an app, it's a confidence engine." author="Marcus Thorne" />
            <div className="min-w-[400px] bg-white/5 border border-white/10 rounded-lg flex items-center justify-center p-12 text-center text-white">
              <h3 className="text-2xl font-bold">Initialize <br /> Your Reset Button</h3>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CTA BAR */}
      <footer className="bg-[#154733] py-4 border-t border-green-900/50">
        <div className="text-center text-white/40 text-[9px] uppercase tracking-[0.3em] font-bold">
          TatTester // Simulating The Permanent // Life.exe Compatible
        </div>
      </footer>
    </div>
  );
}

function ArtistCard({ artist }) {
  return (
    <div className="min-w-[180px] group cursor-pointer relative">
      <div className="aspect-[3/4] overflow-hidden rounded-md mb-3 shadow-sm border border-gray-100">
        <img
          src={artist.portfolioImages[0]}
          alt={artist.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute bottom-10 left-3 z-10">
          <h3 className="text-white text-sm font-bold drop-shadow-md">{artist.name}</h3>
        </div>
        <div className="absolute bottom-3 left-3 z-10">
          <span className="text-[#154733] text-[10px] uppercase font-bold tracking-widest bg-[#FEE123] px-2 py-0.5 rounded shadow-sm">Verified</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
      </div>
    </div>
  );
}

function FeatureItem({ text }) {
  return (
    <li className="flex items-center gap-3 group">
      <div className="w-1.5 h-1.5 bg-[#154733] rounded-full group-hover:scale-150 transition-transform" />
      <span className="text-sm font-semibold text-gray-700 tracking-tight">{text}</span>
    </li>
  );
}

function QuoteCard({ text, author }) {
  return (
    <div className="min-w-[320px] bg-white p-8 rounded-lg shadow-xl shadow-green-900/20 flex flex-col justify-between">
      <p className="text-sm italic text-gray-700 leading-relaxed mb-6 font-medium">"{text}"</p>
      <div>
        <p className="font-bold text-xs uppercase tracking-widest text-[#154733]">{author}</p>
        <p className="text-[10px] text-gray-400 mt-1 uppercase">Satisfied User</p>
      </div>
    </div>
  );
}
