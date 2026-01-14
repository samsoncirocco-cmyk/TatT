/**
 * Empty Match State Component (Reskinned)
 * 
 * Displays when semantic artist matching returns no results.
 * Provides actionable suggestions to help users refine their search.
 */

function EmptyMatchState({ searchParams, onAdjustFilters, onStartOver }) {
    const { query, location, styles = [], radius = 25 } = searchParams;

    const suggestions = [];

    // Generate contextual suggestions
    if (radius < 50) {
        suggestions.push({
            icon: 'RAD',
            title: 'Expand search radius',
            description: `Broaden scan from ${radius} to 50 miles`,
            action: 'increase_radius'
        });
    }

    if (styles.length > 2) {
        suggestions.push({
            icon: 'STYLE',
            title: 'Refine Style Params',
            description: `Reduce complexity from ${styles.length} filters`,
            action: 'reduce_styles'
        });
    }

    if (location) {
        suggestions.push({
            icon: 'AREA',
            title: 'Relocate Sensor',
            description: 'Target adjacent metro areas',
            action: 'change_location'
        });
    }

    suggestions.push({
        icon: 'QUERY',
        title: 'Query Optimization',
        description: 'Simplify keyword parameters',
        action: 'change_query'
    });

    return (
        <div className="min-h-[400px] flex items-center justify-center p-8 md:p-12">
            <div className="max-w-xl w-full text-center">
                {/* Empty State Icon */}
                <div className="mb-8">
                    <div className="w-24 h-24 mx-auto bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-glow">
                        <svg
                            className="w-10 h-10 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Main Message */}
                <h2 className="text-3xl font-display font-bold text-white mb-3 tracking-tight">
                    Void Result
                </h2>
                <p className="text-gray-400 mb-10 font-light max-w-sm mx-auto">
                    Biometric scan returned 0 matching artist profiles in the current sector.
                </p>

                {/* Suggestions */}
                <div className="mb-10 text-left">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-ducks-green mb-4 ml-1">
                        Recommended Protocols
                    </h3>
                    <div className="grid gap-3">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => onAdjustFilters(suggestion.action)}
                                className="glass-panel border border-white/5 hover:border-ducks-green/30 rounded-xl p-4 text-left transition-all group active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-white/60">
                                        {suggestion.icon}
                                    </span>
                                    <div className="flex-1">
                                        <h4 className="text-white font-bold text-sm mb-0.5 group-hover:text-ducks-green transition-colors">
                                            {suggestion.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 font-mono">
                                            {suggestion.description}
                                        </p>
                                    </div>
                                    <svg
                                        className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => onAdjustFilters('manual')}
                        className="px-8 py-4 bg-white text-black font-black rounded-xl transition-all shadow-xl hover:scale-[1.02] uppercase text-xs tracking-widest"
                    >
                        Manual Override
                    </button>
                    <button
                        onClick={onStartOver}
                        className="px-8 py-4 bg-transparent border border-white/10 hover:bg-white/5 text-white font-bold rounded-xl transition-all uppercase text-xs tracking-widest"
                    >
                        Reset All
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EmptyMatchState;
