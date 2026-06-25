/**
 * VibeChips Component
 * 
 * Dynamic chip suggestion and selection system
 */

import { Check } from 'lucide-react';

export default function VibeChips({
    suggestions = { style: [], element: [], mood: [] },
    selectedChips = [],
    onChipSelect,
    isLoading = false
}) {
    const hasAnySuggestions =
        suggestions.style.length > 0 ||
        suggestions.element.length > 0 ||
        suggestions.mood.length > 0;

    if (!hasAnySuggestions && !isLoading) {
        return null;
    }

    const isChipSelected = (chip) => selectedChips.includes(chip);

    const handleChipClick = (chip, category) => {
        onChipSelect(chip, category);
    };

    return (
        <div className="space-y-6">
            <div className="border-t-2 hairline pt-6">
                <h3 className="text-[10px] font-body uppercase tracking-[0.28em] text-pink mb-4">
                    <span className="text-pink">●</span>&nbsp;&nbsp;Studio Suggestions
                </h3>

                {isLoading && (
                    <div className="flex items-center gap-2 text-[11px] font-body uppercase tracking-[0.22em] text-white/60">
                        <div className="w-3 h-3 border-2 border-white/20 border-t-pink rounded-full animate-spin" />
                        Thinking about your idea...
                    </div>
                )}

                {!isLoading && (
                    <div className="space-y-4">
                        {/* Style Chips */}
                        {suggestions.style.length > 0 && (
                            <ChipCategory
                                title="Style"
                                chips={suggestions.style}
                                selectedChips={selectedChips}
                                onChipClick={(chip) => handleChipClick(chip, 'style')}
                            />
                        )}

                        {/* Element Chips */}
                        {suggestions.element.length > 0 && (
                            <ChipCategory
                                title="Elements"
                                chips={suggestions.element}
                                selectedChips={selectedChips}
                                onChipClick={(chip) => handleChipClick(chip, 'element')}
                            />
                        )}

                        {/* Mood Chips */}
                        {suggestions.mood.length > 0 && (
                            <ChipCategory
                                title="Mood"
                                chips={suggestions.mood}
                                selectedChips={selectedChips}
                                onChipClick={(chip) => handleChipClick(chip, 'mood')}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ChipCategory({ title, chips, selectedChips, onChipClick }) {
    return (
        <div>
            <p className="text-[10px] font-body uppercase tracking-[0.25em] text-white/50 mb-2">
                {title}
            </p>
            <div className="flex flex-wrap gap-2">
                {chips.map((chip, index) => {
                    const isSelected = selectedChips.includes(chip);
                    return (
                        <button
                            key={index}
                            onClick={() => onChipClick(chip)}
                            className={`press px-3 py-2 text-[10px] font-body uppercase tracking-[0.2em] transition-colors
                                ${isSelected
                                    ? 'bg-pink text-black border-2 border-pink'
                                    : 'bg-black text-white/70 border hairline hover:text-black hover:bg-pink hover:border-pink'
                                }
                            `}
                        >
                            <span className="flex items-center gap-2">
                                {chip}
                                {isSelected && <Check size={12} />}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
