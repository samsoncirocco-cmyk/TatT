/**
 * DesignForm Component (Reskinned)
 * 
 * Form for tattoo design input - style, subject, body part, size, and AI model selection
 */

import { TATTOO_STYLES, BODY_PART_SPECS, SIZE_SPECS, getRecommendedModel } from '../../config/promptTemplates';
import { AI_MODELS } from '../../services/replicateService';
import Button from '../ui/Button';
import { Sparkles, Palette, Loader2 } from 'lucide-react';

export default function DesignForm({
  formData,
  onInputChange,
  onGenerate,
  onShowTemplates,
  isGenerating,
  error,
  currentTip
}) {
  return (
    <div className="space-y-8 animate-fade-in">

      {/* Magic Input Section */}
      <div className="relative group">
        <label className="block text-xs font-mono uppercase tracking-widest text-ducks-yellow mb-2">
          Manifest Vision
        </label>
        <div className="relative">
          <textarea
            value={formData.subject}
            onChange={(e) => onInputChange('subject', e.target.value)}
            placeholder="Describe your tattoo... (e.g., A cyberpunk samurai glowing in neon rain)"
            className="w-full bg-transparent text-3xl md:text-5xl font-display font-medium text-white placeholder-white/20 border-b border-white/10 focus:border-ducks-yellow focus:ring-0 outline-none transition-all resize-none py-4 leading-tight min-h-[120px]"
            rows="2"
          />
          <button
            onClick={onShowTemplates}
            className="absolute right-0 top-0 text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
          >
            <Palette size={12} /> Templates
          </button>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Style Selector */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-3">
            Style Frequency
          </label>
          <div className="glass-panel rounded-xl p-1 flex items-center overflow-x-auto hide-scrollbar gap-2">
            {Object.entries(TATTOO_STYLES).map(([key, style]) => (
              <button
                key={key}
                onClick={() => onInputChange('style', key)}
                className={`
                        px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all
                        ${formData.style === key
                    ? 'bg-white text-black shadow-glow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'}
                    `}
              >
                {style.displayName}
              </button>
            ))}
          </div>
        </div>

        {/* Body Part Selector */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-3">
            Placement
          </label>
          <select
            value={formData.bodyPart}
            onChange={(e) => onInputChange('bodyPart', e.target.value)}
            className="w-full bg-surface/50 border border-white/10 text-white rounded-xl px-4 py-3 focus:border-ducks-green focus:outline-none appearance-none cursor-pointer"
          >
            {Object.entries(BODY_PART_SPECS).map(([key, spec]) => (
              <option key={key} value={key} className="bg-black text-white">
                {spec.displayName}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Advanced Toggles (Model & Size) */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">

        {/* Model Selection Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 uppercase font-bold">Model Engine:</span>
          {Object.entries(AI_MODELS).map(([key, model]) => (
            <button
              key={key}
              onClick={() => onInputChange('aiModel', key)}
              className={`
                        text-xs px-2 py-1 rounded border transition-colors
                        ${formData.aiModel === key
                  ? 'border-ducks-green text-ducks-green bg-ducks-green/10'
                  : 'border-white/10 text-gray-500 hover:border-white/30'}
                    `}
              title={model.description}
            >
              {model.name}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={onGenerate}
        disabled={isGenerating || !formData.subject.trim()}
        isLoading={isGenerating}
        size="lg"
        className="w-full text-lg h-16"
        icon={Sparkles}
        variant="primary"
      >
        {isGenerating ? (
          <span className="flex items-center gap-2">
            {currentTip ? currentTip.text : 'Consulting Neural Network...'}
          </span>
        ) : 'Ignite Forge'}
      </Button>

    </div>
  );
}
