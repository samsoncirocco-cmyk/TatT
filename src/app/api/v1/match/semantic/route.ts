import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { findMatchingArtists, type MatchResult } from '@/features/match-pulse/services/hybridMatchService';

// Edge runtime compatible (Neo4j driver is accessed via HTTP proxy service)
export const runtime = 'edge';

export async function POST(req: NextRequest) {
    // Auth check
    const authError = verifyApiAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const {
            query,
            location,
            style_preferences = [],
            budget,
            radius = 25,
            max_results = 10
        } = body;

        // Build preferences object
        const preferences = {
            location: location || null,
            styles: style_preferences,
            budget: budget || null,
            distance: radius
        };

        // Execute hybrid matching
        const startTime = Date.now();
        const result: MatchResult = await findMatchingArtists(query, preferences, max_results);
        const duration = Date.now() - startTime;

        console.log(`[API] Semantic match completed in ${duration}ms, found ${result.matches.length} matches`);

        return NextResponse.json({
            success: true,
            matches: result.matches,
            total_candidates: result.totalCandidates,
            query_info: result.queryInfo,
            performance: {
                duration_ms: duration
            }
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[API] Semantic match error:', message);
        return NextResponse.json({ error: 'Semantic matching failed', details: message }, { status: 500 });
    }
}
