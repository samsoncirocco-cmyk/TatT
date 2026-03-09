'use client';

import Link from 'next/link';
import { Smartphone, ArrowLeft, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VisualizePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden bg-background">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-ducks-yellow/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-ducks-green/15 rounded-full blur-[100px] mix-blend-screen animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full text-center space-y-8 z-10"
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-ducks-yellow/10 border border-ducks-yellow/20 flex items-center justify-center">
            <Smartphone size={36} className="text-ducks-yellow" />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-ducks-yellow/30 text-ducks-yellow text-xs font-mono tracking-widest uppercase backdrop-blur-md">
          Coming Soon
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter text-white">
            AR Mirror
          </h1>
          <p className="text-xl text-gray-400 font-light max-w-xl mx-auto">
            See your design on your body before committing — real-time AR placement with depth-aware skin tracking.
          </p>
        </div>

        {/* Feature preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            { label: 'Live skin preview', desc: 'Camera-based AR overlay with tone matching' },
            { label: 'Depth-aware', desc: 'Wraps naturally around contours and curves' },
            { label: 'Any body part', desc: 'Arm, neck, back, ribs — full body canvas' },
          ].map((f) => (
            <div key={f.label} className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-xs font-mono text-ducks-yellow uppercase tracking-widest mb-1">{f.label}</p>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/generate"
            className="flex items-center gap-2 px-6 py-3 bg-ducks-green hover:bg-ducks-green/90 text-white rounded-xl font-medium transition-all"
          >
            <Sparkles size={18} />
            Try AI Design Forge
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl font-medium transition-all backdrop-blur-md"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
