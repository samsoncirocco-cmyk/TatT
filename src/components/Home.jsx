/**
 * Home Component
 *
 * Landing page for TatTester
 * Clean, gallery-like aesthetic with clear CTA
 */

import { Link } from 'react-router-dom';
import { getLibraryStats } from '../services/designLibraryService';
import { getAPIUsage } from '../services/replicateService';
import { useState, useEffect } from 'react';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    setStats(getLibraryStats());
    setUsage(getAPIUsage());
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          TatTester
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          AI-Powered Tattoo Design Generator
        </p>
        <p className="text-sm text-gray-500 max-w-2xl mx-auto">
          Transform your tattoo ideas into reality with AI. Generate custom designs,
          preview in AR, and connect with the perfect artist.
        </p>
      </div>

      {/* Main CTA */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <Link
          to="/generate"
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-4 rounded-lg font-semibold text-lg transition-all active:scale-98 shadow-lg"
        >
          Start Creating Your Design
        </Link>
      </div>

      {/* Features Grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            icon="sparkles"
            title="AI Design"
            description="Generate unique tattoo designs with advanced AI technology"
          />
          <FeatureCard
            icon="palette"
            title="7 Styles"
            description="Traditional, Japanese, Minimalist, Realism, and more"
          />
          <FeatureCard
            icon="save"
            title="Save & Compare"
            description="Build your library and compare designs side-by-side"
          />
        </div>
      </div>

      {/* Stats Section */}
      {stats && stats.total > 0 && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Your Stats
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatItem label="Total Designs" value={stats.total} />
              <StatItem label="Favorites" value={stats.favorites} />
              <StatItem label="Remaining Slots" value={stats.remaining} />
              {usage && (
                <StatItem
                  label="Budget Used"
                  value={`$${usage.totalSpent.toFixed(2)}`}
                />
              )}
            </div>

            {stats.total > 0 && (
              <Link
                to="/library"
                className="mt-4 block text-center text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                View Your Library →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          How It Works
        </h2>

        <div className="space-y-4">
          <Step
            number="1"
            title="Choose Your Style"
            description="Select from 7 professional tattoo styles, from Traditional to Photorealistic"
          />
          <Step
            number="2"
            title="Describe Your Vision"
            description="Tell our AI what you want - be as detailed or simple as you like"
          />
          <Step
            number="3"
            title="Generate Variations"
            description="Get 4 unique design variations in seconds, all optimized for tattooing"
          />
          <Step
            number="4"
            title="Save Your Favorites"
            description="Build your personal library and prepare for AR preview (coming soon)"
          />
        </div>
      </div>

      {/* Budget Info */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Transparent Pricing
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            Each generation costs approximately $0.022 and creates 4 unique variations.
            We track your usage to keep you informed.
          </p>
          {usage && (
            <div className="text-sm text-blue-700">
              Total spent: <span className="font-semibold">${usage.totalSpent.toFixed(2)}</span> |
              Remaining budget: <span className="font-semibold">${usage.remainingBudget.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  const icons = {
    sparkles: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    ),
    palette: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    ),
    save: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    )
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3">
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icons[icon]}
        </svg>
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-600 mt-1">{label}</div>
    </div>
  );
}

function Step({ number, title, description }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}
