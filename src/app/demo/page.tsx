'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STEPS = [
  {
    id: 1,
    title: 'Describe Your Vision',
    subtitle: 'Tell the AI what you want',
    icon: '✨',
    content: (
      <div className="space-y-4">
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <label className="text-sm text-gray-400 block mb-2">Your tattoo idea</label>
          <div className="text-lg text-white font-medium leading-relaxed typing-animation">
            Geometric wolf on forearm, blackwork style with sacred geometry patterns, 
            moon phases wrapping around the design
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Blackwork', 'Geometric', 'Sacred Geometry', 'Nature'].map(tag => (
            <span key={tag} className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span className="flex items-center gap-1">📍 Forearm</span>
          <span className="flex items-center gap-1">📐 Medium (4&quot; × 6&quot;)</span>
          <span className="flex items-center gap-1">🎨 Black &amp; Gray</span>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: 'AI Generation',
    subtitle: '4 unique variations in < 3 seconds',
    icon: '🤖',
    content: (
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Variation A', score: 94, desc: 'Bold geometric lines' },
          { label: 'Variation B', score: 91, desc: 'Flowing sacred patterns' },
          { label: 'Variation C', score: 88, desc: 'Minimalist approach' },
          { label: 'Variation D', score: 86, desc: 'Detailed dotwork fusion' },
        ].map((v, i) => (
          <div key={i} className={`relative bg-white/5 rounded-xl border ${i === 0 ? 'border-purple-500/50 ring-1 ring-purple-500/20' : 'border-white/10'} overflow-hidden group`}>
            <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-6xl opacity-30">🐺</div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">{v.label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v.score >= 90 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {v.score}/100
                </span>
              </div>
              <p className="text-xs text-gray-400">{v.desc}</p>
            </div>
            {i === 0 && (
              <div className="absolute top-2 left-2 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                TOP PICK
              </div>
            )}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 3,
    title: 'AR Preview',
    subtitle: 'See it on your body before committing',
    icon: '📱',
    content: (
      <div className="relative bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="aspect-[3/4] max-h-[400px] bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center relative">
          <div className="text-center space-y-3">
            <div className="text-8xl">💪</div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-purple-500/50 rounded-lg flex items-center justify-center bg-purple-500/5">
              <span className="text-5xl opacity-60">🐺</span>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex justify-between">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              AR Tracking Active
            </div>
            <div className="flex gap-2">
              {['↻', '↔', '⊕'].map((icon, i) => (
                <button key={i} className="w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-sm">
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: 'Artist Match',
    subtitle: 'AI-powered style matching with verified artists',
    icon: '🎨',
    content: (
      <div className="space-y-3">
        {[
          { name: 'Alex Rivera', specialty: 'Geometric & Blackwork', match: 97, rating: 4.9, reviews: 342, price: '$$' },
          { name: 'Kai Chen', specialty: 'Sacred Geometry & Dotwork', match: 94, rating: 4.8, reviews: 218, price: '$$$' },
          { name: 'Sam Ortiz', specialty: 'Blackwork & Illustrative', match: 91, rating: 4.9, reviews: 567, price: '$$' },
        ].map((artist, i) => (
          <div key={i} className={`flex items-center gap-4 p-4 bg-white/5 rounded-xl border ${i === 0 ? 'border-purple-500/30' : 'border-white/10'}`}>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold text-white shrink-0">
              {artist.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm">{artist.name}</h4>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{artist.match}% match</span>
              </div>
              <p className="text-xs text-gray-400">{artist.specialty}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>⭐ {artist.rating}</span>
                <span>{artist.reviews} reviews</span>
                <span>{artist.price}</span>
              </div>
            </div>
            <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold rounded-lg transition-colors shrink-0">
              Book
            </button>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 5,
    title: 'Get Inked',
    subtitle: 'Walk in with confidence',
    icon: '✅',
    content: (
      <div className="bg-white/5 rounded-xl border border-green-500/20 p-6 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
          <span className="text-3xl">✅</span>
        </div>
        <h3 className="text-xl font-bold text-white">Booking Confirmed</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p><strong className="text-white">Artist:</strong> Alex Rivera</p>
          <p><strong className="text-white">Date:</strong> March 15, 2026 at 2:00 PM</p>
          <p><strong className="text-white">Design:</strong> Geometric Wolf — Variation A</p>
          <p><strong className="text-white">Placement:</strong> Left Forearm</p>
          <p><strong className="text-white">Estimated:</strong> 3-4 hours · $450-$600</p>
        </div>
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-gray-500">Artist has your finalized design file, placement reference, and size specifications. No surprises.</p>
        </div>
      </div>
    ),
  },
];

const METRICS = [
  { label: 'Designs Generated', value: '50K+' },
  { label: 'Verified Artists', value: '2,400+' },
  { label: 'Generation Time', value: '< 3s' },
  { label: 'Cost per Design', value: '$0.005' },
  { label: 'App Rating', value: '4.9★' },
];

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= STEPS.length - 1) {
          setAutoPlay(false);
          return prev;
        }
        return prev + 1;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  // Simulate generation animation on step 2
  useEffect(() => {
    if (currentStep === 1) {
      setGenerating(true);
      const timer = setTimeout(() => setGenerating(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  const step = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            TatT Demo
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setAutoPlay(!autoPlay); if (!autoPlay) setCurrentStep(0); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                autoPlay 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {autoPlay ? '⏸ Pause' : '▶ Watch Demo'}
            </button>
            <Link
              href="/generate"
              className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Try It Yourself →
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1 px-4 pb-3 max-w-4xl mx-auto">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setCurrentStep(i); setAutoPlay(false); }}
              className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                i <= currentStep ? 'bg-purple-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Step Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{step.icon}</span>
              <div>
                <p className="text-xs text-purple-400 font-bold uppercase tracking-wider">
                  Step {step.id} of {STEPS.length}
                </p>
                <h2 className="text-2xl font-bold">{step.title}</h2>
              </div>
            </div>
            <p className="text-gray-400">{step.subtitle}</p>
          </div>

          {/* Step Content */}
          <div className="relative">
            {generating && currentStep === 1 ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <p className="text-purple-400 font-medium animate-pulse">Generating 4 variations...</p>
                <p className="text-xs text-gray-500">SDXL model running on GPU</p>
              </div>
            ) : (
              step.content
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => { setCurrentStep(Math.max(0, currentStep - 1)); setAutoPlay(false); }}
              disabled={currentStep === 0}
              className="px-6 py-2.5 bg-white/10 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
            >
              ← Previous
            </button>
            <div className="flex gap-2">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentStep(i); setAutoPlay(false); }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === currentStep ? 'bg-purple-500 w-6' : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => { setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1)); setAutoPlay(false); }}
              disabled={currentStep === STEPS.length - 1}
              className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Investor Metrics Sidebar */}
        <div className="lg:w-56 shrink-0">
          <div className="sticky top-24 space-y-3">
            <h4 className="text-xs text-gray-500 font-bold uppercase tracking-wider">Key Metrics</h4>
            {METRICS.map((m) => (
              <div key={m.label} className="bg-white/5 rounded-xl border border-white/10 p-3">
                <p className="text-lg font-bold text-white">{m.value}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
            <div className="pt-3 border-t border-white/10">
              <p className="text-[10px] text-gray-600 leading-relaxed">
                $3.5B US tattoo market · 145M Americans with tattoos · 10% YoY growth in 18-35 demo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
