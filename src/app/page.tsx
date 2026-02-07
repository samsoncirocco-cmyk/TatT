'use client';

import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Smartphone,
  Star,
  ArrowRight,
  Brain,
  Eye,
  Users,
  ChevronDown,
  Shield,
  Palette,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

// ─── Animation variants ───────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 40, damping: 12 } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 60 } },
};

// ─── Data ─────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Curated Designs',
    desc: 'Semantic neural generation understands your aesthetic vision — not just keywords.',
    accent: 'from-yellow-400/20 to-yellow-600/5',
    iconColor: 'text-yellow-400',
  },
  {
    icon: Eye,
    title: 'AR Body Preview',
    desc: 'See your tattoo on your skin in real-time with depth-aware AR tracking.',
    accent: 'from-emerald-400/20 to-emerald-600/5',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Users,
    title: 'Artist Matching',
    desc: 'Connect with verified artists whose style aligns perfectly with your design.',
    accent: 'from-yellow-400/20 to-yellow-600/5',
    iconColor: 'text-yellow-400',
  },
  {
    icon: Zap,
    title: 'Instant Generation',
    desc: 'From concept to custom design in seconds. Multiple styles, unlimited revisions.',
    accent: 'from-emerald-400/20 to-emerald-600/5',
    iconColor: 'text-emerald-400',
  },
];

const STATS = [
  { value: '50K+', label: 'Designs Generated' },
  { value: '2,400+', label: 'Verified Artists' },
  { value: '4.9★', label: 'App Store Rating' },
  { value: '<3s', label: 'Generation Time' },
];

const TESTIMONIALS = [
  {
    name: 'Maya R.',
    role: 'First Tattoo',
    text: 'I was terrified of getting the wrong tattoo. TatT let me see exactly what it would look like on my arm before I committed. Game changer.',
    avatar: '🧑‍🎨',
    rating: 5,
  },
  {
    name: 'Jake T.',
    role: 'Tattoo Collector',
    text: 'The AI understood what I meant by "geometric nature fusion" better than I could explain it. 12 designs in 30 seconds. Insane.',
    avatar: '🎯',
    rating: 5,
  },
  {
    name: 'Sarah L.',
    role: 'Tattoo Artist',
    text: 'My clients come in with TatT designs now. It saves hours of consultation and they\'re already excited about the concept. Win-win.',
    avatar: '✨',
    rating: 5,
  },
];

const STEPS = [
  { num: '01', title: 'Describe Your Vision', desc: 'Tell the AI what you want — style, mood, meaning. It understands nuance.', icon: Sparkles },
  { num: '02', title: 'Preview in AR', desc: 'See the design on your body using your phone camera. Adjust size & placement.', icon: Smartphone },
  { num: '03', title: 'Match with Artists', desc: 'Get connected with verified artists who specialize in your chosen style.', icon: Users },
  { num: '04', title: 'Get Inked', desc: 'Walk into your appointment with design finalized. No surprises, just great ink.', icon: CheckCircle2 },
];

