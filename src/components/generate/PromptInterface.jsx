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
                <label className="block text-[11px] font-mono uppercase tracking-[0.4em] text-white/50 mb-3 ml-1">
                    Describe Your Vision
                </label>
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Describe your vision... (e.g., An arcane dragon coiling around storm clouds)"
                    maxLength={maxLength}
                    className="w-full bg-transparent text-3xl md:text-5xl font-display font-bold text-white placeholder-white/10 border-b-2 border-white/10 focus:border-ducks-yellow focus:ring-0 outline-none transition-all resize-none py-6 leading-tight min-h-[120px]"
                    rows="2"
                />

                {/* Character Counter */}
                <div className={`absolute bottom-2 right-2 text-xs font-mono ${isOverLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-gray-600'
                    }`}>
                    {characterCount}/{maxLength}
                </div>
            </div>

            {/* Selected Chips Summary */}
            {selectedChips.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-mono text-gray-600 uppercase tracking-wider">
                        Selected Vibes:
                    </span>
                    {selectedChips.map((chip, index) => (
                        <span
                            key={index}
                            className="text-xs bg-ducks-green/10 text-ducks-green border border-ducks-green/30 px-2 py-1 rounded-lg font-medium"
                        >
                            {chip}
                        </span>
                    ))}
                </div>
            )}

        </div>
    );
}
