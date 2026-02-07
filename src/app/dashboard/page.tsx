'use client';

import { motion } from 'framer-motion';
import {
  Sparkles,
  Eye,
  Users,
  ArrowRight,
  Clock,
  Heart,
  TrendingUp,
  Search,
  Bell,
  Palette,
  Flame,
  Compass,
  Bookmark,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// ─── Animation ────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50 } },
};
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

// ─── Data ─────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: Sparkles, label: 'AI Forge', href: '/generate', accent: '#FEE123' },
  { icon: Eye, label: 'AR Preview', href: '/visualize', accent: '#34d399' },
  { icon: Users, label: 'Artists', href: '/artists', accent: '#FEE123' },
  { icon: Compass, label: 'Explore', href: '/swipe', accent: '#34d399' },
];

const TRENDING_STYLES = [
  { name: 'Geometric', emoji: '◇', count: '12.4K' },
  { name: 'Fine Line', emoji: '✎', count: '9.8K' },
  { name: 'Japanese', emoji: '⛩️', count: '8.2K' },
  { name: 'Blackwork', emoji: '◼', count: '7.1K' },
  { name: 'Watercolor', emoji: '🎨', count: '5.6K' },
];

const RECENT_DESIGNS = [
  { id: 1, title: 'Geometric Wolf', style: 'Geometric', time: '2h ago', liked: true },
  { id: 2, title: 'Lotus Mandala', style: 'Fine Line', time: '5h ago', liked: false },
  { id: 3, title: 'Dragon Sleeve', style: 'Japanese', time: '1d ago', liked: true },
];

const FEATURED_ARTISTS = [
  { name: 'Kai Nakamura', style: 'Japanese Traditional', rating: 4.9, designs: 847 },
  { name: 'Elena Cross', style: 'Fine Line & Botanical', rating: 4.8, designs: 623 },
  { name: 'Marcus Steel', style: 'Blackwork & Geometric', rating: 4.9, designs: 1204 },
];

