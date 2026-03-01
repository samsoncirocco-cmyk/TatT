'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Zap, 
  Info, 
  X, 
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface CostBreakdown {
  lineWork: number;
  shading: number;
  color: number;
  detail: number;
  coverage: number;
}

interface PriceRange {
  low: number;
  mid: number;
  high: number;
  premium: number;
}

interface TimeEstimate {
  sessionsMin: number;
  sessionsMax: number;
  hoursPerSession: number;
  totalHoursMin: number;
  totalHoursMax: number;
}

interface CostEstimateResult {
  success: boolean;
  priceRange: PriceRange;
  timeEstimate: TimeEstimate;
  breakdown: CostBreakdown;
  factors: string[];
  recommendations: string[];
  confidence: 'low' | 'medium' | 'high';
  warning?: string;
}

interface CostEstimatorProps {
  isOpen: boolean;
  onClose: () => void;
  imageDataUrl?: string;
  prompt?: string;
  style?: string;
  bodyPart?: string;
  onEstimateComplete?: (estimate: CostEstimateResult) => void;
}

const SIZE_OPTIONS = [
  { value: 'tiny', label: 'Tiny', description: '1-2"' },
  { value: 'small', label: 'Small', description: '2-4"' },
  { value: 'medium', label: 'Medium', description: '4-6"' },
  { value: 'large', label: 'Large', description: '6-10"' },
  { value: 'xlarge', label: 'XL', description: '10-15"' },
  { value: 'sleeve', label: 'Half Sleeve', description: '15"+ wrap' },
];

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const ComplexityBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs text-gray-400 w-20">{label}</span>
    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
      <motion.div 
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${value * 10}%` }}
        transition={{ duration: 0.5, delay: 0.2 }}
      />
    </div>
    <span className="text-xs text-gray-500 w-6 text-right">{value}/10</span>
  </div>
);

const ConfidenceBadge = ({ level }: { level: 'low' | 'medium' | 'high' }) => {
  const config = {
    low: { color: 'text-yellow-400 bg-yellow-400/10', icon: AlertCircle, text: 'Low Confidence' },
    medium: { color: 'text-blue-400 bg-blue-400/10', icon: Info, text: 'Medium Confidence' },
    high: { color: 'text-green-400 bg-green-400/10', icon: CheckCircle, text: 'High Confidence' }
  };
  const { color, icon: Icon, text } = config[level];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${color}`}>
      <Icon size={12} />
      {text}
    </span>
  );
};

