import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Journey() {
  const [activeStage, setActiveStage] = useState(null);

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24 border-t border-gray-100">
      {/* Hero Section */}
      <div className="bg-gray-50 py-20 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-ducks-green font-black text-[10px] uppercase tracking-[0.4em] mb-4">Optimization Logic // Path 0421</p>
          <h1 className="text-5xl font-bold tracking-tighter mb-6 leading-none text-gray-900">
            Collapsing the <br /><span className="text-ducks-green italic text-6xl">Vision Gap.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
            Traditional tattoo acquisition is broken. Seeker data shows a **15-20 month lag** between inspiration and skin. 
            TatTester patches the human intent loop, moving you from "What If" to "Verified" in 14 days.
          </p>
        </div>
      </div>

      {/* Market Research Stats */}
      <div className="py-24 px-6 border-b border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <StatCard number="4,200+" label="Regret Patterns Analyzed" highlight="bad" />
          <StatCard number="15-20" unit="Months" label="Average Consideration Lag" highlight="bad" />
          <StatCard number="25-30%" label="Anxiety-Driven Cancellations" highlight="bad" />
        </div>
      </div>

      {/* The Transformation */}
      <div className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 italic tracking-tight text-center">The Simulation Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
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
      </div>

      {/* Comparison Timeline */}
      <div className="py-24 px-6 bg-ducks-green text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-ducks-yellow/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="text-3xl font-bold mb-16 italic tracking-tight text-center">The Journey Delta</h2>
            
            <div className="space-y-12">
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
                title="Skinside Deployment"
                description="Book with 3.5x higher confidence. The lag is deleted."
                duration="Day 14"
              />
            </div>
          </div>
      </div>

      {/* Final CTA */}
      <div className="py-32 text-center bg-white">
        <h2 className="text-4xl font-bold mb-8 tracking-tighter">Initialize Your Registry Patch.</h2>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link to="/generate" className="btn-cocreate text-lg px-12 py-4">Execute Simulation</Link>
          <Link to="/artists" className="btn-cocreate-yellow text-lg px-12 py-4 border-2 border-ducks-green">Browse Validated Artists</Link>
        </div>
        <Link to="/" className="block mt-12 text-[10px] text-gray-400 font-black uppercase tracking-[0.4em] hover:text-ducks-green transition-colors">Return to Hub</Link>
      </div>

      <footer className="py-12 bg-gray-50 border-t border-gray-100 mt-24">
         <div className="text-center text-gray-300 text-[8px] uppercase tracking-[0.5em] font-black">
            TatTester // Journey Map // Life.exe Environment // 1.0.4
         </div>
      </footer>
    </div>
  );
}

function StatCard({ number, unit, label, highlight }) {
  return (
    <div className="p-8 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className={'text-4xl font-bold mb-2 tracking-tighter ' + (highlight === 'bad' ? 'text-red-500' : 'text-ducks-green')}>
        {number}{unit && <span className="text-xl ml-1 font-black">{unit}</span>}
      </div>
      <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{label}</div>
    </div>
  );
}

function ImpactCard({ metric, label, description }) {
  return (
    <div className="p-10 border-2 border-gray-100 rounded-3xl hover:border-ducks-green transition-colors group">
      <div className="text-6xl font-black text-ducks-green mb-4 tracking-tighter group-hover:scale-110 transition-transform origin-left">{metric}</div>
      <div className="text-lg font-bold mb-2 text-gray-900">{label}</div>
      <p className="text-sm text-gray-500 leading-relaxed font-medium">{description}</p>
    </div>
  );
}

function JourneyStep({ number, title, description, duration }) {
  return (
    <div className="flex gap-8 group">
      <div className="flex-shrink-0 w-12 h-12 bg-ducks-yellow text-ducks-green rounded-full flex items-center justify-center font-black text-xs shadow-lg shadow-yellow-900/20">
        {number}
      </div>
      <div className="border-b border-white/10 pb-8 flex-1 group-last:border-0">
        <div className="flex justify-between items-start mb-2">
           <h3 className="text-xl font-bold tracking-tight italic">{title}</h3>
           <span className="text-[9px] bg-white/10 px-3 py-1 rounded-full uppercase font-black tracking-widest">{duration}</span>
        </div>
        <p className="text-white/60 text-sm font-medium leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
