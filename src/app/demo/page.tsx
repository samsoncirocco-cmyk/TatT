'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ChevronRight, ChevronLeft, Zap, Eye,
  Users, CheckCircle, Star, ArrowRight, Play, Wand2
} from 'lucide-react';

// ─── Mock demo data ────────────────────────────────────────────────────────
const DEMO_CONCEPTS = [
  {
    id: 'cyberpunk-dragon',
    title: 'Cyberpunk Dragon',
    tags: ['Dark', 'Bold', 'Neon'],
    desc: 'A circuit-wired dragon with neon accents',
    emoji: '🐉',
    color: 'from-purple-600 to-cyan-500',
  },
  {
    id: 'fine-line-botanicals',
    title: 'Fine-line Botanicals',
    tags: ['Delicate', 'Nature', 'Minimal'],
    desc: 'Airy ferns and peonies with single-needle linework',
    emoji: '🌿',
    color: 'from-emerald-600 to-teal-400',
  },
  {
    id: 'geometric-wolf',
    title: 'Geometric Wolf',
    tags: ['Sacred', 'Geometric', 'Powerful'],
    desc: 'Sacred geometry meets Northern spirit animal',
    emoji: '🐺',
    color: 'from-amber-600 to-yellow-400',
  },
];

const DEMO_ENHANCEMENT = {
  original: 'A wolf made of triangles',
  enhanced:
    'A majestic wolf composed of interlocking golden-ratio triangles — sacred geometry radiating outward from a fierce profile, negative space creating depth, mandala-inspired border, blackwork with selective white highlights, designed for upper arm placement with 6-inch diameter',
  improvements: [
    'Added golden-ratio geometry for mathematical precision',
    'Specified sacred geometry motif for cultural resonance',
    'Optimized placement (upper arm, 6-inch diameter)',
    'Added blackwork + white highlight technique guidance',
    'Incorporated negative space for depth and contrast',
  ],
};

const DEMO_ARTISTS = [
  {
    name: 'Mia Chen',
    specialty: 'Geometric / Blackwork',
    location: 'Portland, OR',
    match: 98,
    available: true,
    emoji: '⚫',
    style: 'Precision lines, sacred geometry, 12 yrs experience',
  },
  {
    name: 'Diego Ramos',
    specialty: 'Neo-Traditional',
    location: 'Phoenix, AZ',
    match: 87,
    available: true,
    emoji: '🎨',
    style: 'Bold color, fine shading, portfolio 400+ pieces',
  },
  {
    name: 'Aiko Tanaka',
    specialty: 'Fine-Line / Minimal',
    location: 'Seattle, WA',
    match: 82,
    available: false,
    emoji: '✏️',
    style: 'Single-needle specialist, botanical & portrait',
  },
];

const STEPS = [
  { id: 0, label: 'Choose Concept', icon: Sparkles },
  { id: 1, label: 'AI Enhancement', icon: Wand2 },
  { id: 2, label: 'Visualize', icon: Eye },
  { id: 3, label: 'Find Artist', icon: Users },
];

// ─── Animated prompt typewriter ───────────────────────────────────────────
function TypewriterText({ text, speed = 18 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse">|</span>}
    </span>
  );
}

