/**
 * Demo-Ready Matching Service
 * 
 * Provides artist matching for YC demo using graph-only approach.
 * Can be enhanced with vector embeddings post-demo.
 */

import { findMatchingArtists as graphMatch } from './neo4jService.js';

/**
 * Find matching artists for a design (Demo version)
 * Uses graph-based matching without vector embeddings
 * 
 * @param {Object} design - Current design object
 * @param {Object} preferences - User preferences
 * @returns {Promise<Array>} Top 5 matching artists
 */
export async function findMatchingArtistsForDemo(design, preferences = {}) {
    try {
        console.log('[DemoMatch] Finding artists for design:', design.style);

        // Build query preferences from design
        const queryPrefs = {
            styles: [design.style],
            bodyPart: design.bodyPart,
            location: preferences.location || null,
            budget: preferences.budget || null,
            maxResults: 20
        };

        // Execute graph query
        const graphResults = await graphMatch(queryPrefs);

        // Score each artist
        const scoredArtists = graphResults.map(artist => {
            // Calculate scores
            const styleScore = calculateStyleMatch(artist, design);
            const locationScore = calculateLocationScore(artist, preferences);
            const budgetScore = calculateBudgetScore(artist, preferences);
            const varietyScore = Math.random() * 0.1; // Small random factor

            // Weighted composite score
            const compositeScore =
                styleScore * 0.50 +        // 50% style match
                locationScore * 0.25 +     // 25% location
                budgetScore * 0.15 +       // 15% budget
                varietyScore * 0.10;       // 10% variety

            return {
                ...artist,
                score: compositeScore,
                reasons: {
                    visual: compositeScore * 0.4,  // Mock visual similarity
                    style: styleScore,
                    location: locationScore,
                    budget: budgetScore,
                    variety: varietyScore
                }
            };
        });

        // Sort and return top 5
        const topMatches = scoredArtists
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        console.log(`[DemoMatch] Found ${topMatches.length} matches`);

        return topMatches;

    } catch (error) {
        console.error('[DemoMatch] Error finding matches:', error);

        // Return mock data as fallback
        return getMockMatches(design);
    }
}

/**
 * Calculate style match score
 */
function calculateStyleMatch(artist, design) {
    if (!artist.styles || !design.style) return 0.5;

    const hasStyle = artist.styles.some(s =>
        s.toLowerCase() === design.style.toLowerCase()
    );

    return hasStyle ? 1.0 : 0.3;
}

/**
 * Calculate location score
 */
function calculateLocationScore(artist, preferences) {
    if (!preferences.location || !artist.city) return 0.5;

    const userLoc = preferences.location.toLowerCase();
    const artistLoc = artist.city.toLowerCase();

    if (artistLoc === userLoc) return 1.0;
    if (artistLoc.includes(userLoc) || userLoc.includes(artistLoc)) return 0.7;
    return 0.3;
}

/**
 * Calculate budget score
 */
function calculateBudgetScore(artist, preferences) {
    if (!preferences.budget || !artist.hourlyRate) return 0.5;

    const rate = artist.hourlyRate;
    const budget = preferences.budget;

    if (rate <= budget) return 1.0;
    if (rate <= budget * 1.5) return 0.6;
    return 0.2;
}

/**
 * Get mock matches as fallback
 */
function getMockMatches(design) {
    return [
        {
            id: 'mock-1',
            name: 'Alex Rivera',
            city: 'Los Angeles, CA',
            styles: [design.style, 'traditional'],
            hourlyRate: 150,
            profileImage: 'https://i.pravatar.cc/150?img=1',
            portfolioImages: [
                'https://images.unsplash.com/photo-1565058379802-bbe93b2f703f?w=400',
                'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=400',
                'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400'
            ],
            specialties: [design.style, 'custom designs'],
            score: 0.92,
            reasons: {
                visual: 0.37,
                style: 0.92,
                location: 0.85,
                budget: 0.90,
                variety: 0.05
            }
        },
        {
            id: 'mock-2',
            name: 'Jordan Chen',
            city: 'San Francisco, CA',
            styles: [design.style, 'neo-traditional'],
            hourlyRate: 175,
            profileImage: 'https://i.pravatar.cc/150?img=2',
            portfolioImages: [
                'https://images.unsplash.com/photo-1590246814883-57c511e76729?w=400'
            ],
            specialties: [design.style, 'color work'],
            score: 0.88,
            reasons: {
                visual: 0.35,
                style: 0.88,
                location: 0.75,
                budget: 0.85,
                variety: 0.08
            }
        },
        {
            id: 'mock-3',
            name: 'Sam Taylor',
            city: 'Portland, OR',
            styles: [design.style],
            hourlyRate: 125,
            profileImage: 'https://i.pravatar.cc/150?img=3',
            portfolioImages: [],
            specialties: [design.style],
            score: 0.85,
            reasons: {
                visual: 0.34,
                style: 0.85,
                location: 0.65,
                budget: 1.0,
                variety: 0.03
            }
        },
        {
            id: 'mock-4',
            name: 'Morgan Lee',
            city: 'Seattle, WA',
            styles: [design.style, 'blackwork'],
            hourlyRate: 200,
            profileImage: 'https://i.pravatar.cc/150?img=4',
            portfolioImages: [],
            specialties: [design.style, 'large pieces'],
            score: 0.82,
            reasons: {
                visual: 0.33,
                style: 0.82,
                location: 0.70,
                budget: 0.60,
                variety: 0.06
            }
        },
        {
            id: 'mock-5',
            name: 'Casey Brooks',
            city: 'Austin, TX',
            styles: [design.style],
            hourlyRate: 140,
            profileImage: 'https://i.pravatar.cc/150?img=5',
            portfolioImages: [],
            specialties: [design.style],
            score: 0.78,
            reasons: {
                visual: 0.31,
                style: 0.78,
                location: 0.50,
                budget: 0.95,
                variety: 0.04
            }
        }
    ];
}

export default {
    findMatchingArtistsForDemo,
    getMockMatches
};
