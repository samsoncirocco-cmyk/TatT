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
            <p className="italic text-xs text-gray-400 mb-2">No catches here</p>
            <h1 className="text-2xl font-bold mb-4">Tattoo Artists Booking Now</h1>
            <ul className="space-y-2 mb-8 text-[11px] text-gray-600 uppercase tracking-wider font-semibold">
              <li className="flex items-center gap-2"><span className="text-purple-600">✓</span> Verified by Industry Peers</li>
              <li className="flex items-center gap-2"><span className="text-purple-600">✓</span> Studio Health, Safety, & Legitimacy</li>
              <li className="flex items-center gap-2"><span className="text-purple-600">✓</span> Professional Skill & Quality</li>
              <li className="flex items-center gap-2"><span className="text-purple-600">✓</span> Human-to-Human in Rental Channels</li>
              <li className="flex items-center gap-2"><span className="text-purple-600">✓</span> Uphold Code of Conduct</li>
            </ul>
            <Link to="/artists" className="btn-cocreate">See Booking Artists →</Link>
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
                <div className="absolute bottom-2 right-2 bg-purple-600 text-white rounded-full p-1 border-2 border-white">
                  <span className="text-xs">✓</span>
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
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Why Our Verification Drives Bookings</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-sm">
              Connecting with verified artists means you bypass the mystery and amateur loops. We verify health standards, professional track records, and craftsmanship so you only see the best.
            </p>
            <Link to="/philosophy" className="bg-orange-500 text-white px-6 py-2 rounded font-bold text-xs uppercase tracking-widest hover:bg-orange-600">Want to get verified? →</Link>
          </div>
        </div>
      </section>

      {/* 3. SYSTEM FEATURES SECTION */}
      <section className="py-24 border-b border-gray-100 bg-gray-50/30">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-[1fr_400px] gap-20 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-8">A System Built to Turn Interest Into Bookings - Free For Artists</h2>
            <ul className="space-y-4 mb-10">
              <FeatureItem text="Verified Booking Platform" />
              <FeatureItem text="Artist Portfolio & Talent Management" />
              <FeatureItem text="Custom Web & Phone View Designs" />
              <FeatureItem text="Professional Trade Leads" />
              <FeatureItem text="Direct Client Communication" />
              <FeatureItem text="Schedule & Manage Appointments" />
              <FeatureItem text="Secure Deposits & Payment Flows" />
            </ul>
            <Link to="/generate" className="bg-orange-500 text-white px-6 py-2 rounded font-bold text-xs uppercase tracking-widest hover:bg-orange-600">Learn More ↓</Link>
          </div>

          <div className="relative">
            <div className="relative z-10 rotate-3">
              <img src="/images/phone_tatt_mockup.png" alt="TatTester App" className="w-full max-w-[300px] mx-auto drop-shadow-2xl" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500/10 rounded-full blur-[80px] -z-10" />
          </div>
        </div>
      </section>

      {/* 4. TESTIMONIAL GRID */}
      <section className="py-24 bg-purple-600 overflow-hidden">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6">
            <QuoteCard text="Connecting me with everything together so I'm not juggling different tools. Makes it much easier to focus on tattooing." author="Dominic Harris" />
            <QuoteCard text="Booking artists and managing clients became a breeze. The interface is intuitive and the talent is top-notch." author="Jordan Lee" />
            <QuoteCard text="The verification process gave me peace of mind. Knowing my artist is professional and verified is everything." author="Alex Rivera" />
            <QuoteCard text="Finally, a platform that understands the artistic side of tattoos, not just the booking side." author="Mila Chen" />
            <QuoteCard text="Great for clients and artists alike. The AR previews are a game changer for my consultation process." author="Marcus Thorne" />
            <div className="min-w-[400px] bg-white/10 rounded-lg flex items-center justify-center p-12 text-center text-white">
              <h3 className="text-2xl font-bold">Join CoCreate <br /> Booking Artists</h3>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CTA BAR */}
      <footer className="bg-purple-600 py-2 border-t border-purple-500">
        <div className="text-center text-white/60 text-[10px] uppercase tracking-widest font-bold">
          Join CoCreate ↓ Start Booking Now
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
          <span className="text-white/80 text-[10px] uppercase font-bold tracking-widest bg-black/20 px-2 py-0.5 rounded">Booking</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
      </div>
    </div>
  );
}

function FeatureItem({ text }) {
  return (
    <li className="flex items-center gap-3 group">
      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full group-hover:scale-150 transition-transform" />
      <span className="text-sm font-semibold text-gray-700 tracking-tight">{text}</span>
    </li>
  );
}

function QuoteCard({ text, author }) {
  return (
    <div className="min-w-[320px] bg-white p-8 rounded-lg shadow-xl shadow-purple-900/20 flex flex-col justify-between">
      <p className="text-sm italic text-gray-700 leading-relaxed mb-6 font-medium">"{text}"</p>
      <div>
        <p className="font-bold text-xs uppercase tracking-widest">{author}</p>
        <p className="text-[10px] text-gray-400 mt-1 uppercase">Tattoo Artist</p>
      </div>
    </div>
  );
}

