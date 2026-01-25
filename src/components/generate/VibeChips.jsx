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
        <div className="space-y-6 animate-fade-in">
            <div className="border-t border-white/5 pt-6">
                <h3 className="text-xs font-mono uppercase tracking-widest text-white/40 mb-4">
                    Studio Suggestions
                </h3>

                {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-white/50">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-studio-neon rounded-full animate-spin" />
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
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-2">
                {title}
            </p>
            <div className="flex flex-wrap gap-2">
                {chips.map((chip, index) => {
                    const isSelected = selectedChips.includes(chip);
                    return (
                        <button
                            key={index}
                            onClick={() => onChipClick(chip)}
                            className={`
                px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${isSelected
                                    ? 'bg-[rgba(0,255,65,0.12)] text-studio-neon border-2 border-studio-neon shadow-[0_0_18px_rgba(0,255,65,0.3)]'
                                    : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/30 hover:bg-white/10'
                                }
              `}
                        >
                            <span className="flex items-center gap-2">
                                {chip}
                                {isSelected && <Check size={14} />}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
