import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Home() {
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    // Safely load artists data
    try {
      import('../data/artists.json').then(module => {
        const artistsData = module.default || module;
        if (artistsData?.artists) {
          const bookingArtists = artistsData.artists.filter(a => a.bookingAvailable);
          setArtists(bookingArtists.slice(0, 6));
        }
      }).catch(err => {
        console.error('Error loading artists:', err);
        setArtists([]);
      });
    } catch (err) {
      console.error('Error in artists useEffect:', err);
      setArtists([]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-green-50/30 to-yellow-50/20">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #154733 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
            {/* Left: Content */}
            <div className="space-y-6 md:space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Production Ready</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                Turn Your Tattoo Idea Into
                <span className="block text-green-600 mt-2">Confidence</span>
              </h1>

              <p className="text-lg sm:text-xl md:text-2xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                AI-powered design generation, AR visualization, and smart artist matching. 
                Collapse 15 months of overthinking into 15 minutes of precision.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Link 
                  to="/generate" 
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base sm:text-lg"
                >
                  Start Creating Free
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  to="/smart-match" 
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-white border-2 border-green-600 text-green-600 font-semibold rounded-lg hover:bg-green-50 transition-all text-base sm:text-lg"
                >
                  Find Your Artist
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 sm:gap-8 pt-6 md:pt-8 border-t border-gray-200">
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">250+</div>
                  <div className="text-xs sm:text-sm text-gray-500">Character Database</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">5 AI</div>
                  <div className="text-xs sm:text-sm text-gray-500">Generation Models</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">3.5x</div>
                  <div className="text-xs sm:text-sm text-gray-500">Higher Confidence</div>
                </div>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative order-first lg:order-last">
              <div className="relative z-10">
                <div className="aspect-[4/5] max-w-sm mx-auto lg:max-w-none rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border-4 md:border-8 border-white">
                  <img 
                    src="/images/hero.png" 
                    alt="TatTester App Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&h=1000&fit=crop';
                    }}
                  />
                </div>
              </div>
              {/* Decorative Elements - Hidden on mobile */}
              <div className="hidden md:block absolute -top-8 -right-8 w-48 h-48 lg:w-64 lg:h-64 bg-green-200 rounded-full blur-3xl opacity-30 -z-10"></div>
              <div className="hidden md:block absolute -bottom-8 -left-8 w-48 h-48 lg:w-64 lg:h-64 bg-yellow-200 rounded-full blur-3xl opacity-30 -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Features Grid */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to <span className="text-green-600">Get Inked</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Powered by cutting-edge AI and production-grade infrastructure
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <FeatureCard
              icon={
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
              title="AI Council Enhancement"
              description="250+ character database with intelligent prompt enhancement. Multi-character spatial separation prevents merging."
              badge="NEW"
            />

            <FeatureCard
              icon={
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              title="5 AI Models"
              description="SDXL, Anime XL, DreamShaper Turbo, Tattoo Flash Art, and Imagen 3. Choose the perfect style for your vision."
            />

            <FeatureCard
              icon={
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
              title="AR Visualization"
              description="See your tattoo on your body in real-time. ±2cm accuracy with photorealistic skin-mapping technology."
            />

            <FeatureCard
              icon={
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="Smart Artist Matching"
              description="Tinder-style swipe matching with graph database recommendations. Find the perfect artist for your style."
            />

            <FeatureCard
              icon={
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
              title="AI Inpainting Editor"
              description="Edit specific parts of your design with AI-powered brush tool. Perfect your design before booking."
            />

            <FeatureCard
              icon={
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="300 DPI Stencil Export"
              description="Professional-grade stencil export for artists. Print-ready at 300 DPI for crisp, clean lines."
            />

            <FeatureCard
              icon={
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              }
              title="Design Library"
              description="Save and manage up to 50 designs. Organize your ideas and compare variations side-by-side."
            />

            <FeatureCard
              icon={
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              title="Production Security"
              description="Enterprise-grade security with rate limiting, Bearer auth, CORS protection, and typed error handling."
              badge="SECURE"
            />

            <FeatureCard
              icon={
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              }
              title="7 Tattoo Styles"
              description="Traditional, Neo-Traditional, Japanese, Minimalist, Watercolor, Blackwork, and Realism. Optimized prompts for each."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-white to-green-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              From Idea to <span className="text-green-600">Ink</span> in Minutes
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              A simple, powerful workflow designed for first-time seekers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <StepCard
              number="1"
              title="Generate Your Design"
              description="Describe your idea. Our AI Council enhances it with 250+ character database and generates 4 variations using 5 different models."
              link="/generate"
              linkText="Start Creating →"
            />
            <StepCard
              number="2"
              title="Visualize on Your Body"
              description="Use AR to see exactly how your tattoo will look. Drag, resize, and adjust placement with ±2cm accuracy."
              link="/visualize"
              linkText="Try AR Preview →"
            />
            <StepCard
              number="3"
              title="Find Your Artist"
              description="Swipe through verified artists matched to your style. Book directly through our platform with confidence."
              link="/smart-match"
              linkText="Find Artists →"
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Trusted by <span className="text-green-600">First-Time Seekers</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <TestimonialCard
              quote="I was stuck in the loop for 18 months. TatTester collapsed the Vision Gap in 30 seconds. No more panic."
              author="Samson C."
              role="First-Time Seeker"
            />
            <TestimonialCard
              quote="25% of my clients used to cancel due to anxiety. Now, if they've passed the TatTester simulation, they're 3.5x more likely to sit in the chair."
              author="Felix Y."
              role="Tattoo Artist"
            />
            <TestimonialCard
              quote="The AR body-mapping is the first time I've felt in control of my skin's ledger. Accuracy matters."
              author="Marcus T."
              role="First-Time Seeker"
            />
          </div>
        </div>
      </section>

      {/* Featured Artists */}
      {artists.length > 0 && (
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-12 gap-4">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-2">Featured Artists</h2>
                <p className="text-sm sm:text-base text-gray-600">Verified professionals ready to bring your vision to life</p>
              </div>
              <Link 
                to="/artists" 
                className="text-green-600 font-semibold hover:text-green-700 flex items-center gap-2 text-sm sm:text-base"
              >
                View All
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {artists.map((artist) => (
                <Link key={artist.id} to={`/artists/${artist.id}`}>
                  <div className="group cursor-pointer">
                    <div className="aspect-square rounded-xl md:rounded-2xl overflow-hidden mb-2 sm:mb-3 shadow-md group-hover:shadow-xl transition-all">
                      <img
                        src={artist.portfolioImages[0]}
                        alt={artist.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm mb-1">{artist.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{artist.specialties[0]}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6">
            Ready to Get Inked?
          </h2>
          <p className="text-lg sm:text-xl mb-6 md:mb-8 text-green-50">
            Join thousands of first-time seekers who found confidence through TatTester
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link 
              to="/generate" 
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-white text-green-600 font-semibold rounded-lg hover:bg-green-50 transition-all shadow-lg text-base sm:text-lg"
            >
              Create Your First Design
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link 
              to="/smart-match" 
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-400 transition-all border-2 border-white/20 text-base sm:text-lg"
            >
              Find Your Artist
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, badge }) {
  return (
    <div className="group p-6 md:p-8 bg-white rounded-xl md:rounded-2xl border border-gray-200 hover:border-green-300 hover:shadow-xl transition-all">
      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-4 group-hover:bg-green-100 transition-colors">
        {icon}
      </div>
      {badge && (
        <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded mb-3">
          {badge}
        </span>
      )}
      <h3 className="text-lg sm:text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description, link, linkText }) {
  return (
    <div className="relative">
      <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 w-10 h-10 sm:w-12 sm:h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg sm:text-xl shadow-lg z-10">
        {number}
      </div>
      <div className="p-6 md:p-8 bg-white rounded-xl md:rounded-2xl border border-gray-200 shadow-sm h-full pt-8 sm:pt-10">
        <h3 className="text-xl sm:text-2xl font-bold mb-3">{title}</h3>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">{description}</p>
        <Link 
          to={link}
          className="text-green-600 font-semibold hover:text-green-700 flex items-center gap-2 text-sm sm:text-base"
        >
          {linkText}
        </Link>
      </div>
    </div>
  );
}

function TestimonialCard({ quote, author, role }) {
  return (
    <div className="p-6 md:p-8 bg-white rounded-xl md:rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6 italic leading-relaxed">"{quote}"</p>
      <div>
        <p className="font-semibold text-gray-900 text-sm sm:text-base">{author}</p>
        <p className="text-xs sm:text-sm text-gray-500">{role}</p>
      </div>
    </div>
  );
}
