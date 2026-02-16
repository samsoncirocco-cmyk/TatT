import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, getUserFromRequest } from '@/lib/api-auth';
import { findMatchingArtists } from '@/services/hybridMatchService';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { createRequestLogger } from '@/lib/logger';
import { logMatchResults } from '@/services/match-tracking';

// Edge runtime compatible (Neo4j driver is accessed via HTTP proxy service)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const reqLogger = createRequestLogger('match/semantic');

    // Auth check
    const authError = verifyApiAuth(req);
    if (authError) return authError;

    const rateResult = await checkRateLimit(req, 'matching');
    if (!rateResult.allowed) {
        return rateLimitResponse(rateResult);
    }

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

        // Log match start
        reqLogger.start('match.semantic.started', {
            query_length: query?.length || 0,
            has_location: !!location,
            style_count: style_preferences.length,
            max_results,
        });

        // Execute hybrid matching
        const startTime = Date.now();
        const result = await findMatchingArtists(query, preferences, max_results) as any;
        const duration = Date.now() - startTime;

        // Log match completion
        reqLogger.complete('match.semantic.completed', {
            match_count: result.matches?.length || 0,
            total_candidates: result.totalCandidates || 0,
            sources: result.queryInfo?.sources || [],
        });

        // Log match results for analytics (fire-and-forget)
        const user = await getUserFromRequest(req);
        if (user && result.matches) {
            const topScores = result.matches
                .map((m: any) => m.score || 0)
                .slice(0, 5);
            logMatchResults({
                userId: user.uid,
                query: query || '',
                matchCount: result.matches.length,
                topScores,
                sources: result.queryInfo?.sources || [],
            });
        }

        return NextResponse.json({
            success: true,
            matches: result.matches,
            total_candidates: result.totalCandidates,
            query_info: result.queryInfo,
            performance: {
                duration_ms: duration
            }
        });

    } catch (error: any) {
        // Log match failure
        reqLogger.error('match.semantic.failed', error);
        return NextResponse.json({ error: 'Semantic matching failed', details: error.message }, { status: 500 });
    }
}
