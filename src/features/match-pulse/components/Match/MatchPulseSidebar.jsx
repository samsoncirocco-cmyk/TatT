/**
 * Match Pulse Sidebar Component
 * 
 * Real-time artist matching sidebar that updates as the user edits their design.
 * Shows top 5 matching artists with visual similarity, style alignment, and location.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToMatches } from '@/services/firebase-match-service';
import { requestMatchUpdate } from '../../services/matchUpdateService';
import ArtistCard from './ArtistCard';

export default function MatchPulseSidebar({ userId, currentDesign }) {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        if (!userId) return;

        setLoading(true);

        // Subscribe to real-time match updates
        const unsubscribe = subscribeToMatches(userId, (matchData) => {
            if (matchData && matchData.artists) {
                setMatches(matchData.artists);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [userId]);

    // Update matches when design changes (debounced in parent)
    useEffect(() => {
        if (!userId || !currentDesign) return;

        const updateMatchesDebounced = setTimeout(async () => {
            try {
                const response = await requestMatchUpdate({
                    userId,
                    designId: currentDesign.id,
                    prompt: currentDesign.prompt,
                    style: currentDesign.style,
                    bodyPart: currentDesign.bodyPart,
                    location: currentDesign.location,
                    budget: currentDesign.budget
                });

                if (response?.artists) {
                    setMatches(response.artists);
                    setLoading(false);
                }
            } catch (error) {
                console.error('[MatchPulse] Failed to update matches:', error);
            }
        }, 2000); // 2s debounce

        return () => clearTimeout(updateMatchesDebounced);
    }, [userId, currentDesign]);

    return (
        <motion.div
            initial={{ x: 400 }}
            animate={{ x: isOpen ? 0 : 360 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-96 bg-gradient-to-b from-gray-900 to-black border-l border-ducks-green/30 shadow-2xl z-50"
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute -left-12 top-1/2 -translate-y-1/2 bg-ducks-green hover:bg-ducks-green/90 text-white px-3 py-6 rounded-l-lg shadow-lg transition-colors"
                aria-label={isOpen ? 'Close Match Pulse' : 'Open Match Pulse'}
            >
                <motion.div
                    animate={{ rotate: isOpen ? 0 : 180 }}
                    transition={{ duration: 0.3 }}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </motion.div>
            </button>

            {/* Header */}
            <div className="p-6 border-b border-ducks-green/20">
                <div className="flex items-center gap-3 mb-2">
                    <div className="relative">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Match Pulse</h2>
                </div>
                <p className="text-gray-400 text-sm">
                    Real-time artist recommendations
                </p>
            </div>

            {/* Content */}
            <div className="overflow-y-auto h-[calc(100vh-120px)] p-6">
                {loading ? (
                    <LoadingState />
                ) : matches.length === 0 ? (
                    <EmptyState />
                ) : (
                    <AnimatePresence mode="popLayout">
                        {matches.map((artist, index) => (
                            <motion.div
                                key={artist.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.1 }}
                                className="mb-4"
                            >
                                <ArtistCard
                                    artist={artist}
                                    rank={index + 1}
                                    matchScore={artist.score}
                                    matchReasons={artist.reasons}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </motion.div>
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 border-4 border-ducks-green/30 border-t-ducks-green rounded-full mb-4"
            />
            <p className="text-sm">Finding perfect matches...</p>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center px-4">
            <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-lg font-semibold mb-2">No matches yet</p>
            <p className="text-sm">
                Generate a design to see artist recommendations
            </p>
        </div>
    );
}
