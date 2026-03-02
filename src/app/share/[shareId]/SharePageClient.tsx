'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Twitter, ExternalLink, Sparkles, Eye } from 'lucide-react';
import Link from 'next/link';

interface SharedDesign {
  shareId: string;
  imageUrl: string;
  prompt: string;
  style?: string;
  bodyPart?: string;
  sharedAt: string;
  views: number;
}

export function SharePageClient({ design }: { design: SharedDesign }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://tatt-app.vercel.app/share/${design.shareId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const twitterShare = () => {
    const text = encodeURIComponent(`Just designed my next tattoo with TatT AI 🖤\n\n"${design.prompt}"\n\n`);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          🎨 TatT
        </Link>
        <Link
          href="/generate"
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Sparkles size={14} />
          Create Your Own
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Design Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-900">
              <img
                src={design.imageUrl}
                alt={design.prompt}
                className="w-full aspect-square object-cover"
              />
            </div>
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs text-gray-300">
              <Eye size={12} />
              {design.views.toLocaleString()} views
            </div>
          </motion.div>

          {/* Design Info + Share */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {design.style && (
                  <span className="bg-purple-900/50 border border-purple-700 text-purple-300 text-sm px-3 py-1 rounded-full">
                    {design.style}
                  </span>
                )}
                {design.bodyPart && (
                  <span className="bg-gray-800 border border-gray-700 text-gray-300 text-sm px-3 py-1 rounded-full">
                    {design.bodyPart}
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm leading-relaxed italic">
                &ldquo;{design.prompt}&rdquo;
              </p>
            </div>

            {/* Share Actions */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Share This Design</p>

              <button
                onClick={copyLink}
                className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-4 py-3 transition-colors"
              >
                <span className="text-sm text-gray-300 font-mono truncate mr-3">{shareUrl}</span>
                {copied ? (
                  <Check size={16} className="text-green-400 shrink-0" />
                ) : (
                  <Copy size={16} className="text-gray-400 shrink-0" />
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={twitterShare}
                  className="flex items-center justify-center gap-2 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 text-[#1DA1F2] rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                >
                  <Twitter size={16} />
                  Share on X
                </button>
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600/10 to-pink-600/10 hover:from-purple-600/20 hover:to-pink-600/20 border border-purple-500/30 text-purple-300 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                >
                  <ExternalLink size={16} />
                  Copy for IG
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3 pt-2">
              <Link
                href="/generate"
                className="w-full block text-center bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors"
              >
                <Sparkles size={16} className="inline mr-2" />
                Create Your Own Design
              </Link>
              <Link
                href="/artists"
                className="w-full block text-center bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-colors border border-gray-700"
              >
                Find an Artist to Ink This →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