// ─── SVG tattoo preview (geometric wolf) ──────────────────────────────────
function TattooPreview({ concept }: { concept: (typeof DEMO_CONCEPTS)[0] }) {
  return (
    <div className="relative w-full aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black/40">
      <div className={`absolute inset-0 bg-gradient-to-br ${concept.color} opacity-10`} />
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 w-full h-full p-6 opacity-90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Geometric wolf SVG — decorative stand-in */}
        <polygon points="100,20 140,80 100,60 60,80" stroke="white" strokeWidth="1.5" fill="none" opacity="0.8" />
        <polygon points="100,60 140,80 120,140 100,120 80,140 60,80" stroke="white" strokeWidth="1.5" fill="none" opacity="0.8" />
        <polygon points="100,120 120,140 100,180 80,140" stroke="white" strokeWidth="1" fill="none" opacity="0.6" />
        {/* Eyes */}
        <circle cx="85" cy="72" r="4" stroke="#FEE123" strokeWidth="1.5" fill="none" />
        <circle cx="115" cy="72" r="4" stroke="#FEE123" strokeWidth="1.5" fill="none" />
        {/* Sacred geometry ring */}
        <circle cx="100" cy="100" r="78" stroke="white" strokeWidth="0.5" strokeDasharray="4 6" opacity="0.3" />
        <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="0.3" strokeDasharray="2 8" opacity="0.2" />
        {/* Triangle grid */}
        <line x1="60" y1="80" x2="140" y2="80" stroke="white" strokeWidth="0.5" opacity="0.4" />
        <line x1="80" y1="140" x2="120" y2="140" stroke="white" strokeWidth="0.5" opacity="0.4" />
        <line x1="100" y1="20" x2="100" y2="180" stroke="white" strokeWidth="0.3" opacity="0.2" />
      </svg>
      {/* Skin overlay simulation */}
      <div className="absolute bottom-3 right-3 text-xs text-white/40 font-mono">AR preview</div>
    </div>
  );
}

