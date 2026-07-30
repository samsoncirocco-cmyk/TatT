/**
 * Regenerate Element Modal
 *
 * Modal for regenerating a specific layer with adjusted prompt
 * Matches The Forge's dark industrial aesthetic
 */

import { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 bg-black/80 halftone flex items-center justify-center p-4">
            <div className="bg-black border-2 border-pink w-full max-w-2xl max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b-2 hairline bg-black">
                    <div>
                        <h3 className="text-[16px] font-display tracking-wide text-white uppercase">
                            <span className="text-pink">●</span>&nbsp;&nbsp;Regenerate Element
                        </h3>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/50 font-body">
                            Layer: {layer.name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="text-[10px] font-body uppercase tracking-[0.22em] text-white/60 hover:text-pink disabled:opacity-50"
                        aria-label="Close regenerate modal"
                    >
                        Close ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Current Layer Preview */}
                    <div className="border-2 hairline p-4">
                        <p className="text-[10px] font-body uppercase tracking-[0.28em] text-pink mb-3">
                            <span className="text-pink">●</span>&nbsp;&nbsp;Current Element
                        </p>
                        <div className="flex items-start gap-4">
                            <div className="w-24 h-24 border hairline-white bg-black overflow-hidden flex-shrink-0">
                                <img
                                    src={layer.imageUrl}
                                    alt={layer.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-pink text-black text-[10px] font-body uppercase tracking-[0.2em]">
                                        {layer.type}
                                    </span>
                                    <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-[0.2em] ${
                                        layer.blendMode === 'normal'
                                            ? 'bg-white/10 text-white/60'
                                            : 'border hairline text-pink'
                                    }`}>
                                        {layer.blendMode}
                                    </span>
                                </div>
                                <p className="text-[13px] text-white/70 font-body leading-[1.55]">
                                    This layer will be regenerated with your adjusted prompt while maintaining the same position and transforms.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Element Prompt */}
                    <div>
                        <label htmlFor="element-prompt" className="block text-[10px] font-body uppercase tracking-[0.25em] text-pink mb-2">
                            ▸ Element Description
                        </label>
                        <textarea
                            id="element-prompt"
                            value={elementPrompt}
                            onChange={(e) => setElementPrompt(e.target.value)}
                            placeholder="e.g., fierce dragon, lightning bolt, ornamental frame"
                            className="w-full bg-black border-2 hairline focus:border-pink px-4 py-3 text-[14px] text-white font-display tracking-tight focus:outline-none placeholder-white/30 transition-colors"
                            rows={2}
                            disabled={isGenerating}
                        />
                        <p className="mt-2 text-[10px] text-white/40 font-body uppercase tracking-[0.18em]">
                            Core description of this element
                        </p>
                    </div>

                    {/* Adjustments */}
                    <div>
                        <label htmlFor="adjustments" className="block text-[10px] font-body uppercase tracking-[0.25em] text-pink mb-2">
                            ▸ Additional Adjustments (Optional)
                        </label>
                        <textarea
                            id="adjustments"
                            value={adjustments}
                            onChange={(e) => setAdjustments(e.target.value)}
                            placeholder="e.g., more detail, darker colors, add texture, simplify, sharper lines"
                            className="w-full bg-black border-2 hairline focus:border-pink px-4 py-3 text-[14px] text-white font-display tracking-tight focus:outline-none placeholder-white/30 transition-colors"
                            rows={2}
                            disabled={isGenerating}
                        />
                        <p className="mt-2 text-[10px] text-white/40 font-body uppercase tracking-[0.18em]">
                            Refinements or style changes to apply
                        </p>
                    </div>

                    {/* Options */}
                    <div className="border hairline-white p-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={useOriginalStyle}
                                onChange={(e) => setUseOriginalStyle(e.target.checked)}
                                disabled={isGenerating}
                                className="w-4 h-4 border-white/20 bg-black accent-[#ff1f6b] focus:ring-2 focus:ring-pink focus:ring-offset-0"
                            />
                            <div className="flex-1">
                                <span className="text-[13px] text-white font-body group-hover:text-pink transition-colors">
                                    Preserve original design style
                                </span>
                                <p className="text-[10px] text-white/50 mt-0.5 font-body uppercase tracking-[0.18em]">
                                    Maintains overall design aesthetic and visual coherence
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 border-2 border-pink">
                            <AlertCircle size={18} className="text-pink flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-[12px] text-pink font-body uppercase tracking-[0.18em]">Regeneration Failed</p>
                                <p className="text-[11px] text-white/70 mt-1 font-body">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="border hairline p-4">
                        <div className="flex items-start gap-3">
                            <Sparkles size={16} className="text-pink flex-shrink-0 mt-0.5" />
                            <div className="text-[11px] text-white/70 space-y-1 font-body leading-[1.55]">
                                <p className="text-pink uppercase tracking-[0.18em] text-[10px]">Smart Regeneration</p>
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
                            size="lg"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!elementPrompt.trim() || isGenerating}
                            variant="primary"
                            size="lg"
                            className="flex-1"
                            icon={RefreshCw}
                        >
                            {isGenerating ? 'Regenerating...' : 'Regenerate Element'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