// ─── Component ────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <div className="relative min-h-screen bg-[#050505] overflow-x-hidden">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* ──── NAVIGATION ──── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FEE123] to-[#154733] flex items-center justify-center">
              <span className="text-black font-bold text-sm">T</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">TatT</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works</Link>
            <Link href="#testimonials" className="text-sm text-gray-400 hover:text-white transition-colors">Reviews</Link>
            <Link href="/artists" className="text-sm text-gray-400 hover:text-white transition-colors">Artists</Link>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/generate')}
              className="px-4 py-2 bg-[#FEE123] hover:bg-[#FEE123]/90 text-black rounded-lg font-semibold text-sm transition-all hover:shadow-lg hover:shadow-[#FEE123]/20"
            >
              Start Designing
            </button>
          </div>
        </div>
      </nav>

      {/* ──── HERO SECTION ──── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16"
      >
        {/* Background ambience */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-[#154733]/30 rounded-full blur-[150px]" />
          <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-[#FEE123]/8 rounded-full blur-[120px]" />
          <div className="absolute top-[60%] left-[50%] w-[300px] h-[300px] bg-[#154733]/20 rounded-full blur-[100px]" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(254,225,35,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(254,225,35,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10 max-w-5xl w-full text-center space-y-8"
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FEE123]/20 bg-[#FEE123]/5 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-[#FEE123] animate-pulse" />
            <span className="text-[#FEE123] text-xs font-medium tracking-widest uppercase">AI-Powered Tattoo Studio</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[0.95] tracking-tight text-white">
            Think it.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FEE123] via-[#FEE123] to-[#154733] gold-text-glow">
              Ink it.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p variants={fadeUp} className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Generate custom tattoo designs with AI.{' '}
            <span className="text-white font-medium">Preview on your body in AR.</span>{' '}
            Connect with verified artists near you.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => router.push('/generate')}
              className="group w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 bg-[#FEE123] hover:bg-[#FEE123]/90 text-black rounded-xl font-semibold text-base transition-all hover:shadow-xl hover:shadow-[#FEE123]/20 hover:-translate-y-0.5"
            >
              <Sparkles size={20} />
              Start Designing — Free
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => router.push('/journey')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-xl font-medium text-base transition-all backdrop-blur-sm"
            >
              See How It Works
            </button>
          </motion.div>

          {/* Social proof stats */}
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-8 pt-8 pb-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1 tracking-wide uppercase">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500"
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <ChevronDown size={16} className="animate-bounce" />
        </motion.div>
      </motion.section>

      {/* ──── PHONE MOCKUP SECTION ──── */}
      <motion.section
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative py-20 px-4"
      >
        <div className="max-w-5xl mx-auto">
          <div className="relative mx-auto w-[280px] sm:w-[320px] aspect-[9/19.5] rounded-[3rem] border-[6px] border-gray-800 bg-[#0a0a0a] shadow-2xl shadow-black/50 overflow-hidden">
            {/* Phone notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-gray-800 rounded-b-2xl z-10" />
            {/* Phone screen content */}
            <div className="h-full w-full pt-8 pb-4 px-4 flex flex-col items-center justify-center text-center gap-4 bg-gradient-to-b from-[#0a1f14] to-[#050505]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FEE123] to-[#154733] flex items-center justify-center">
                <Sparkles size={24} className="text-black" />
              </div>
              <div className="space-y-2">
                <p className="text-[#FEE123] text-[10px] font-medium tracking-widest uppercase">Your Design</p>
                <h3 className="text-white text-sm font-bold">Geometric Wolf</h3>
              </div>
              <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-[#154733]/40 to-[#0a0a0a] border border-white/5 flex items-center justify-center">
                <div className="text-4xl opacity-60">🐺</div>
              </div>
              <div className="flex gap-2 w-full">
                <div className="flex-1 py-2 rounded-lg bg-[#FEE123] text-black text-[10px] font-semibold">Preview AR</div>
                <div className="flex-1 py-2 rounded-lg bg-white/10 text-white text-[10px] font-medium border border-white/5">Match Artist</div>
              </div>
            </div>
          </div>
          {/* Glow behind phone */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#FEE123]/5 rounded-full blur-[100px] -z-10" />
        </div>
      </motion.section>

      {/* ──── FEATURES SECTION ──── */}
      <section id="features" className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-[#FEE123] text-sm font-medium tracking-widest uppercase mb-4">
              The Platform
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
              Everything you need to get{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FEE123] to-[#154733]">
                the perfect tattoo
              </span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {FEATURES.map((feat) => (
              <motion.div
                key={feat.title}
                variants={scaleIn}
                className="group relative p-6 sm:p-8 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 overflow-hidden"
              >
                {/* Gradient accent */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feat.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${feat.iconColor} mb-5 group-hover:scale-110 transition-transform`}>
                    <feat.icon size={22} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──── HOW IT WORKS ──── */}
      <section id="how-it-works" className="relative py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-[#FEE123] text-sm font-medium tracking-widest uppercase mb-4">
              The Process
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
              Concept to chair in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FEE123] to-[#154733]">
                four steps
              </span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp}
                className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] group hover:border-[#FEE123]/20 transition-all"
              >
                <div className="text-[#FEE123]/20 text-5xl font-bold absolute top-4 right-5">{step.num}</div>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-[#154733]/40 border border-[#154733] flex items-center justify-center text-[#FEE123] mb-4">
                    <step.icon size={18} />
                  </div>
                  <h4 className="text-white font-bold text-lg mb-2">{step.title}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──── TESTIMONIALS ──── */}
      <section id="testimonials" className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-[#FEE123] text-sm font-medium tracking-widest uppercase mb-4">
              Loved by People
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
              What our users say
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {TESTIMONIALS.map((t) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={14} className="fill-[#FEE123] text-[#FEE123]" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#154733]/60 border border-[#154733] flex items-center justify-center text-lg">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-gray-500 text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──── PRICING ──── */}
      <section id="pricing" className="relative py-24 px-4 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-[#FEE123] text-sm font-medium tracking-widest uppercase mb-4">
              Membership
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
              Simple, transparent{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FEE123] to-[#154733]">
                pricing
              </span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center"
          >
            {/* Free Tier */}
            <motion.div variants={fadeUp} className="p-8 rounded-3xl bg-black border border-white/10 hover:border-white/20 transition-all">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Explorer</h3>
                <p className="text-sm text-gray-400">Perfect for trying out ideas</p>
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-sm text-gray-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-gray-400">
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#FEE123]" /> 3 AI Designs / day</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#FEE123]" /> Standard Resolution</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#FEE123]" /> Public Gallery</li>
              </ul>
              <button 
                onClick={() => router.push('/generate')}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
              >
                Start for Free
              </button>
            </motion.div>

            {/* Pro Tier */}
            <motion.div variants={fadeUp} className="relative p-8 rounded-3xl bg-[#154733]/10 border border-[#FEE123]/50 shadow-2xl shadow-[#FEE123]/5 transform scale-105 z-10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#FEE123] text-black text-xs font-bold uppercase tracking-wide shadow-lg">
                Most Popular
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Ink Master</h3>
                <p className="text-sm text-gray-300">For serious enthusiasts</p>
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$12</span>
                <span className="text-sm text-gray-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-gray-300">
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#FEE123]" /> Unlimited Generations</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#FEE123]" /> 4K Ultra-Res Downloads</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#FEE123]" /> Advanced Style Models</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#FEE123]" /> Private Portfolio</li>
              </ul>
              <button 
                onClick={() => router.push('/generate')}
                className="w-full py-3 rounded-xl bg-[#FEE123] hover:bg-[#FEE123]/90 text-black font-semibold transition-colors shadow-lg shadow-[#FEE123]/20"
              >
                Get Pro Access
              </button>
            </motion.div>

            {/* Studio Tier */}
            <motion.div variants={fadeUp} className="p-8 rounded-3xl bg-black border border-white/10 hover:border-white/20 transition-all">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Studio</h3>
                <p className="text-sm text-gray-400">For professional artists</p>
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$49</span>
                <span className="text-sm text-gray-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-gray-400">
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#FEE123]" /> Client Management</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#FEE123]" /> Stencil Generation</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#FEE123]" /> Commercial Rights</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#FEE123]" /> Priority Support</li>
              </ul>
              <button 
                onClick={() => router.push('/artists')}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
              >
                Contact Sales
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ──── TRUST BAR ──── */}
      <section className="py-16 px-4 border-t border-b border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { icon: Shield, label: 'Verified Artists Only' },
              { icon: Palette, label: 'Any Style, Any Size' },
              { icon: TrendingUp, label: '10x Faster Workflow' },
              { icon: Clock, label: 'Designs in Seconds' },
            ].map((item) => (
              <motion.div key={item.label} variants={fadeUp} className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#154733]/30 border border-[#154733]/50 flex items-center justify-center text-[#FEE123]">
                  <item.icon size={20} />
                </div>
                <span className="text-gray-400 text-xs font-medium tracking-wide">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──── FINAL CTA ──── */}
      <section className="relative py-32 px-4">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FEE123]/5 rounded-full blur-[150px]" />
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          className="relative z-10 max-w-3xl mx-auto text-center space-y-8"
        >
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
            Your next tattoo starts{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FEE123] to-[#154733]">
              here
            </span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-gray-400 max-w-xl mx-auto">
            Join thousands of people who found their perfect design with AI. No commitment, no cost to start.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.push('/generate')}
              className="group w-full sm:w-auto flex items-center justify-center gap-2.5 px-10 py-4 bg-[#FEE123] hover:bg-[#FEE123]/90 text-black rounded-xl font-semibold text-lg transition-all hover:shadow-xl hover:shadow-[#FEE123]/20 hover:-translate-y-0.5"
            >
              <Sparkles size={22} />
              Start Designing — Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* App store badges placeholder */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 pt-6">
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-lg">🍎</div>
              <div className="text-left">
                <div className="text-[10px] text-gray-400 leading-tight">Download on the</div>
                <div className="text-white text-sm font-semibold leading-tight">App Store</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-lg">▶️</div>
              <div className="text-left">
                <div className="text-[10px] text-gray-400 leading-tight">Get it on</div>
                <div className="text-white text-sm font-semibold leading-tight">Google Play</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FEE123] to-[#154733] flex items-center justify-center">
                  <span className="text-black font-bold text-sm">T</span>
                </div>
                <span className="text-white font-bold text-lg">TatT</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                AI-powered tattoo design studio. Think it, see it, ink it.
              </p>
            </div>
            {/* Links */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
              <div className="space-y-3">
                <Link href="/generate" className="block text-gray-500 hover:text-white text-sm transition-colors">AI Forge</Link>
                <Link href="/visualize" className="block text-gray-500 hover:text-white text-sm transition-colors">AR Preview</Link>
                <Link href="/artists" className="block text-gray-500 hover:text-white text-sm transition-colors">Artist Match</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
              <div className="space-y-3">
                <Link href="/philosophy" className="block text-gray-500 hover:text-white text-sm transition-colors">Philosophy</Link>
                <Link href="/journey" className="block text-gray-500 hover:text-white text-sm transition-colors">How It Works</Link>
                <a href="mailto:hello@tatt.app" className="block text-gray-500 hover:text-white text-sm transition-colors">Contact</a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
              <div className="space-y-3">
                <a href="#" className="block text-gray-500 hover:text-white text-sm transition-colors">Privacy</a>
                <a href="#" className="block text-gray-500 hover:text-white text-sm transition-colors">Terms</a>
                <a href="#" className="block text-gray-500 hover:text-white text-sm transition-colors">Cookies</a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-xs">© 2025 TatT. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-600 hover:text-white text-xs transition-colors">Twitter</a>
              <a href="#" className="text-gray-600 hover:text-white text-xs transition-colors">Instagram</a>
              <a href="#" className="text-gray-600 hover:text-white text-xs transition-colors">TikTok</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
