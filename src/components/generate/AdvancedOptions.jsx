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
    { value: 'simple', label: 'Simple', description: 'Clean, minimal enhancement' },
    { value: 'detailed', label: 'Detailed', description: 'Rich artistic details (recommended)' },
    { value: 'ultra', label: 'Ultra', description: 'Photorealistic composition guide' }
];

export default function AdvancedOptions({
    isExpanded,
    onToggle,
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
            <button
                onClick={onToggle}
                className="flex items-center gap-2 text-xs font-mono text-gray-600 hover:text-white transition-colors uppercase tracking-widest mb-4"
            >
                <ChevronDown
                    className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    size={14}
                />
                Advanced Parameters
            </button>

            {/* Expanded Panel */}
            {isExpanded && (
                <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6 animate-slide-down">

                    {/* Size Selection */}
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">
                            Size
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {SIZE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => onSizeChange(option.value)}
                                    className={`p-3 rounded-lg text-sm font-bold transition-all ${size === option.value
                                            ? 'bg-white text-black'
                                            : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'
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
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">
                            AI Model
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(AI_MODELS).map(([key, model]) => (
                                <button
                                    key={key}
                                    onClick={() => onModelChange(key)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${aiModel === key
                                            ? 'bg-ducks-green text-white border-2 border-ducks-green'
                                            : 'bg-white/5 text-gray-500 border border-white/10 hover:border-white/30'
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
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">
                            Enhancement Level
                        </label>
                        <div className="space-y-2">
                            {ENHANCEMENT_LEVELS.map((level) => (
                                <button
                                    key={level.value}
                                    onClick={() => onEnhancementLevelChange(level.value)}
                                    className={`w-full p-3 rounded-lg text-left transition-all ${enhancementLevel === level.value
                                            ? 'bg-purple-500/10 border-2 border-purple-500 text-white'
                                            : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${enhancementLevel === level.value ? 'border-purple-500' : 'border-gray-600'
                                            }`}>
                                            {enhancementLevel === level.value && (
                                                <div className="w-2 h-2 bg-purple-500 rounded-full" />
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
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">
                            Negative Prompt (Optional)
                        </label>
                        <textarea
                            value={negativePrompt}
                            onChange={(e) => onNegativePromptChange(e.target.value)}
                            placeholder="Elements to avoid... (e.g., blurry, low quality, distorted)"
                            className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:border-ducks-green focus:outline-none resize-none placeholder-gray-600"
                            rows="3"
                        />
                    </div>

                    {/* RGBA Separation Toggle */}
                    {onSeparateRGBAChange && (
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={separateRGBA}
                                    onChange={(e) => onSeparateRGBAChange(e.target.checked)}
                                    className="w-5 h-5 rounded border-2 border-white/20 bg-black/40 checked:bg-ducks-green checked:border-ducks-green transition-colors cursor-pointer"
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-white group-hover:text-ducks-green transition-colors">
                                        Separate RGBA Channels
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Split transparent images into separate RGB and Alpha layers for advanced compositing
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
