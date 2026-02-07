import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Smartphone } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';

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

function Home() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">

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
          <motion.div variants={item} className="inline-block px-4 py-1.5 rounded-full glass-panel border-ducks-green/30 text-ducks-green text-xs font-mono tracking-widest uppercase mb-4">
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
          <Button
            size="lg"
            onClick={() => router.push('/generate')}
            className="w-full sm:w-auto min-w-[200px]"
            icon={Sparkles}
          >
            Enter the Forge
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push('/journey')}
            className="w-full sm:w-auto min-w-[200px]"
          >
            Philosophy
          </Button>
        </motion.div>

        {/* Feature Grid */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12">
          <Card hover className="text-left group cursor-pointer" onClick={() => router.push('/generate')}>
            <div className="w-12 h-12 rounded-full bg-ducks-green/20 flex items-center justify-center text-ducks-green mb-4 group-hover:scale-110 transition-transform">
              <Sparkles size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI Forge</h3>
            <p className="text-sm text-gray-400">Generate unique designs using semantic style definitions and bio-feedback.</p>
          </Card>

          <Card hover className="text-left group cursor-pointer" onClick={() => router.push('/visualize')}>
            <div className="w-12 h-12 rounded-full bg-ducks-yellow/10 flex items-center justify-center text-ducks-yellow mb-4 group-hover:scale-110 transition-transform">
              <Smartphone size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AR Mirror</h3>
            <p className="text-sm text-gray-400"> visualize tattoos on your skin in real-time with depth-aware tracking.</p>
          </Card>

          <Card hover className="text-left group cursor-pointer" onClick={() => router.push('/artists')}>
            <div className="w-12 h-12 rounded-full bg-ducks-yellow/10 flex items-center justify-center text-ducks-yellow mb-4 group-hover:scale-110 transition-transform">
              <Zap size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Artist Match</h3>
            <p className="text-sm text-gray-400">Connect with artists who align with your aesthetic vision.</p>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}

export default Home;
