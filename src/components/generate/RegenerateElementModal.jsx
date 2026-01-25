/**
 * Regenerate Element Modal
 *
 * Modal for regenerating a specific layer with adjusted prompt
 * Matches The Forge's dark industrial aesthetic
 */

import { useState, useEffect } from 'react';
import { RefreshCw, X, Sparkles, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

export default function RegenerateElementModal({
    layer,
    onClose,
    onRegenerate,
    isGenerating = false,
    error = null
}) {
    const [elementPrompt, setElementPrompt] = useState('');
    const [adjustments, setAdjustments] = useState('');
    const [useOriginalStyle, setUseOriginalStyle] = useState(true);

    // Initialize prompt from layer name
    useEffect(() => {
        if (layer?.name) {
            // Extract element name from "Subject (dragon)" → "dragon"
            const match = layer.name.match(/\(([^)]+)\)/);
            const extracted = match ? match[1] : layer.name.replace(/^(Subject|Background|Effect)\s*/i, '');
            setElementPrompt(extracted);
        }
    }, [layer]);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && !isGenerating) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, isGenerating]);

    if (!layer) return null;

    const handleSubmit = () => {
        const finalPrompt = adjustments.trim()
            ? `${elementPrompt} ${adjustments}`
            : elementPrompt;

        onRegenerate({
            layerId: layer.id,
            prompt: finalPrompt,
            useOriginalStyle,
            layerType: layer.type
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="studio-glass border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[rgba(0,255,65,0.2)] border border-[rgba(0,255,65,0.4)] flex items-center justify-center">
                            <RefreshCw size={20} className="text-studio-neon" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                                Regenerate Element
                            </h3>
                            <p className="text-xs text-white/50 font-mono">
                                Layer: {layer.name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white disabled:opacity-50"
                        aria-label="Close regenerate modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Current Layer Preview */}
                    <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                        <p className="text-xs font-mono uppercase tracking-[0.3em] text-studio-neon mb-3">
                            Current Element
                        </p>
                        <div className="flex items-start gap-4">
                            <div className="w-24 h-24 rounded-lg border border-white/10 bg-black/40 overflow-hidden flex-shrink-0">
                                <img
                                    src={layer.imageUrl}
                                    alt={layer.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className={`
                                        px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                        ${layer.type === 'subject' ? 'bg-blue-500/20 text-blue-200' : ''}
                                        ${layer.type === 'background' ? 'bg-purple-500/20 text-purple-200' : ''}
                                        ${layer.type === 'effect' ? 'bg-orange-500/20 text-orange-200' : ''}
                                    `}>
                                        {layer.type}
                                    </span>
                                    <span className={`
                                        px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                        ${layer.blendMode === 'normal' ? 'bg-white/10 text-white/60' : 'bg-[rgba(255,62,0,0.2)] text-studio-accent'}
                                    `}>
                                        {layer.blendMode}
                                    </span>
                                </div>
                                <p className="text-sm text-white/70">
                                    This layer will be regenerated with your adjusted prompt while maintaining the same position and transforms.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Element Prompt */}
                    <div>
                        <label htmlFor="element-prompt" className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white/60 mb-2">
                            <Sparkles size={14} className="text-studio-neon" />
                            Element Description
                        </label>
                        <textarea
                            id="element-prompt"
                            value={elementPrompt}
                            onChange={(e) => setElementPrompt(e.target.value)}
                            placeholder="e.g., fierce dragon, lightning bolt, ornamental frame"
                            className="w-full rounded-xl bg-[var(--studio-bg)] border border-white/[0.05] px-4 py-3 text-sm text-white font-mono placeholder-white/30 focus:outline-none focus:border-studio-neon focus:shadow-[0_0_12px_rgba(0,255,65,0.3)] transition-all"
                            rows={2}
                            disabled={isGenerating}
                        />
                        <p className="mt-2 text-[10px] text-white/40 font-mono">
                            Core description of this element
                        </p>
                    </div>

                    {/* Adjustments */}
                    <div>
                        <label htmlFor="adjustments" className="text-xs font-mono uppercase tracking-wider text-white/60 mb-2 block">
                            Additional Adjustments (Optional)
                        </label>
                        <textarea
                            id="adjustments"
                            value={adjustments}
                            onChange={(e) => setAdjustments(e.target.value)}
                            placeholder="e.g., more detail, darker colors, add texture, simplify, sharper lines"
                            className="w-full rounded-xl bg-[var(--studio-bg)] border border-white/[0.05] px-4 py-3 text-sm text-white font-mono placeholder-white/30 focus:outline-none focus:border-studio-neon focus:shadow-[0_0_12px_rgba(0,255,65,0.3)] transition-all"
                            rows={2}
                            disabled={isGenerating}
                        />
                        <p className="mt-2 text-[10px] text-white/40 font-mono">
                            Refinements or style changes to apply
                        </p>
                    </div>

                    {/* Options */}
                    <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={useOriginalStyle}
                                onChange={(e) => setUseOriginalStyle(e.target.checked)}
                                disabled={isGenerating}
                                className="w-4 h-4 rounded border-white/20 bg-black/40 text-studio-neon focus:ring-2 focus:ring-[rgba(0,255,65,0.4)] focus:ring-offset-0 transition-all"
                            />
                            <div className="flex-1">
                                <span className="text-sm text-white font-medium group-hover:text-studio-neon transition-colors">
                                    Preserve original design style
                                </span>
                                <p className="text-[10px] text-white/50 mt-0.5">
                                    Maintains overall design aesthetic and visual coherence
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/40 bg-red-500/10">
                            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-red-200 font-medium">Regeneration Failed</p>
                                <p className="text-xs text-red-300/80 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="bg-[rgba(0,255,65,0.1)] border border-[rgba(0,255,65,0.3)] rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <Sparkles size={16} className="text-studio-neon flex-shrink-0 mt-0.5" />
                            <div className="text-[11px] text-white/70 space-y-1">
                                <p className="font-medium text-studio-neon">Smart Regeneration</p>
                                <p>The AI will regenerate this element while preserving layer position, transforms, and blend mode. Your version history will be updated automatically.</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            onClick={onClose}
                            disabled={isGenerating}
                            variant="outline"
                            className="flex-1 h-12 text-sm tracking-wider"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!elementPrompt.trim() || isGenerating}
                            variant="primary"
                            className="flex-1 h-12 text-sm tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                            icon={RefreshCw}
                        >
                            {isGenerating ? 'REGENERATING...' : 'REGENERATE ELEMENT'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