// ─── Steps ─────────────────────────────────────────────────────────────────
function StepConceptPicker({
  onSelect,
}: {
  onSelect: (c: (typeof DEMO_CONCEPTS)[0]) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-white/60 text-sm font-mono uppercase tracking-widest">Step 1 of 4</p>
        <h2 className="text-3xl font-black text-white">What do you want?</h2>
        <p className="text-white/50 text-sm">Pick a concept. TatT's AI takes it from here.</p>
      </div>

      <div className="grid gap-3">
        {DEMO_CONCEPTS.map((c) => (
          <motion.button
            key={c.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setSelected(c.id);
              setTimeout(() => onSelect(c), 400);
            }}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
              selected === c.id
                ? 'border-ducks-green bg-ducks-green/20 shadow-lg'
                : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${c.color} flex-shrink-0`}
            >
              {c.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm">{c.title}</div>
              <div className="text-white/50 text-xs mt-0.5 truncate">{c.desc}</div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {c.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-mono"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            {selected === c.id && <CheckCircle size={20} className="text-ducks-green flex-shrink-0" />}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function StepEnhancement({ concept, onNext }: { concept: (typeof DEMO_CONCEPTS)[0]; onNext: () => void }) {
  const [phase, setPhase] = useState<'processing' | 'done'>('processing');

  useEffect(() => {
    const t = setTimeout(() => setPhase('done'), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-white/60 text-sm font-mono uppercase tracking-widest">Step 2 of 4</p>
        <h2 className="text-3xl font-black text-white">AI Council at Work</h2>
        <p className="text-white/50 text-sm">3 specialized AI agents enhance your prompt.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        {/* Original */}
        <div>
          <div className="text-xs font-mono text-white/40 mb-1">YOUR IDEA</div>
          <div className="text-white/70 text-sm italic">&ldquo;{DEMO_ENHANCEMENT.original}&rdquo;</div>
        </div>

        {/* Council status */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          {[
            { role: 'Creative Director', model: 'Claude 3.5', delay: 0 },
            { role: 'Technical Expert', model: 'GPT-4 Turbo', delay: 600 },
            { role: 'Style Specialist', model: 'Gemini Pro', delay: 1200 },
          ].map(({ role, model, delay }) => (
            <CouncilMember key={role} role={role} model={model} delay={delay} phase={phase} />
          ))}
        </div>

        {/* Enhanced output */}
        <AnimatePresence>
          {phase === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-2 border-t border-ducks-green/30"
            >
              <div className="text-xs font-mono text-ducks-green mb-2">✦ ENHANCED PROMPT</div>
              <div className="text-white text-sm leading-relaxed">
                <TypewriterText text={DEMO_ENHANCEMENT.enhanced} speed={14} />
              </div>
              <div className="mt-3 space-y-1">
                {DEMO_ENHANCEMENT.improvements.map((imp, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 + 0.8 }}
                    className="flex items-start gap-2 text-xs text-white/50"
                  >
                    <span className="text-ducks-yellow mt-0.5 flex-shrink-0">+</span>
                    {imp}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === 'done' && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onNext}
          className="w-full py-3 rounded-2xl bg-ducks-green text-white font-bold flex items-center justify-center gap-2"
        >
          See it on skin <ChevronRight size={16} />
        </motion.button>
      )}
    </div>
  );
}

function CouncilMember({
  role,
  model,
  delay,
  phase,
}: {
  role: string;
  model: string;
  delay: number;
  phase: 'processing' | 'done';
}) {
  const [status, setStatus] = useState<'waiting' | 'working' | 'done'>('waiting');

  useEffect(() => {
    if (phase === 'processing') {
      const t1 = setTimeout(() => setStatus('working'), delay);
      const t2 = setTimeout(() => setStatus('done'), delay + 700);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (phase === 'done') setStatus('done');
  }, [phase, delay]);

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500 ${
          status === 'waiting' ? 'bg-white/20' : status === 'working' ? 'bg-ducks-yellow animate-pulse' : 'bg-ducks-green'
        }`}
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-white/70 font-medium">{role}</span>
        <span className="text-xs text-white/30 ml-2 font-mono">{model}</span>
      </div>
      <div className="text-xs font-mono text-white/30">
        {status === 'waiting' && 'queued'}
        {status === 'working' && <span className="text-ducks-yellow animate-pulse">analyzing...</span>}
        {status === 'done' && <span className="text-ducks-green">✓ done</span>}
      </div>
    </div>
  );
}

function StepVisualize({ concept, onNext }: { concept: (typeof DEMO_CONCEPTS)[0]; onNext: () => void }) {
  const [view, setView] = useState<'canvas' | 'ar'>('canvas');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-white/60 text-sm font-mono uppercase tracking-widest">Step 3 of 4</p>
        <h2 className="text-3xl font-black text-white">See It On Skin</h2>
        <p className="text-white/50 text-sm">AR-placed preview. No guesswork.</p>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
        {(['canvas', 'ar'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              view === v ? 'bg-ducks-green text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            {v === 'canvas' ? '🖼 Canvas' : '📱 AR Skin'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === 'canvas' ? (
          <motion.div key="canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TattooPreview concept={concept} />
            <p className="text-center text-white/40 text-xs mt-3">
              AI-generated design preview — adjust placement, scale & rotation in the Forge
            </p>
          </motion.div>
        ) : (
          <motion.div key="ar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="relative w-full max-w-xs mx-auto aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-amber-900/30 to-amber-800/20">
              {/* Simulated skin/arm background */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-100/10 via-amber-200/5 to-amber-100/10" />
              {/* Arm outline */}
              <svg viewBox="0 0 150 200" className="absolute inset-0 w-full h-full opacity-20" fill="none">
                <ellipse cx="75" cy="100" rx="55" ry="90" stroke="white" strokeWidth="1" />
              </svg>
              {/* Tattoo overlaid on arm */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 opacity-85">
                  <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
                    <polygon points="100,20 140,80 100,60 60,80" stroke="white" strokeWidth="2" fill="none" />
                    <polygon points="100,60 140,80 120,140 100,120 80,140 60,80" stroke="white" strokeWidth="2" fill="none" />
                    <polygon points="100,120 120,140 100,180 80,140" stroke="white" strokeWidth="1.5" fill="none" />
                    <circle cx="85" cy="72" r="4" stroke="#FEE123" strokeWidth="2" fill="none" />
                    <circle cx="115" cy="72" r="4" stroke="#FEE123" strokeWidth="2" fill="none" />
                    <circle cx="100" cy="100" r="78" stroke="white" strokeWidth="0.5" strokeDasharray="4 6" opacity="0.4" />
                  </svg>
                </div>
              </div>
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-ducks-green/80 text-white text-[10px] font-mono">
                AR Live
              </div>
              <div className="absolute bottom-3 left-3 text-[10px] text-white/40 font-mono">
                Upper arm · 6in · 0° rotation
              </div>
            </div>
            <p className="text-center text-white/40 text-xs mt-3">
              Point your camera at your skin — TatT projects the design in real time
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onNext}
        className="w-full py-3 rounded-2xl bg-ducks-green text-white font-bold flex items-center justify-center gap-2"
      >
        Match me with an artist <ChevronRight size={16} />
      </button>
    </div>
  );
}

function StepArtistMatch({ concept }: { concept: (typeof DEMO_CONCEPTS)[0] }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-white/60 text-sm font-mono uppercase tracking-widest">Step 4 of 4</p>
        <h2 className="text-3xl font-black text-white">Your Artist Matches</h2>
        <p className="text-white/50 text-sm">
          Ranked by style compatibility, availability & proximity.
        </p>
      </div>

      <div className="space-y-3">
        {DEMO_ARTISTS.map((a, i) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
          >
            <button
              onClick={() => setSelected(a.name)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                selected === a.name
                  ? 'border-ducks-green bg-ducks-green/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              } ${!a.available ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                  {a.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{a.name}</span>
                    {!a.available && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">
                        Waitlist
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ducks-yellow font-medium mt-0.5">{a.specialty}</div>
                  <div className="text-xs text-white/40 mt-0.5">{a.location}</div>
                  <div className="text-xs text-white/50 mt-1">{a.style}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div
                    className={`text-lg font-black ${
                      a.match >= 95 ? 'text-ducks-green' : a.match >= 85 ? 'text-ducks-yellow' : 'text-white/60'
                    }`}
                  >
                    {a.match}%
                  </div>
                  <div className="text-[10px] text-white/30">match</div>
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <div className="space-y-3 pt-2">
        {selected ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="p-4 rounded-2xl bg-ducks-green/20 border border-ducks-green/40 text-center space-y-2">
              <CheckCircle size={24} className="text-ducks-green mx-auto" />
              <div className="text-white font-bold text-sm">
                Booking request sent to {selected}!
              </div>
              <div className="text-white/50 text-xs">
                They&apos;ll receive your enhanced design + brief automatically.
              </div>
            </div>
          </motion.div>
        ) : null}

        <Link
          href="/generate"
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-ducks-green to-teal-600 text-white font-bold flex items-center justify-center gap-2 text-sm"
        >
          <Sparkles size={16} />
          Try the real Forge — build your design
          <ArrowRight size={16} />
        </Link>
        <Link
          href="/pitch"
          className="w-full py-3 rounded-2xl border border-white/10 text-white/60 font-medium flex items-center justify-center gap-2 text-sm hover:bg-white/5"
        >
          View investor deck
        </Link>
      </div>
    </div>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 w-full">
      {STEPS.map((s) => (
        <div
          key={s.id}
          className={`h-1 flex-1 rounded-full transition-all duration-500 ${
            s.id <= step ? 'bg-ducks-green' : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function DemoPage() {
  const [step, setStep] = useState(0);
  const [concept, setConcept] = useState<(typeof DEMO_CONCEPTS)[0] | null>(null);

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <div className="text-lg font-black text-white">TatT</div>
          <div className="text-xs text-white/40 font-mono">Interactive Demo</div>
        </div>
        <div className="flex items-center gap-2">
          <Star size={12} className="text-ducks-yellow fill-ducks-yellow" />
          <span className="text-xs text-white/50 font-mono">YC Demo Day 2026</span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 pb-4 space-y-3">
        <ProgressBar step={step} />
        <div className="flex justify-between">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-1 text-[10px] font-mono transition-colors ${
                  s.id <= step ? 'text-ducks-green' : 'text-white/20'
                }`}
              >
                <Icon size={10} />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-5 pb-32 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StepConceptPicker
                onSelect={(c) => {
                  setConcept(c);
                  setStep(1);
                }}
              />
            </motion.div>
          )}
          {step === 1 && concept && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StepEnhancement concept={concept} onNext={() => setStep(2)} />
            </motion.div>
          )}
          {step === 2 && concept && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StepVisualize concept={concept} onNext={() => setStep(3)} />
            </motion.div>
          )}
          {step === 3 && concept && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StepArtistMatch concept={concept} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Back nav */}
      {step > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setStep((s) => s - 1)}
          className="fixed bottom-28 left-5 flex items-center gap-1 text-white/40 text-xs hover:text-white/70 transition-colors"
        >
          <ChevronLeft size={14} /> Back
        </motion.button>
      )}
    </div>
  );
}
