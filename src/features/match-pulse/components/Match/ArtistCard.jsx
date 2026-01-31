/**
 * Artist Card Component
 *
 * Displays an individual artist match with score breakdown and interaction.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ArtistCard({ artist, rank, matchScore, matchReasons }) {
    const [showTooltip, setShowTooltip] = useState(false);

    // Calculate score breakdown
    const scoreBreakdown = matchReasons || {
        visual: matchScore * 0.4,
        style: matchScore * 0.25,
        location: matchScore * 0.20,
        budget: matchScore * 0.10,
        variety: matchScore * 0.05
    };

    const totalScore = Math.round(matchScore * 100);

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-ducks-green/20 hover:border-ducks-green/50 transition-all cursor-pointer group"
            onClick={() => {
                // TODO: Open artist profile modal
                console.log('Open artist profile:', artist.id);
            }}
        >
            {/* Rank Badge */}
            <div className="absolute -top-2 -left-2 w-8 h-8 bg-ducks-green rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {rank}
            </div>

            {/* Artist Info */}
            <div className="flex items-start gap-4 mb-3">
                {/* Avatar */}
                <div className="relative">
                    <img
                        src={artist.profileImage || '/default-avatar.png'}
                        alt={artist.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-ducks-green/30"
                    />
                    {/* Online indicator */}
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900" />
                </div>

                {/* Name & Location */}
                <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg group-hover:text-ducks-yellow transition-colors">
                        {artist.name}
                    </h3>
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {artist.location || 'Location unknown'}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                        {artist.specialties?.join(', ') || 'Tattoo Artist'}
                    </p>
                </div>

                {/* Match Score */}
                <div className="text-right">
                    <div className="text-3xl font-bold text-ducks-yellow">
                        {totalScore}
                    </div>
                    <div className="text-xs text-gray-500">Match</div>
                </div>
            </div>

            {/* Score Bar */}
            <div className="mb-3">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${totalScore}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-ducks-green to-ducks-yellow"
                    />
                </div>
            </div>

            {/* Why This Artist? Tooltip */}
            <div className="relative">
                <button
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="text-xs text-ducks-green hover:text-ducks-yellow flex items-center gap-1 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Why this artist?
                </button>

                {/* Tooltip */}
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 border border-ducks-green/30 rounded-lg p-3 shadow-xl z-10"
                    >
                        <div className="text-xs space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Visual Similarity</span>
                                <span className="text-ducks-green font-semibold">
                                    {Math.round(scoreBreakdown.visual * 100)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Style Match</span>
                                <span className="text-ducks-green font-semibold">
                                    {Math.round(scoreBreakdown.style * 100)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Location</span>
                                <span className="text-ducks-green font-semibold">
                                    {Math.round(scoreBreakdown.location * 100)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Budget Fit</span>
                                <span className="text-ducks-green font-semibold">
                                    {Math.round(scoreBreakdown.budget * 100)}%
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Portfolio Preview */}
            {artist.portfolioImages && artist.portfolioImages.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                    {artist.portfolioImages.slice(0, 3).map((img, idx) => (
                        <img
                            key={idx}
                            src={img}
                            alt={`${artist.name} portfolio ${idx + 1}`}
                            className="w-16 h-16 rounded object-cover border border-gray-700 hover:border-ducks-green/50 transition-colors"
                        />
                    ))}
                    {artist.portfolioImages.length > 3 && (
                        <div className="w-16 h-16 rounded bg-gray-700 flex items-center justify-center text-gray-400 text-xs">
                            +{artist.portfolioImages.length - 3}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
