import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMatchStore, ArtistMatch } from '@/store/useMatchStore';
import { SlideUp, FadeIn } from '../shared/Motion';
import MatchSkeleton from './MatchSkeleton';
import { Heart, MapPin, Instagram, ExternalLink, X, ChevronRight, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function MatchPulse() {
    const { matches, isLoading, selectMatch, currentMatchId, error } = useMatchStore();
    const [selectedArtist, setSelectedArtist] = useState<ArtistMatch | null>(null);
    const router = useRouter();

    // Sync selectedArtist with currentMatchId
    useEffect(() => {
        if (currentMatchId) {
            const match = matches.find(m => m.artistId === currentMatchId);
            if (match) setSelectedArtist(match);
        } else {
            setSelectedArtist(null);
        }
    }, [currentMatchId, matches]);

    const handleCloseModal = () => {
        selectMatch(null);
    };

    const handleSelect = (match: ArtistMatch) => {
        selectMatch(match.artistId);
    };

    if (isLoading) {
        return <MatchSkeleton />;
    }

    if (matches.length === 0) {
        return (
            <FadeIn className="w-full p-8 text-center text-gray-500">
                <p>No matches found yet. Start a design to find artists.</p>
            </FadeIn>
        );
    }

    return (
        <div className="relative w-full max-w-md mx-auto h-full overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 no-scrollbar">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Matches</h3>
                    <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                        {matches.length} found
                    </span>
                </div>

                {error && (
                    <div className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                        {error}
                    </div>
                )}

                <AnimatePresence>
                    {matches.map((match, index) => (
                        <SlideUp key={match.artistId} delay={index * 0.1}>
                            <div
                                onClick={() => handleSelect(match)}
                                className="group relative bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-900 transition-all cursor-pointer"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Artist Image / Avatar */}
                                    <div className="relative w-16 h-16 flex-shrink-0">
                                        {match.imageUrl ? (
                                            <img
                                                src={match.imageUrl}
                                                alt={match.artistName}
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                                {match.artistName.charAt(0)}
                                            </div>
                                        )}
                                        {/* Match Score Badge */}
                                        <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-900 p-0.5 rounded-full">
                                            <div className={`
                            flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border-2
                            ${match.matchScore >= 90 ? 'border-green-500 text-green-600' :
                                                    match.matchScore >= 80 ? 'border-blue-500 text-blue-600' : 'border-yellow-500 text-yellow-600'}
                        `}>
                                                {Math.round(match.matchScore)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate pr-2">{match.artistName}</h4>
                                            <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>

                                        {match.location && (
                                            <p className="flex items-center text-xs text-gray-500 mt-1">
                                                <MapPin className="w-3 h-3 mr-1" />
                                                {match.location}
                                                {match.distance && <span className="ml-1 opacity-75">({Math.round(match.distance)}km)</span>}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {match.styles?.slice(0, 3).map(style => (
                                                <span key={style} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                                    {style}
                                                </span>
                                            ))}
                                        </div>

                                        {match.reasoning && (
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-2">
                                                <Info className="w-3 h-3" />
                                                <span title={match.reasoning}>Why this artist?</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </SlideUp>
                    ))}
                </AnimatePresence>
            </div>

            <div className="px-4 pb-4">
                <button
                    onClick={() => router.push('/artists')}
                    className="w-full text-xs font-semibold bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                    Find More
                </button>
            </div>

            {/* Artist Profile Modal (Slide Up) */}
            <AnimatePresence>
                {selectedArtist && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="absolute inset-x-0 bottom-0 h-[85%] bg-white dark:bg-gray-900 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 border-t border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
                    >
                        {/* Drag Handle */}
                        <div onClick={handleCloseModal} className="w-full flex justify-center pt-3 pb-1 cursor-pointer">
                            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-6 py-4 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedArtist.artistName}</h2>
                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {selectedArtist.location || 'Unknown Location'}
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 pb-20">
                            {/* Compatibility Score */}
                            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-purple-700 dark:text-purple-300">Match Compatibility</span>
                                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Math.round(selectedArtist.matchScore)}%</span>
                                </div>
                                <div className="w-full bg-purple-200 dark:bg-purple-800 h-2 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${selectedArtist.matchScore}%` }}
                                        transition={{ duration: 1, delay: 0.2 }}
                                        className="h-full bg-purple-600"
                                    />
                                </div>
                                <p className="text-sm text-purple-600/80 dark:text-purple-400/80 mt-2">
                                    High match based on style ({selectedArtist.styles?.[0]}) and location.
                                </p>
                            </div>

                            {selectedArtist.breakdown && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Match Breakdown</h3>
                                    <div className="space-y-2">
                                        {Object.entries(selectedArtist.breakdown).map(([key, value]) => (
                                            <div key={key} className="text-xs text-gray-600 dark:text-gray-400">
                                                <div className="flex justify-between mb-1">
                                                    <span className="capitalize">{key}</span>
                                                    <span>{Math.round((value as number) * 100)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-500"
                                                        style={{ width: `${(value as number) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedArtist.reasoning && (
                                <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Why this artist?</h3>
                                    <p>{selectedArtist.reasoning}</p>
                                </div>
                            )}

                            {/* Bio */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">About</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                    {selectedArtist.bio || "No bio available for this artist yet. They specialize in " + (selectedArtist.styles?.join(', ') || 'various styles') + "."}
                                </p>
                            </div>

                            {/* Tags/Styles */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Specialties</h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedArtist.styles?.map(style => (
                                        <span key={style} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
                                            {style}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <button className="flex items-center justify-center gap-2 py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <Instagram className="w-5 h-5" />
                                    Portfolio
                                </button>
                                <button className="flex items-center justify-center gap-2 py-3 px-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                                    Contact Artist
                                    <ExternalLink className="w-4 h-4 ml-1" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
