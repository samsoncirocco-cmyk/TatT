/**
 * Empty Match State Component
 * 
 * Displays when semantic artist matching returns no results.
 * Provides actionable suggestions to help users refine their search.
 */

import { useState } from 'react';

function EmptyMatchState({ searchParams, onAdjustFilters, onStartOver }) {
    const { query, location, styles = [], radius = 25 } = searchParams;

    const suggestions = [];

    // Generate contextual suggestions
    if (radius < 50) {
        suggestions.push({
            icon: '📍',
            title: 'Expand your search area',
            description: `Try increasing radius from ${radius} to 50 miles`,
            action: 'increase_radius'
        });
    }

    if (styles.length > 2) {
        suggestions.push({
            icon: '🎨',
            title: 'Broaden style preferences',
            description: `Remove some of your ${styles.length} style filters`,
            action: 'reduce_styles'
        });
    }

    if (location) {
        suggestions.push({
            icon: '🌎',
            title: 'Try a different location',
            description: 'Search in a nearby city or remove location filter',
            action: 'change_location'
        });
    }

    suggestions.push({
        icon: '🔍',
        title: 'Refine your search',
        description: 'Try different keywords or a simpler description',
        action: 'change_query'
    });

    return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
            <div className="max-w-2xl w-full text-center">
                {/* Empty State Icon */}
                <div className="mb-6">
                    <div className="w-24 h-24 mx-auto bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                        <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Main Message */}
                <h2 className="text-2xl font-bold text-white mb-3">
                    No Artists Found
                </h2>
                <p className="text-gray-400 mb-8">
                    We couldn't find any artists matching your search criteria.
                </p>

                {/* Current Search Summary */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-left">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
                        Your Search
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-3">
                            <span className="text-gray-500 min-w-[80px]">Query:</span>
                            <span className="text-white font-medium">{query}</span>
                        </div>
                        {location && (
                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 min-w-[80px]">Location:</span>
                                <span className="text-white">{location} ({radius} miles)</span>
                            </div>
                        )}
                        {styles.length > 0 && (
                            <div className="flex items-start gap-3">
                                <span className="text-gray-500 min-w-[80px]">Styles:</span>
                                <span className="text-white">{styles.join(', ')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Suggestions */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
                        Try These Suggestions
                    </h3>
                    <div className="grid gap-3">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => onAdjustFilters(suggestion.action)}
                                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/50 rounded-xl p-4 text-left transition-all group"
                            >
                                <div className="flex items-start gap-4">
                                    <span className="text-2xl">{suggestion.icon}</span>
                                    <div className="flex-1">
                                        <h4 className="text-white font-semibold mb-1 group-hover:text-green-400 transition-colors">
                                            {suggestion.title}
                                        </h4>
                                        <p className="text-sm text-gray-400">
                                            {suggestion.description}
                                        </p>
                                    </div>
                                    <svg
                                        className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-colors"
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
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => onAdjustFilters('manual')}
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-green-500/30 uppercase text-sm tracking-wider"
                    >
                        Adjust Filters
                    </button>
                    <button
                        onClick={onStartOver}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all uppercase text-sm tracking-wider"
                    >
                        Start Over
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EmptyMatchState;
