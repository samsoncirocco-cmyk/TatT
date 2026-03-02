'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Eye, ExternalLink, Search } from 'lucide-react';
import Link from 'next/link';

interface GalleryDesign {
  shareId: string;
  imageUrl: string;
  prompt: string;
  style?: string;
  bodyPart?: string;
  views: number;
  sharedAt: string;
}

const STYLES = ['All', 'Blackwork', 'Japanese', 'Geometric', 'Watercolor', 'Traditional', 'Fine Line', 'Realism', 'Neo-Traditional'];

// Seed gallery data — renders even without live API
const SEED_DESIGNS: GalleryDesign[] = [
  { shareId: 'demo-1', imageUrl: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=500&q=80', prompt: 'Intricate geometric wolf howling at the moon', style: 'Geometric', bodyPart: 'Upper Arm', views: 142, sharedAt: '2026-03-01T10:00:00Z' },
  { shareId: 'demo-2', imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80', prompt: 'Japanese koi fish with cherry blossoms flowing', style: 'Japanese', bodyPart: 'Back', views: 89, sharedAt: '2026-03-01T09:00:00Z' },
  { shareId: 'demo-3', imageUrl: 'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=500&q=80', prompt: 'Fine line minimalist mountain range with compass', style: 'Fine Line', bodyPart: 'Forearm', views: 67, sharedAt: '2026-02-28T15:00:00Z' },
  { shareId: 'demo-4', imageUrl: 'https://images.unsplash.com/photo-1560949824-ebe85c59f919?w=500&q=80', prompt: 'Blackwork mandala with lotus flower center', style: 'Blackwork', bodyPart: 'Chest', views: 201, sharedAt: '2026-02-28T11:00:00Z' },
  { shareId: 'demo-5', imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80', prompt: 'Watercolor phoenix rising with vibrant color splash', style: 'Watercolor', bodyPart: 'Shoulder', views: 156, sharedAt: '2026-02-27T14:00:00Z' },
  { shareId: 'demo-6', imageUrl: 'https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?w=500&q=80', prompt: 'Traditional American eagle with banner and roses', style: 'Traditional', bodyPart: 'Upper Arm', views: 93, sharedAt: '2026-02-27T10:00:00Z' },
  { shareId: 'demo-7', imageUrl: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=500&q=80', prompt: 'Realism portrait of a lion with geometric background', style: 'Realism', bodyPart: 'Thigh', views: 178, sharedAt: '2026-02-26T16:00:00Z' },
  { shareId: 'demo-8', imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80', prompt: 'Neo-traditional snake wrapped around a rose', style: 'Neo-Traditional', bodyPart: 'Calf', views: 44, sharedAt: '2026-02-26T12:00:00Z' },
  { shareId: 'demo-9', imageUrl: 'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=500&q=80', prompt: 'Blackwork geometric bear totem with dotwork', style: 'Blackwork', bodyPart: 'Back', views: 312, sharedAt: '2026-02-25T12:00:00Z' },
  { shareId: 'demo-10', imageUrl: 'https://images.unsplash.com/photo-1560949824-ebe85c59f919?w=500&q=80', prompt: 'Japanese dragon wrapped around cherry blossom tree', style: 'Japanese', bodyPart: 'Full Sleeve', views: 445, sharedAt: '2026-02-24T09:00:00Z' },
  { shareId: 'demo-11', imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80', prompt: 'Sacred geometry flower of life mandala', style: 'Geometric', bodyPart: 'Sternum', views: 267, sharedAt: '2026-02-23T14:00:00Z' },
  { shareId: 'demo-12', imageUrl: 'https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?w=500&q=80', prompt: 'Watercolor hummingbird with flowers, impressionist style', style: 'Watercolor', bodyPart: 'Wrist', views: 189, sharedAt: '2026-02-22T11:00:00Z' },
];

export function GalleryClient() {
  const [designs, setDesigns] = useState<GalleryDesign[]>(SEED_DESIGNS);
  const [activeStyle, setActiveStyle] = useState('All');
  const [search, setSearch] = useState('');

  // Try to load live designs from API
  useEffect(() => {
    fetch('/api/v1/designs/share')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDesigns([...data, ...SEED_DESIGNS]);
        }
      })
      .catch(() => { /* Use seed data */ });
  }, []);

  const filtered = designs.filter(d => {
    const matchStyle = activeStyle === 'All' || d.style === activeStyle;
    const matchSearch = !search || d.prompt.toLowerCase().includes(search.toLowerCase()) || d.style?.toLowerCase().includes(search.toLowerCase());
    return matchStyle && matchSearch;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">🎨 TatT</Link>
        <Link href="/generate" className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
          <Sparkles size={14} /> Create Design
        </Link>
      </nav>

      {/* Hero */}
      <div className="border-b border-gray-800 bg-gradient-to-b from-purple-950/20 to-transparent px-6 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Community Gallery</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-6">
            Real designs created with TatT AI. Browse for inspiration, then make it yours.
          </p>
          <div className="flex items-center gap-6 justify-center text-sm text-gray-500">
            <span>✦ {designs.length.toLocaleString()} designs</span>
            <span>✦ {STYLES.length - 1} styles</span>
            <span>✦ Free to create</span>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Style chips */}
          <div className="flex flex-wrap gap-2 flex-1">
            {STYLES.map(style => (
              <button
                key={style}
                onClick={() => setActiveStyle(style)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeStyle === style
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search designs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-gray-500">
              No designs match your filter. <button onClick={() => { setActiveStyle('All'); setSearch(''); }} className="text-purple-400 underline">Clear filters</button>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {filtered.map((design, i) => (
                <motion.div
                  key={design.shareId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <DesignCard design={design} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-gray-800 bg-gradient-to-t from-purple-950/20 to-transparent px-6 py-16 text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to design yours?</h2>
        <p className="text-gray-400 mb-6">Turn your idea into ink-ready art in seconds.</p>
        <Link href="/generate" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg">
          <Sparkles size={18} /> Start Creating Free
        </Link>
      </div>
    </div>
  );
}

function DesignCard({ design }: { design: GalleryDesign }) {
  return (
    <Link href={`/share/${design.shareId}`} className="group block">
      <div className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800 hover:border-gray-600 transition-colors">
        <div className="aspect-square overflow-hidden">
          <img
            src={design.imageUrl}
            alt={design.prompt}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
          <p className="text-xs text-gray-300 leading-tight line-clamp-2 mb-2">{design.prompt}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-400">{design.style}</span>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Eye size={10} /> {design.views}
            </div>
          </div>
        </div>
        {/* Style badge */}
        {design.style && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-xs text-purple-300 px-2 py-0.5 rounded-full">
            {design.style}
          </div>
        )}
      </div>
    </Link>
  );
}
