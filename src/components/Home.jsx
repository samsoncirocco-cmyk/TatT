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
    <div className="min-h-screen bg-[#0a0a0c] text-[#f8f9fa] selection:bg-blue-500/30">
      <div className="grain-overlay opacity-10" />

      {/* Hero Section - High Intent */}
      <section className="relative min-h-[95vh] flex flex-col justify-center px-6 overflow-hidden border-b border-white/5">
        <div className="max-w-6xl mx-auto w-full z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-8 rounded">
              The Permanence Crisis
            </div>
            <h1 className="text-6xl sm:text-8xl font-bold heading-editorial mb-8 tracking-tighter leading-[0.9]">
              The Tattoo Process is <br />
              <span className="text-white/40 italic">Broken.</span>
            </h1>
            <p className="text-lg text-gray-400 mb-10 max-w-lg leading-relaxed font-light">
              70% of first-timers spend 15+ months in "Permanent Panic."
              Gatekept shops, expensive consultation loops, and the fear of "what if it looks bad?" keep your vision locked in your head.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/generate"
                className="btn-premium px-10 py-5 text-lg"
              >
                Solve the Vision Gap
              </Link>
              <Link
                to="/journey"
                className="px-10 py-5 border border-white/10 hover:bg-white/5 transition-all text-sm uppercase tracking-widest font-bold flex items-center justify-center"
              >
                See the Transformation
              </Link>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="glass-card aspect-[4/5] p-2 rotate-3 overflow-hidden">
              <div className="w-full h-full bg-[#121216] relative flex items-center justify-center">
                <div className="absolute top-4 left-4 text-[10px] text-white/20 uppercase tracking-widest">Simulation v4.2</div>
                <div className="w-48 h-48 border border-white/5 rounded-full animate-ping opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent" />
                <span className="text-white/10 text-9xl font-bold italic select-none">INK</span>
              </div>
            </div>
            <div className="absolute -bottom-8 -left-8 glass-card p-6 -rotate-6 border-blue-500/30">
              <div className="text-3xl font-bold text-glow mb-1">90%</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Reduction in Anxiety</div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Grid */}
      <section className="py-32 px-6 border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl font-bold mb-4 tracking-tight uppercase italic text-white/60">Why you still haven't booked:</h2>
            <div className="h-px w-24 bg-red-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-white/10">
            <ProblemTile
              title="The 15-Month Lag"
              desc="Average time from 'Idea' to 'Ink' due to decision paralysis and lack of visualization."
              stat="15-20 Months"
            />
            <ProblemTile
              title="Artist Mismatch"
              desc="84% of regret stems from booking an artist whose style doesn't match the specific vision."
              stat="84% Error Rate"
            />
            <ProblemTile
              title="The 'Blind' Deposit"
              desc="Paying $200+ for a consultation without seeing if the design actually flows with your body."
              stat="Financial Risk"
            />
          </div>
        </div>
      </section>

      {/* The Solution - Transformation */}
      <section className="py-32 px-6 bg-[#0c0c10]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-12 heading-editorial">Confidence is <br /><span className="text-blue-500 italic">Engineered.</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 text-left">
            <div>
              <div className="text-xs text-red-500 font-bold uppercase tracking-widest mb-4">Old World Path</div>
              <ul className="space-y-6">
                <li className="flex items-start gap-4 text-gray-500">
                  <div className="w-6 h-6 rounded-full border border-red-500/30 flex items-center justify-center text-[10px]">✕</div>
                  <span>Guessing placement based on mirror selfies.</span>
                </li>
                <li className="flex items-start gap-4 text-gray-500">
                  <div className="w-6 h-6 rounded-full border border-red-500/30 flex items-center justify-center text-[10px]">✕</div>
                  <span>Endlessly scrolling Pinterest for "similar" ideas.</span>
                </li>
                <li className="flex items-start gap-4 text-gray-500">
                  <div className="w-6 h-6 rounded-full border border-red-500/30 flex items-center justify-center text-[10px]">✕</div>
                  <span>Awkward consultation calls with no visual shared langauge.</span>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-xs text-blue-500 font-bold uppercase tracking-widest mb-4">The TatTester Way</div>
              <ul className="space-y-6">
                <li className="flex items-start gap-4 text-white">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px]">✓</div>
                  <span>Photorealistic AR previews on YOUR skin.</span>
                </li>
                <li className="flex items-start gap-4 text-white">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px]">✓</div>
                  <span>AI Design Forge: 4 variations in 30 seconds.</span>
                </li>
                <li className="flex items-start gap-4 text-white">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px]">✓</div>
                  <span>One-click design sharing with matched specialists.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 border-t border-white/5 pt-20">
          <BigStat metric="3.5x" label="Confidence Boost" />
          <BigStat metric="90%" label="Time Saved" />
          <BigStat metric="12k+" label="Simulations Run" />
          <BigStat metric="0" label="Registration Required" />
        </div>
      </section>

      {/* Footer / CTA */}
      <section className="py-48 px-6 text-center border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full scale-50" />
        <div className="relative z-10">
          <h2 className="text-5xl md:text-7xl font-bold mb-12 tracking-tighter">Your Skin Deserves <br /><span className="italic opacity-50">Precision.</span></h2>
          <Link
            to="/generate"
            className="btn-premium px-12 py-6 text-xl"
          >
            Enter the Simulation
          </Link>
        </div>
      </section>
    </div>
  );
}

function ProblemTile({ title, desc, stat }) {
  return (
    <div className="p-10 border-white/10 border-collapse hover:bg-white/[0.02] transition-all">
      <div className="text-red-500 text-sm font-bold mb-6 tracking-tighter uppercase">{stat}</div>
      <h3 className="text-2xl font-bold mb-4 italic text-white/90">{title}</h3>
      <p className="text-gray-500 leading-relaxed font-light text-sm">{desc}</p>
    </div>
  );
}

function BigStat({ metric, label }) {
  return (
    <div className="text-center">
      <div className="text-5xl font-bold text-glow mb-2 tracking-tighter">{metric}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold">{label}</div>
    </div>
  );
}

