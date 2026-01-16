'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Smartphone } from 'lucide-react';
import Link from 'next/link';

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } },
};

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden bg-background">

      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-ducks-green/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-ducks-yellow/10 rounded-full blur-[100px] mix-blend-screen animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-4xl w-full text-center space-y-12 z-10"
      >

        {/* Hero Text */}
        <div className="space-y-4">
          <motion.div variants={item} className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-ducks-green/30 text-ducks-green text-xs font-mono tracking-widest uppercase mb-4 backdrop-blur-md">
            System v2.0 // Life.exe
          </motion.div>

          <motion.h1 variants={item} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-black leading-[0.95] tracking-tighter text-white">
            TACTILE<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-400">
              SCAR TISSUE
            </span>
          </motion.h1>

          <motion.p variants={item} className="text-xl md:text-2xl text-gray-400 font-light max-w-2xl mx-auto">
            The next generation of <span className="text-ducks-yellow font-medium">bio-resonant</span> body art.
            Generate, visualize, and connect with the future of ink.
          </motion.p>
        </div>

        {/* Primary CTA */}
        <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.push('/generate')}
            className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-ducks-green hover:bg-ducks-green/90 text-white rounded-xl font-medium transition-all"
          >
            <Sparkles size={20} />
            Enter the Forge
          </button>
          <button
            onClick={() => router.push('/journey')}
            className="w-full sm:w-auto min-w-[200px] px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl font-medium transition-all backdrop-blur-md"
          >
            Philosophy
          </button>
        </motion.div>

        {/* Feature Grid */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12">
          {/* Card 1 */}
          <Link href="/generate" className="block group">
            <div className="h-full p-6 text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl transition-all backdrop-blur-md">
              <div className="w-12 h-12 rounded-full bg-ducks-green/20 flex items-center justify-center text-ducks-green mb-4 group-hover:scale-110 transition-transform">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Forge</h3>
              <p className="text-sm text-gray-400">Generate unique designs using semantic style definitions and bio-feedback.</p>
            </div>
          </Link>

          {/* Card 2 */}
          <Link href="/visualize" className="block group">
            <div className="h-full p-6 text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl transition-all backdrop-blur-md">
              <div className="w-12 h-12 rounded-full bg-ducks-yellow/10 flex items-center justify-center text-ducks-yellow mb-4 group-hover:scale-110 transition-transform">
                <Smartphone size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AR Mirror</h3>
              <p className="text-sm text-gray-400"> visualize tattoos on your skin in real-time with depth-aware tracking.</p>
            </div>
          </Link>

          {/* Card 3 */}
          <Link href="/artists" className="block group">
            <div className="h-full p-6 text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl transition-all backdrop-blur-md">
              <div className="w-12 h-12 rounded-full bg-ducks-yellow/10 flex items-center justify-center text-ducks-yellow mb-4 group-hover:scale-110 transition-transform">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Artist Match</h3>
              <p className="text-sm text-gray-400">Connect with artists who align with your aesthetic vision.</p>
            </div>
          </Link>
        </motion.div>

      </motion.div>
    </div>
  );
}
