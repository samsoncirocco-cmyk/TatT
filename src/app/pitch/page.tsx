'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

export default function PitchPage() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Animate gradient on scroll
    const handleScroll = () => {
      const scrolled = window.scrollY;
      if (heroRef.current) {
        heroRef.current.style.setProperty('--scroll', `${scrolled * 0.5}px`);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="pitch-container">
      {/* Hero Section */}
      <section ref={heroRef} className="hero-section">
        <div className="animated-bg"></div>
        <div className="hero-content">
          <h1 className="hero-logo">TatT</h1>
          <p className="hero-tagline">Design Your Next Tattoo with AI</p>
          <Link href="/generate" className="cta-button">
            Try the Demo
          </Link>
        </div>
      </section>

      {/* Problem Section */}
      <section className="pitch-section problem-section">
        <div className="section-inner">
          <h2 className="section-title">The Problem</h2>
          <p className="section-lead">
            The $3.5B tattoo industry runs on Instagram DMs and guesswork
          </p>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">32%</div>
              <div className="stat-label">of people regret their tattoo</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">2+ weeks</div>
              <div className="stat-label">average time searching for designs</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">No preview</div>
              <div className="stat-label">before committing permanently</div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="pitch-section solution-section">
        <div className="section-inner">
          <h2 className="section-title">The TatT Pipeline</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3 className="feature-title">AI Design Generation</h3>
              <p className="feature-desc">Describe → generate → iterate until perfect</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3 className="feature-title">AR Try-On Preview</h3>
              <p className="feature-desc">See it on your body before committing</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3 className="feature-title">Artist Matching</h3>
              <p className="feature-desc">Find the right artist for your style</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📅</div>
              <h3 className="feature-title">Book & Pay</h3>
              <p className="feature-desc">Seamless booking + payment platform</p>
            </div>
          </div>
        </div>
      </section>

      {/* Market Section */}
      <section className="pitch-section market-section">
        <div className="section-inner">
          <h2 className="section-title">Market Opportunity</h2>
          <p className="section-lead">$3.5B US market, 145M Americans with tattoos</p>
          <div className="market-grid">
            <div className="market-card">
              <div className="market-label">TAM</div>
              <div className="market-value">$3.5B</div>
              <div className="market-desc">Total addressable market</div>
            </div>
            <div className="market-card">
              <div className="market-label">SAM</div>
              <div className="market-value">$850M</div>
              <div className="market-desc">Serviceable addressable market</div>
            </div>
            <div className="market-card">
              <div className="market-label">SOM</div>
              <div className="market-value">$85M</div>
              <div className="market-desc">Serviceable obtainable market</div>
            </div>
          </div>
          <div className="market-insights">
            <div className="insight">
              <span className="insight-stat">+20%</span>
              <span className="insight-text">Tattoo acceptance growth in 5 years</span>
            </div>
            <div className="insight">
              <span className="insight-stat">40%</span>
              <span className="insight-text">Gen Z have or want tattoos</span>
            </div>
          </div>
        </div>
      </section>

      {/* Business Model Section */}
      <section className="pitch-section business-section">
        <div className="section-inner">
          <h2 className="section-title">Business Model</h2>
          <p className="section-lead">Tiered SaaS + Marketplace</p>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-tier">Free</div>
              <div className="pricing-price">$0</div>
              <ul className="pricing-features">
                <li>5 generations/month</li>
                <li>Basic styles</li>
                <li>Community gallery</li>
              </ul>
            </div>
            <div className="pricing-card pricing-featured">
              <div className="pricing-tier">Pro</div>
              <div className="pricing-price">$12<span>/mo</span></div>
              <ul className="pricing-features">
                <li>Unlimited generations</li>
                <li>AR try-on preview</li>
                <li>Premium style library</li>
                <li>High-res exports</li>
              </ul>
            </div>
            <div className="pricing-card">
              <div className="pricing-tier">Studio</div>
              <div className="pricing-price">$49<span>/mo</span></div>
              <ul className="pricing-features">
                <li>Artist portfolio tools</li>
                <li>Booking management</li>
                <li>Client communications</li>
                <li>Payment processing</li>
              </ul>
            </div>
          </div>
          <div className="revenue-note">
            + 15% transaction fee on bookings
          </div>
        </div>
      </section>

      {/* Traction Section */}
      <section className="pitch-section traction-section">
        <div className="section-inner">
          <h2 className="section-title">Traction</h2>
          <div className="traction-grid">
            <div className="traction-card">
              <div className="traction-icon">🚀</div>
              <div className="traction-value">MVP Live</div>
              <div className="traction-label">tatt-app.vercel.app</div>
            </div>
            <div className="traction-card">
              <div className="traction-icon">🎨</div>
              <div className="traction-value">2,500+</div>
              <div className="traction-label">Designs generated</div>
            </div>
            <div className="traction-card">
              <div className="traction-icon">⚡</div>
              <div className="traction-value">8 weeks</div>
              <div className="traction-label">AI-assisted build time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="pitch-section team-section">
        <div className="section-inner">
          <h2 className="section-title">The Team</h2>
          <div className="team-card">
            <div className="team-name">Samson Cirocco</div>
            <div className="team-title">Founder & CEO</div>
            <div className="team-bio">
              <p>✓ Enterprise tech sales background (Fortinet)</p>
              <p>✓ Built multi-agent AI orchestration system</p>
              <p className="team-quote">"Technical enough to build, commercial enough to sell"</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ask Section */}
      <section className="pitch-section ask-section">
        <div className="section-inner">
          <h2 className="section-title gradient-text">The Ask</h2>
          <div className="ask-amount">$500K Seed Round</div>
          <p className="ask-purpose">Build mobile app + artist onboarding platform</p>
          <div className="ask-details">
            <div className="ask-item">
              <div className="ask-label">Runway</div>
              <div className="ask-value">18 months</div>
            </div>
            <div className="ask-milestones">
              <h3 className="milestones-title">Key Milestones</h3>
              <div className="milestone">📱 Native iOS & Android apps</div>
              <div className="milestone">🎯 1,000 onboarded artists</div>
              <div className="milestone">💰 $50K monthly recurring revenue</div>
            </div>
          </div>
          <Link href="/generate" className="cta-button cta-large">
            Experience TatT
          </Link>
        </div>
      </section>

      <style jsx>{`
        .pitch-container {
          background: #0a0a0a;
          color: #ffffff;
          scroll-snap-type: y proximity;
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          scroll-snap-align: start;
        }

        .animated-bg {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
          animation: gradientShift 20s ease infinite;
        }

        @keyframes gradientShift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
        }

        .hero-content {
          position: relative;
          z-index: 10;
          text-align: center;
          padding: 2rem;
        }

        .hero-logo {
          font-size: clamp(4rem, 15vw, 10rem);
          font-weight: 900;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          letter-spacing: -0.03em;
          animation: logoFloat 3s ease-in-out infinite;
        }

        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .hero-tagline {
          font-size: clamp(1.25rem, 3vw, 2rem);
          margin: 2rem 0 3rem;
          opacity: 0.9;
          font-weight: 300;
        }

        .cta-button {
          display: inline-block;
          padding: 1.25rem 3rem;
          font-size: 1.125rem;
          font-weight: 600;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          border: none;
          border-radius: 9999px;
          color: white;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 40px rgba(168, 85, 247, 0.3);
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 50px rgba(168, 85, 247, 0.5);
        }

        .cta-large {
          padding: 1.5rem 4rem;
          font-size: 1.25rem;
          margin-top: 2rem;
        }

        /* Section Styles */
        .pitch-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          scroll-snap-align: start;
        }

        .section-inner {
          max-width: 1200px;
          width: 100%;
        }

        .section-title {
          font-size: clamp(2.5rem, 6vw, 4rem);
          font-weight: 800;
          text-align: center;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .section-lead {
          font-size: clamp(1.125rem, 2.5vw, 1.5rem);
          text-align: center;
          opacity: 0.8;
          margin-bottom: 4rem;
          font-weight: 300;
        }

        .gradient-text {
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Problem Section */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 1.5rem;
          padding: 2.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(168, 85, 247, 0.4);
          transform: translateY(-5px);
        }

        .stat-number {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 1rem;
        }

        .stat-label {
          font-size: 1.125rem;
          opacity: 0.8;
        }

        /* Solution Section */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 1.5rem;
          padding: 2.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(236, 72, 153, 0.4);
          transform: translateY(-5px);
        }

        .feature-icon {
          font-size: 3rem;
          margin-bottom: 1.5rem;
        }

        .feature-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .feature-desc {
          opacity: 0.8;
          line-height: 1.6;
        }

        /* Market Section */
        .market-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .market-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 1.5rem;
          padding: 2.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .market-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(168, 85, 247, 0.4);
          transform: scale(1.05);
        }

        .market-label {
          font-size: 1rem;
          opacity: 0.7;
          margin-bottom: 0.5rem;
          font-weight: 600;
          letter-spacing: 0.1em;
        }

        .market-value {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 1rem;
        }

        .market-desc {
          opacity: 0.7;
          font-size: 0.875rem;
        }

        .market-insights {
          display: flex;
          flex-wrap: wrap;
          gap: 2rem;
          justify-content: center;
        }

        .insight {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .insight-stat {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .insight-text {
          opacity: 0.8;
          text-align: center;
        }

        /* Business Model Section */
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .pricing-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 1.5rem;
          padding: 2.5rem;
          transition: all 0.3s ease;
        }

        .pricing-featured {
          background: rgba(168, 85, 247, 0.1);
          border: 2px solid rgba(168, 85, 247, 0.5);
          transform: scale(1.05);
        }

        .pricing-card:hover {
          transform: translateY(-5px);
          border-color: rgba(236, 72, 153, 0.4);
        }

        .pricing-tier {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .pricing-price {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 2rem;
        }

        .pricing-price span {
          font-size: 1.5rem;
          opacity: 0.7;
        }

        .pricing-features {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .pricing-features li {
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          opacity: 0.9;
        }

        .pricing-features li:last-child {
          border-bottom: none;
        }

        .revenue-note {
          text-align: center;
          font-size: 1.25rem;
          padding: 1.5rem;
          background: rgba(168, 85, 247, 0.1);
          border-radius: 1rem;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }

        /* Traction Section */
        .traction-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
        }

        .traction-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 1.5rem;
          padding: 2.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .traction-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(236, 72, 153, 0.4);
          transform: translateY(-5px);
        }

        .traction-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .traction-value {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.5rem;
        }

        .traction-label {
          opacity: 0.8;
        }

        /* Team Section */
        .team-card {
          max-width: 700px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 1.5rem;
          padding: 3rem;
          text-align: center;
        }

        .team-name {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.5rem;
        }

        .team-title {
          font-size: 1.25rem;
          opacity: 0.7;
          margin-bottom: 2rem;
        }

        .team-bio p {
          font-size: 1.125rem;
          margin: 1rem 0;
          opacity: 0.9;
        }

        .team-quote {
          font-style: italic;
          font-size: 1.5rem !important;
          margin-top: 2rem !important;
          opacity: 1 !important;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Ask Section */
        .ask-section {
          text-align: center;
        }

        .ask-amount {
          font-size: clamp(3rem, 8vw, 5rem);
          font-weight: 900;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 1rem;
        }

        .ask-purpose {
          font-size: 1.5rem;
          opacity: 0.9;
          margin-bottom: 3rem;
        }

        .ask-details {
          max-width: 800px;
          margin: 0 auto 3rem;
        }

        .ask-item {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .ask-label {
          font-size: 1.25rem;
          opacity: 0.7;
        }

        .ask-value {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .milestones-title {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          opacity: 0.9;
        }

        .milestone {
          font-size: 1.125rem;
          padding: 1rem;
          margin: 0.75rem 0;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 0.75rem;
          transition: all 0.3s ease;
        }

        .milestone:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(236, 72, 153, 0.4);
          transform: translateX(5px);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .pitch-section {
            padding: 3rem 1.5rem;
          }

          .stats-grid,
          .features-grid,
          .market-grid,
          .pricing-grid,
          .traction-grid {
            grid-template-columns: 1fr;
          }

          .pricing-featured {
            transform: scale(1);
          }

          .market-insights {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
