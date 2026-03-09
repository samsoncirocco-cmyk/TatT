import Link from 'next/link';
import { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowRight, Clock, ShieldAlert, TrendingUp } from 'lucide-react';

export default function Journey() {
  const [activeStage, setActiveStage] = useState(null);

  return (
    <div className="min-h-screen pt-24 pb-32 px-6">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center mb-24">
        <p className="text-ducks-green font-mono font-bold text-[10px] uppercase tracking-[0.4em] mb-6">Optimization Logic // Path 0421</p>
        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tighter mb-8 leading-none text-white">
          Collapsing the <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-ducks-green to-ducks-yellow">Vision Gap.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
          Traditional tattoo acquisition is broken. Seeker data shows a <span className="text-white font-bold">15-20 month lag</span> between inspiration and skin.
          TatTester patches the human intent loop, moving you from "What If" to "Verified" in 14 days.
        </p>
      </div>

      {/* Market Research Stats */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
        <StatCard
          icon={ShieldAlert}
          number="4,200+"
          label="Regret Patterns Analyzed"
          highlight="bad"
        />
        <StatCard
          icon={Clock}
          number="15-20"
          unit="Months"
          label="Average Consideration Lag"
          highlight="bad"
        />
        <StatCard
          icon={TrendingUp}
          number="30%"
          label="Anxiety-Driven Cancellations"
          highlight="bad"
        />
      </div>

      {/* The Transformation */}
      <div className="max-w-4xl mx-auto mb-32">
        <h2 className="text-3xl font-display font-bold mb-12 italic tracking-tight text-center text-white">The Simulation Impact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ImpactCard
            metric="3.5x"
            label="Higher Booking Confidence"
            description="Users who execute our AR simulation are 3.5x more likely to sit for their first needle drop."
          />
          <ImpactCard
            metric="90%"
            label="Lag Reduction"
            description="We collapse 20 months of overthinking into 2 weeks of precision-led planning."
          />
        </div>
      </div>

      {/* Comparison Timeline */}
      <div className="relative py-24 border-y border-white/5 bg-black/20 overflow-hidden rounded-[3rem] GLASS-PANEL-CONTAINER">
        {/* Background Ambience */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-ducks-green/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10 px-6">
          <h2 className="text-3xl font-display font-bold mb-16 italic tracking-tight text-center text-white">The Journey Delta</h2>

          <div className="space-y-12 border-l border-white/10 pl-8 ml-4 md:ml-0">
            <JourneyStep
              number="1"
              title="Awareness & Pattern Discovery"
              description="Discover your visual path through the Samson-Verified artist feed."
              duration="Day 1"
            />
            <JourneyStep
              number="2"
              title="Simulation Execution (Forge.exe)"
              description="AI-generated designs based on your unique biometric intent."
              duration="Day 2-3"
            />
            <JourneyStep
              number="3"
              title="Vision Gap Calibration (AR)"
              description="Body-mapping previews with ±2cm accuracy on any skin surface."
              duration="Day 3-7"
            />
            <JourneyStep
              number="4"
              title="Artist Lock-In"
              description="Connect with verified artists who speak your design language fluently."
              duration="Day 10"
            />
            <JourneyStep
              number="5"
              isLast
              title="Skinside Deployment"
              description="Book with 3.5x higher confidence. The lag is deleted."
              duration="Day 14"
            />
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-32 text-center">
        <h2 className="text-4xl font-display font-bold mb-8 tracking-tighter text-white">Initialize Your Registry Patch.</h2>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Button onClick={() => window.location.href = '/generate'} size="lg">
            Execute Simulation
          </Button>
          <Button onClick={() => window.location.href = '/artists'} variant="secondary" size="lg">
            Browse Validated Artists
          </Button>
        </div>
        <Link href="/" className="block mt-12 text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] hover:text-ducks-green transition-colors">Return to Hub</Link>
      </div>

      <footer className="py-12 border-t border-white/5 mt-12">
        <div className="text-center text-gray-600 text-[8px] uppercase tracking-[0.5em] font-bold">
          TatTester // Journey Map // Life.exe Environment // 1.0.4
        </div>
      </footer>
    </div>
  );
}

function StatCard({ number, unit, label, highlight, icon: Icon }) {
  return (
    <div className="p-8 glass-panel border border-white/10 rounded-2xl flex flex-col items-center justify-center hover:border-red-500/30 transition-colors group">
      <Icon className="w-8 h-8 text-red-500/50 mb-4 group-hover:text-red-500 transition-colors" />
      <div className={'text-5xl font-display font-bold mb-2 tracking-tighter text-white'}>
        {number}{unit && <span className="text-2xl ml-1 font-bold text-gray-400">{unit}</span>}
      </div>
      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</div>
    </div>
  );
}

function ImpactCard({ metric, label, description }) {
  return (
    <div className="p-10 glass-panel border border-ducks-green/20 rounded-3xl hover:border-ducks-green/50 hover:bg-ducks-green/5 transition-all group">
      <div className="text-7xl font-display font-black text-ducks-green mb-4 tracking-tighter group-hover:scale-105 transition-transform origin-left">{metric}</div>
      <div className="text-xl font-bold mb-3 text-white">{label}</div>
      <p className="text-sm text-gray-400 leading-relaxed font-light">{description}</p>
    </div>
  );
}

function JourneyStep({ number, title, description, duration, isLast }) {
  return (
    <div className="relative group">
      <div className={`absolute -left-[45px] top-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-glow transition-all ${isLast ? 'bg-ducks-green text-white scale-125' : 'bg-black border border-white/20 text-gray-400 group-hover:border-ducks-green group-hover:text-ducks-green'}`}>
        {number}
      </div>
      <div className="pb-8 group-last:pb-0">
        <div className="flex justify-between items-start mb-2">
          <h3 className={`text-xl font-bold tracking-tight italic ${isLast ? 'text-ducks-green' : 'text-white'}`}>{title}</h3>
          <span className="text-[9px] bg-white/5 border border-white/10 px-3 py-1 rounded-full uppercase font-bold tracking-widest text-gray-400">{duration}</span>
        </div>
        <p className="text-gray-400 text-sm font-light leading-relaxed max-w-xl">{description}</p>
      </div>
    </div>
  );
}
