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
            <p className="italic text-xs text-ducks-green mb-2 font-bold tracking-widest uppercase">Initializing Life.exe...</p>
            <h1 className="text-3xl font-bold mb-4 tracking-tighter leading-none">Your Skin is the <br /><span className="text-ducks-green italic">Final Ledger.</span></h1>
            <ul className="space-y-2 mb-8 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              <li className="flex items-center gap-2 text-ducks-green"><span className="text-ducks-yellow bg-ducks-green rounded-full w-4 h-4 flex items-center justify-center text-[8px]">✓</span> 15-Month Lag Collapsed</li>
              <li className="flex items-center gap-2"><span className="text-ducks-green">✓</span> 4,200+ Regret Patterns Analyzed</li>
              <li className="flex items-center gap-2"><span className="text-ducks-green">✓</span> Zero Latency Body-Mapping</li>
              <li className="flex items-center gap-2"><span className="text-ducks-green">✓</span> Peer-Reviewed Artist Integrity</li>
              <li className="flex items-center gap-2"><span className="text-ducks-green">✓</span> Hardcoded Permanence Prep</li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/artists" className="btn-cocreate">Patch Your Future Ink →</Link>
              <Link to="/smart-match" className="btn-cocreate-yellow">Start Smart Match (Swipe) →</Link>
            </div>
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
                <div className="absolute bottom-2 right-2 bg-ducks-yellow text-ducks-green rounded-full p-1 border-2 border-white">
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
                <p className="text-[10px] uppercase tracking-widest text-ducks-green font-black">Samson Protocol: Validated</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold mb-4 leading-tight">Abort the <br /><span className="text-ducks-green italic">Permanence Crisis.</span></h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-sm font-medium">
              Market data shows 70% of first-timers spend **15-20 months** in a "Permanent Panic" loop. In Life.exe, there is no undo button. TatTester bridges the "Vision Gap" for the 3,800+ seekers who can't visualize the ink.
              We collapse 2 years of overthinking into 2 weeks of precision.
            </p>
            <Link to="/philosophy" className="btn-cocreate-yellow">Download Confidence.dmg →</Link>
          </div>
        </div>
      </section>

      {/* 3. SYSTEM FEATURES SECTION */}
      <section className="py-24 border-b border-gray-100 bg-gray-50/30">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-[1fr_400px] gap-20 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-4 italic">The Simulation Layer</h2>
            <p className="text-xs text-gray-400 mb-8 max-w-md">3.5x higher booking confidence validated via AR-adjacent conversion metrics. Your skin deserves higher resolution planning.</p>
            <ul className="space-y-4 mb-10">
              <FeatureItem text="Prompt-to-Simulation Architecture" />
              <FeatureItem text="Photorealistic Skin-Map AR (±2cm accuracy)" />
              <FeatureItem text="Samson-Verified Artist Network" />
              <FeatureItem text="Regret-Vector Analysis" />
              <FeatureItem text="Multi-Angle Placement Comparison" />
              <FeatureItem text="Direct Bio-Trace Communication" />
              <FeatureItem text="Secure Escrow Payment Flow" />
            </ul>
            <Link to="/generate" className="btn-cocreate">Execute Forge.exe ↓</Link>
          </div>

          <div className="relative">
            <div className="relative z-10 rotate-3">
              <div className="p-2 bg-ducks-green rounded-[2.5rem] shadow-2xl">
                <img src="/images/phone_tatt_mockup.png" alt="TatTester App" className="w-full max-w-[300px] mx-auto rounded-[2rem]" />
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-ducks-green/10 rounded-full blur-[80px] -z-10" />
          </div>
        </div>
      </section>

      {/* 4. TESTIMONIAL GRID */}
      <section className="py-24 bg-ducks-green overflow-hidden">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6">
            <QuoteCard text="I was stuck in the loop for 18 months. TatTester collapsed the Vision Gap in 30 seconds. No more panic." author="Samson Cirocco" />
            <QuoteCard text="25% of my clients used to cancel due to anxiety. Now, if they've passed the TatTester simulation, they're 3.5x more likely to sit in the chair." author="Felix Young" />
            <QuoteCard text="Life.exe is unforgiving. TatTester is the only reset button I’ve found for my sleeve planning." author="Alex Rivera" />
            <QuoteCard text="The Samson Test filters out the noise. I know my artist is validated before the first needle drop." author="Mila Chen" />
            <QuoteCard text="Accuracy matters. The AR body-mapping is the first time I've felt in control of my skin's ledger." author="Marcus Thorne" />
            <div className="min-w-[400px] bg-white/5 border border-white/10 rounded-lg flex items-center justify-center p-12 text-center text-white">
              <h3 className="text-2xl font-bold">Initialize <br /> Your Visual Patch</h3>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CTA BAR */}
      <footer className="bg-ducks-green py-6 border-t border-white/5">
        <div className="text-center text-white/40 text-[8px] uppercase tracking-[0.4em] font-black">
          TatTester // Protocol 4.2.1 // Life.exe Environment // (c) 2025
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
          <span className="text-ducks-green text-[10px] uppercase font-black tracking-widest bg-ducks-yellow px-2 py-0.5 rounded shadow-sm">Validated</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
      </div>
    </div>
  );
}

function FeatureItem({ text }) {
  return (
    <li className="flex items-center gap-3 group">
      <div className="w-1.5 h-1.5 bg-ducks-green rounded-full group-hover:scale-150 transition-transform" />
      <span className="text-sm font-semibold text-gray-700 tracking-tight">{text}</span>
    </li>
  );
}

function QuoteCard({ text, author }) {
  return (
    <div className="min-w-[320px] bg-white p-8 rounded-lg shadow-xl shadow-green-900/20 flex flex-col justify-between">
      <p className="text-sm italic text-gray-700 leading-relaxed mb-6 font-medium">"{text}"</p>
      <div>
        <p className="font-bold text-xs uppercase tracking-widest text-ducks-green">{author}</p>
        <p className="text-[10px] text-gray-400 mt-1 uppercase">Overthinker #0421</p>
      </div>
    </div>
  );
}
