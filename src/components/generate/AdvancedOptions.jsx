/**
 * AdvancedOptions Component
 * 
 * Collapsible panel with all parameter controls
 */

import { ChevronDown } from 'lucide-react';
import { AI_MODELS } from '../../services/replicateService';

const SIZE_OPTIONS = [
    { value: 'small', label: 'Small', description: '2-3 inches' },
    { value: 'medium', label: 'Medium', description: '4-6 inches' },
    { value: 'large', label: 'Large', description: '7-10 inches' },
    { value: 'xlarge', label: 'XLarge', description: '10+ inches' }
];

const ENHANCEMENT_LEVELS = [
    { value: 'simple', label: 'Clean & Bold', description: 'Clear lines and simple shapes' },
    { value: 'detailed', label: 'Intricate Details', description: 'More texture and storytelling (recommended)' },
    { value: 'ultra', label: 'Professional Masterpiece', description: 'Gallery-level detail and composition' }
];

export default function AdvancedOptions({
    isExpanded,
    onToggle,
    hideToggle = false,
    size = 'medium',
    onSizeChange,
    aiModel = 'tattoo',
    onModelChange,
    negativePrompt = '',
    onNegativePromptChange,
    enhancementLevel = 'detailed',
    onEnhancementLevelChange,
    separateRGBA = false,
    onSeparateRGBAChange
}) {
    return (
        <div className="border-t border-white/5 pt-6">
            {/* Toggle Button */}
            {!hideToggle && (
                <button
                    onClick={onToggle}
                    className="flex items-center gap-2 text-xs font-mono text-white/40 hover:text-white transition-colors uppercase tracking-widest mb-4"
                >
                    <ChevronDown
                        className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        size={14}
                    />
                    Tattoo Fine-Tuning
                </button>
            )}

            {/* Expanded Panel */}
            {isExpanded && (
                <div className="studio-glass rounded-2xl p-6 border border-white/10 space-y-6 animate-slide-down">

                    {/* Size Selection */}
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-white/40 mb-3">
                            Size
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {SIZE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => onSizeChange(option.value)}
                                    className={`p-3 rounded-lg text-sm font-bold transition-all ${size === option.value
                                            ? 'bg-studio-accent text-white'
                                            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <div>{option.label}</div>
                                    <div className="text-[10px] font-normal opacity-70">{option.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* AI Model Selection */}
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-white/40 mb-3">
                            The Artist's Hand
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(AI_MODELS).map(([key, model]) => (
                                <button
                                    key={key}
                                    onClick={() => onModelChange(key)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${aiModel === key
                                            ? 'bg-[rgba(0,255,65,0.15)] text-white border-2 border-studio-neon'
                                            : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/30'
                                        }`}
                                    title={model.description}
                                >
                                    {model.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Enhancement Level */}
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-white/40 mb-3">
                            Detail Intensity
                        </label>
                        <div className="space-y-2">
                            {ENHANCEMENT_LEVELS.map((level) => (
                                <button
                                    key={level.value}
                                    onClick={() => onEnhancementLevelChange(level.value)}
                                    className={`w-full p-3 rounded-lg text-left transition-all ${enhancementLevel === level.value
                                            ? 'bg-[rgba(255,62,0,0.12)] border-2 border-studio-accent text-white'
                                            : 'bg-white/5 border border-white/10 text-white/50 hover:border-white/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${enhancementLevel === level.value ? 'border-studio-accent' : 'border-white/40'
                                            }`}>
                                            {enhancementLevel === level.value && (
                                                <div className="w-2 h-2 bg-studio-accent rounded-full" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-sm">{level.label}</div>
                                            <div className="text-xs opacity-70">{level.description}</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Negative Prompt */}
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-white/40 mb-3">
                            The "No-Go" List (Optional)
                        </label>
                        <textarea
                            value={negativePrompt}
                            onChange={(e) => onNegativePromptChange(e.target.value)}
                            placeholder="Things to avoid... (e.g., blurry, messy lines, too much shading)"
                            className="w-full bg-[var(--studio-bg)] border border-white/[0.05] text-white rounded-lg px-4 py-3 text-sm font-mono focus:border-studio-neon focus:shadow-[0_0_12px_rgba(0,255,65,0.3)] focus:outline-none resize-none placeholder-white/30"
                            rows="3"
                        />
                    </div>

                    {/* Layer Cutout Toggle */}
                    {onSeparateRGBAChange && (
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={separateRGBA}
                                    onChange={(e) => onSeparateRGBAChange(e.target.checked)}
                                    className="w-5 h-5 rounded border-2 border-white/20 bg-black/40 checked:bg-studio-neon checked:border-studio-neon transition-colors cursor-pointer"
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-white group-hover:text-studio-neon transition-colors">
                                        Sticker Mode (Cutouts)
                                    </div>
                                    <div className="text-xs text-white/40 mt-1">
                                        Removes the background so you can move each part like a sticker
                                    </div>
                                </div>
                            </label>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
