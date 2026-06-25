'use client';

/**
 * Demo Mode Banner
 * Shows when NEXT_PUBLIC_DEMO_MODE=true
 * Indicates the app is running with mock data
 */

import { useState } from 'react';
import { X, Zap } from 'lucide-react';

export default function DemoModeBanner() {
  const [dismissed, setDismissed] = useState(false);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (!isDemoMode || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 animate-pulse" />
          <p className="text-sm font-medium">
            <span className="font-bold">Demo Mode:</span> This is a preview with mock data. 
            All features are simulated for demonstration purposes.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