export default function CostEstimator({ 
  isOpen, 
  onClose, 
  imageDataUrl, 
  prompt, 
  style, 
  bodyPart,
  onEstimateComplete 
}: CostEstimatorProps) {
  const [selectedSize, setSelectedSize] = useState('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [estimate, setEstimate] = useState<CostEstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEstimate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const authToken = localStorage.getItem('tatt_auth_token') || 
                       process.env.NEXT_PUBLIC_FRONTEND_AUTH_TOKEN;

      const response = await fetch('/api/v1/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          imageDataUrl,
          prompt,
          style,
          bodyPart,
          size: selectedSize
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setEstimate(data);
        onEstimateComplete?.(data);
      } else {
        setError(data.error || 'Failed to generate estimate');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [imageDataUrl, prompt, style, bodyPart, selectedSize, onEstimateComplete]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                <DollarSign size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Cost Estimator</h2>
                <p className="text-xs text-gray-500">AI-powered price analysis</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Size Selection */}
            {!estimate && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Approximate Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SIZE_OPTIONS.map(size => (
                    <button
                      key={size.value}
                      onClick={() => setSelectedSize(size.value)}
                      className={`px-3 py-2 rounded-lg border transition-all ${
                        selectedSize === size.value
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-gray-700 hover:border-gray-600 text-gray-400'
                      }`}
                    >
                      <div className="text-sm font-medium">{size.label}</div>
                      <div className="text-xs opacity-60">{size.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Design Preview */}
            {imageDataUrl && !estimate && (
              <div className="bg-gray-800/50 rounded-xl p-4 flex items-center gap-4">
                <img 
                  src={imageDataUrl} 
                  alt="Design preview" 
                  className="w-20 h-20 object-contain rounded-lg bg-gray-900"
                />
                <div>
                  <p className="text-sm text-gray-300 font-medium">Design Ready</p>
                  <p className="text-xs text-gray-500">
                    {style && `${style} style`}
                    {style && bodyPart && ' • '}
                    {bodyPart && `${bodyPart} placement`}
                  </p>
                </div>
              </div>
            )}

            {/* Generate Button */}
            {!estimate && !isLoading && (
              <button
                onClick={fetchEstimate}
                disabled={!imageDataUrl && !prompt}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles size={18} />
                Get AI Price Estimate
              </button>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                  <motion.div 
                    className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
                <p className="text-gray-400 text-sm">Analyzing design complexity...</p>
                <p className="text-gray-600 text-xs mt-1">This takes 5-10 seconds</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
                <button 
                  onClick={fetchEstimate}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Results */}
            {estimate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Warning if applicable */}
                {estimate.warning && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle size={16} className="text-yellow-400 mt-0.5" />
                    <p className="text-xs text-yellow-200">{estimate.warning}</p>
                  </div>
                )}

                {/* Main Price Display */}
                <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/20 rounded-2xl p-6 text-center">
                  <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">Estimated Range</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-white">{formatCurrency(estimate.priceRange.low)}</span>
                    <span className="text-xl text-gray-500 mx-2">—</span>
                    <span className="text-3xl font-bold text-white">{formatCurrency(estimate.priceRange.high)}</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    Average: {formatCurrency(estimate.priceRange.mid)} • Premium artist: {formatCurrency(estimate.priceRange.premium)}
                  </p>
                  <div className="mt-3">
                    <ConfidenceBadge level={estimate.confidence} />
                  </div>
                </div>

                {/* Time Estimate */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={16} className="text-blue-400" />
                    <span className="text-sm font-medium text-white">Time Estimate</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {estimate.timeEstimate.totalHoursMin}-{estimate.timeEstimate.totalHoursMax}
                        <span className="text-sm font-normal text-gray-500 ml-1">hrs</span>
                      </p>
                      <p className="text-xs text-gray-500">Total chair time</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {estimate.timeEstimate.sessionsMin === estimate.timeEstimate.sessionsMax 
                          ? estimate.timeEstimate.sessionsMin 
                          : `${estimate.timeEstimate.sessionsMin}-${estimate.timeEstimate.sessionsMax}`}
                        <span className="text-sm font-normal text-gray-500 ml-1">sessions</span>
                      </p>
                      <p className="text-xs text-gray-500">~{estimate.timeEstimate.hoursPerSession}hrs each</p>
                    </div>
                  </div>
                </div>

                {/* Complexity Breakdown */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={16} className="text-purple-400" />
                    <span className="text-sm font-medium text-white">Complexity Analysis</span>
                  </div>
                  <div className="space-y-3">
                    <ComplexityBar label="Line Work" value={estimate.breakdown.lineWork} color="bg-pink-500" />
                    <ComplexityBar label="Shading" value={estimate.breakdown.shading} color="bg-purple-500" />
                    <ComplexityBar label="Color" value={estimate.breakdown.color} color="bg-blue-500" />
                    <ComplexityBar label="Detail" value={estimate.breakdown.detail} color="bg-emerald-500" />
                    <ComplexityBar label="Coverage" value={estimate.breakdown.coverage} color="bg-amber-500" />
                  </div>
                </div>

                {/* Factors */}
                {estimate.factors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                      Cost Factors
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {estimate.factors.map((factor, i) => (
                        <span 
                          key={i}
                          className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded-full"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {estimate.recommendations.length > 0 && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={14} className="text-blue-400" />
                      <span className="text-xs font-medium text-blue-400">Pro Tips</span>
                    </div>
                    <ul className="space-y-1.5">
                      {estimate.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                          <ChevronRight size={12} className="text-blue-400 mt-0.5" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* New Estimate Button */}
                <button
                  onClick={() => setEstimate(null)}
                  className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  ← Get new estimate
                </button>
              </motion.div>
            )}
          </div>

          {/* Footer Disclaimer */}
          <div className="border-t border-gray-800 px-6 py-4">
            <p className="text-xs text-gray-600 text-center">
              Estimates are AI-generated and vary by artist, location, and complexity. 
              Always get an in-person consultation for accurate pricing.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
