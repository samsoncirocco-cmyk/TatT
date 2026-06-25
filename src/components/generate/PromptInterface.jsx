/**
 * PromptInterface Component
 * 
 * Main prompt input with auto-resize, character counter, and enhancement button
 */

import { useRef, useEffect } from 'react';

export default function PromptInterface({
    value,
    onChange,
    selectedChips = [],
    maxLength = 500
}) {
    const textareaRef = useRef(null);

    // Auto-resize textarea based on content
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`;
        }
    }, [value]);

    const characterCount = value.length;
    const isNearLimit = characterCount > maxLength * 0.8;
    const isOverLimit = characterCount > maxLength;

    return (
        <div className="space-y-4">
            {/* Main Textarea */}
            <div className="relative group">
                <label className="block text-[10px] font-body uppercase tracking-[0.28em] text-pink mb-3 ml-1">
                    ▸ What are we dreaming up today?
                </label>
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder='Try: "A samurai cat on a surfboard" or "Gohan fighting Cell in the rain"'
                    maxLength={maxLength}
                    className="w-full bg-black text-white placeholder-white/30 resize-none focus:outline-none text-[20px] md:text-[24px] leading-[1.4] tracking-tight border-2 hairline focus:border-pink p-5 transition-colors font-display"
                    rows="2"
                />

                {/* Character Counter */}
                <div className={`absolute bottom-3 right-3 text-[10px] font-body uppercase tracking-[0.18em] tabular-nums ${isOverLimit ? 'text-pink' : isNearLimit ? 'text-pink/70' : 'text-white/40'}`}>
                    {characterCount}/{maxLength}
                </div>
            </div>

            {/* Selected Chips Summary */}
            {selectedChips.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-body text-white/50 uppercase tracking-[0.25em]">
                        Picked vibes:
                    </span>
                    {selectedChips.map((chip, index) => (
                        <span
                            key={index}
                            className="text-[10px] bg-pink text-black border-2 border-pink px-2 py-1 font-body uppercase tracking-[0.18em]"
                        >
                            {chip}
                        </span>
                    ))}
                </div>
            )}

        </div>
    );
}
