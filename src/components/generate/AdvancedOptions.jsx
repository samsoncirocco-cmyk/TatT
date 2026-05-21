/**
 * AdvancedOptions Component
 * 
 * Collapsible panel with all parameter controls
 */

import { ChevronDown } from 'lucide-react';
import { AI_MODELS } from '@/features/generate/services/replicateService';

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
        <div className="border-t-2 hairline pt-6">
            {/* Toggle Button */}
            {!hideToggle && (
                <button
                    onClick={onToggle}
                    className="press flex items-center gap-2 text-[10px] font-body text-white/60 hover:text-pink transition-colors uppercase tracking-[0.25em] mb-4"
                >
                    <ChevronDown
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        size={12}
                    />
                    Tattoo Fine-Tuning
                </button>
            )}

            {/* Expanded Panel */}
            {isExpanded && (
                <div className="bg-black border-2 hairline p-6 space-y-6">

                    {/* Size Selection */}
                    <div>
                        <label className="block text-[10px] font-body uppercase tracking-[0.28em] text-pink mb-3">
                            ▸ Size
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {SIZE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => onSizeChange(option.value)}
                                    className={`press p-3 text-left transition-colors ${size === option.value
                                            ? 'bg-pink text-black border-2 border-pink'
                                            : 'bg-black text-white/70 border hairline hover:border-pink hover:text-pink'
                                        }`}
                                >
                                    <div className="font-display text-[14px] uppercase tracking-wide">{option.label}</div>
                                    <div className="text-[10px] font-body tracking-[0.15em] opacity-80 mt-1">{option.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* AI Model Selection */}
                    <div>
                        <label className="block text-[10px] font-body uppercase tracking-[0.28em] text-pink mb-3">
                            ▸ The Artist's Hand
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(AI_MODELS).map(([key, model]) => (
                                <button
                                    key={key}
                                    onClick={() => onModelChange(key)}
                                    className={`press px-4 py-2 text-[11px] font-body uppercase tracking-[0.22em] transition-colors ${aiModel === key
                                            ? 'bg-pink text-black border-2 border-pink'
                                            : 'bg-black text-white/70 border hairline hover:border-pink hover:text-pink'
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
                        <label className="block text-[10px] font-body uppercase tracking-[0.28em] text-pink mb-3">
                            ▸ Detail Intensity
                        </label>
                        <div className="space-y-2">
                            {ENHANCEMENT_LEVELS.map((level) => (
                                <button
                                    key={level.value}
                                    onClick={() => onEnhancementLevelChange(level.value)}
                                    className={`press w-full p-3 text-left transition-colors ${enhancementLevel === level.value
                                            ? 'bg-black border-2 border-pink text-white'
                                            : 'bg-black border hairline text-white/70 hover:border-pink'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${enhancementLevel === level.value ? 'border-pink' : 'border-white/30'}`}>
                                            {enhancementLevel === level.value && (
                                                <div className="w-2 h-2 bg-pink rounded-full" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-display text-[14px] uppercase tracking-wide">{level.label}</div>
                                            <div className="text-[10px] font-body tracking-[0.15em] opacity-80 mt-0.5">{level.description}</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Negative Prompt */}
                    <div>
                        <label className="block text-[10px] font-body uppercase tracking-[0.28em] text-pink mb-3">
                            ▸ The "No-Go" List (Optional)
                        </label>
                        <textarea
                            value={negativePrompt}
                            onChange={(e) => onNegativePromptChange(e.target.value)}
                            placeholder="Things to avoid... (e.g., blurry, messy lines, too much shading)"
                            className="w-full bg-black border-2 hairline text-white px-4 py-3 text-[14px] font-display tracking-tight focus:border-pink focus:outline-none resize-none placeholder-white/30 transition-colors"
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
                                    className="w-5 h-5 border-2 hairline bg-black checked:bg-pink checked:border-pink transition-colors cursor-pointer accent-pink"
                                />
                                <div className="flex-1">
                                    <div className="font-display text-[14px] uppercase tracking-wide text-white group-hover:text-pink transition-colors">
                                        Sticker Mode (Cutouts)
                                    </div>
                                    <div className="text-[10px] font-body tracking-[0.15em] text-white/50 mt-1">
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
