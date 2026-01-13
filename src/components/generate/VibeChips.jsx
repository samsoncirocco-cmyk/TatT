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
                <h3 className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-4">
                    Suggested Vibes
                </h3>

                {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-ducks-green rounded-full animate-spin" />
                        Analyzing your vision...
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
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-600 mb-2">
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
                                    ? 'bg-ducks-green/10 text-ducks-green border-2 border-ducks-green shadow-glow-green'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/30 hover:bg-white/10'
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