// ─── Component ────────────────────────────────────
export default function Dashboard() {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] pb-24">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* ─── Top Header ─── */}
      <div className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[#FEE123]/70 text-[10px] font-medium tracking-[0.2em] uppercase">Welcome back</p>
              <h1 className="text-white text-xl font-bold tracking-tight">Your Studio</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <Bell size={18} />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FEE123] to-[#154733] flex items-center justify-center text-black font-bold text-sm">
                S
              </div>
            </div>
          </div>

          {/* Search */}
          <div className={`relative transition-all ${searchFocused ? 'ring-1 ring-[#FEE123]/30' : ''} rounded-xl`}>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search designs, styles, artists..."
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/[0.06] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 pt-6">

          {/* ─── Quick Actions ─── */}
          <motion.div variants={fadeUp}>
            <div className="grid grid-cols-4 gap-3">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ background: `${action.accent}10`, border: `1px solid ${action.accent}20` }}
                  >
                    <action.icon size={20} style={{ color: action.accent }} />
                  </div>
                  <span className="text-gray-400 text-[11px] font-medium">{action.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* ─── Create New Design CTA ─── */}
          <motion.div variants={fadeUp}>
            <Link
              href="/generate"
              className="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#154733]/40 to-[#0a0a0a] border border-[#154733]/50 hover:border-[#FEE123]/20 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-[#FEE123] flex items-center justify-center flex-shrink-0">
                <Plus size={24} className="text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-base">Create New Design</h3>
                <p className="text-gray-500 text-xs mt-0.5">Generate AI-powered tattoo concepts in seconds</p>
              </div>
              <ArrowRight size={18} className="text-gray-600 group-hover:text-[#FEE123] group-hover:translate-x-1 transition-all flex-shrink-0" />
            </Link>
          </motion.div>

          {/* ─── Trending Styles ─── */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-[#FEE123]" />
                <h2 className="text-white font-bold text-base">Trending Styles</h2>
              </div>
              <Link href="/swipe" className="text-[#FEE123] text-xs font-medium">See All</Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
              {TRENDING_STYLES.map((style) => (
                <button
                  key={style.name}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] hover:border-[#FEE123]/20 transition-all"
                >
                  <span className="text-sm">{style.emoji}</span>
                  <span className="text-white text-xs font-medium whitespace-nowrap">{style.name}</span>
                  <span className="text-gray-500 text-[10px]">{style.count}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* ─── Recent Designs ─── */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#FEE123]" />
                <h2 className="text-white font-bold text-base">Recent Designs</h2>
              </div>
              <Link href="/generate" className="text-[#FEE123] text-xs font-medium">View All</Link>
            </div>
            <div className="space-y-3">
              {RECENT_DESIGNS.map((design) => (
                <div
                  key={design.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#154733]/40 to-[#0a0a0a] border border-white/5 flex items-center justify-center flex-shrink-0">
                    <Palette size={18} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-sm">{design.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-gray-500 text-xs">{design.style}</span>
                      <span className="text-gray-700 text-xs">·</span>
                      <span className="text-gray-600 text-xs">{design.time}</span>
                    </div>
                  </div>
                  <button className="flex-shrink-0">
                    <Heart
                      size={18}
                      className={design.liked ? 'fill-[#FEE123] text-[#FEE123]' : 'text-gray-600'}
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ─── Featured Artists ─── */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#FEE123]" />
                <h2 className="text-white font-bold text-base">Featured Artists</h2>
              </div>
              <Link href="/artists" className="text-[#FEE123] text-xs font-medium">See All</Link>
            </div>
            <div className="space-y-3">
              {FEATURED_ARTISTS.map((artist) => (
                <Link
                  key={artist.name}
                  href="/artists"
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#154733] to-[#0a1f14] border border-[#154733]/50 flex items-center justify-center text-[#FEE123] font-bold text-sm flex-shrink-0">
                    {artist.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-sm">{artist.name}</h4>
                    <p className="text-gray-500 text-xs mt-0.5">{artist.style}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[#FEE123] text-sm font-bold">★ {artist.rating}</div>
                    <div className="text-gray-600 text-[10px]">{artist.designs} designs</div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* ─── Inspiration Prompt ─── */}
          <motion.div variants={fadeUp}>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FEE123]/5 to-transparent border border-[#FEE123]/10 text-center">
              <div className="text-2xl mb-3">✨</div>
              <h3 className="text-white font-bold text-lg mb-2">Need Inspiration?</h3>
              <p className="text-gray-400 text-sm mb-4">Swipe through curated designs from top artists around the world.</p>
              <Link
                href="/swipe"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FEE123] text-black rounded-lg font-semibold text-sm hover:bg-[#FEE123]/90 transition-all"
              >
                <Compass size={16} />
                Explore Designs
              </Link>
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* ─── Bottom Navigation ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur-xl border-t border-white/5">
        <div className="max-w-lg mx-auto flex items-center justify-around py-3">
          {[
            { icon: Sparkles, label: 'Home', href: '/dashboard', active: true },
            { icon: Search, label: 'Explore', href: '/swipe', active: false },
            { icon: Plus, label: 'Create', href: '/generate', active: false, special: true },
            { icon: Bookmark, label: 'Saved', href: '/generate', active: false },
            { icon: Users, label: 'Artists', href: '/artists', active: false },
          ].map((nav) => (
            <Link
              key={nav.label}
              href={nav.href}
              className={`flex flex-col items-center gap-1 ${nav.special ? '' : 'py-1'}`}
            >
              {nav.special ? (
                <div className="w-12 h-12 -mt-5 rounded-full bg-[#FEE123] flex items-center justify-center shadow-lg shadow-[#FEE123]/20">
                  <nav.icon size={22} className="text-black" />
                </div>
              ) : (
                <nav.icon size={20} className={nav.active ? 'text-[#FEE123]' : 'text-gray-600'} />
              )}
              <span className={`text-[10px] font-medium ${nav.active ? 'text-[#FEE123]' : 'text-gray-600'}`}>
                {nav.label}
              </span>
            </Link>
          ))}
        </div>
        {/* Home indicator */}
        <div className="flex justify-center pb-2">
          <div className="w-32 h-1 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}
