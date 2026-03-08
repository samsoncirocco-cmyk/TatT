import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, getUserFromRequest } from '@/lib/api-auth';
import { findMatchingArtists } from '@/services/hybridMatchService';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { createRequestLogger } from '@/lib/logger';
import { logMatchResults } from '@/services/match-tracking';

// Edge runtime compatible (Neo4j driver is accessed via HTTP proxy service)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Demo-mode mock artist data — used when NEXT_PUBLIC_DEMO_MODE=true
const DEMO_ARTISTS = [
    { id: 'demo-1', name: 'Alex Rivera',  city: 'Los Angeles, CA', styles: ['blackwork','geometric'], hourlyRate: 150, score: 0.94, profileImage: 'https://i.pravatar.cc/150?img=1', portfolioImages: ['https://images.unsplash.com/photo-1565058379802-bbe93b2f703f?w=400','https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=400'], specialties: ['custom designs','sacred geometry'] },
    { id: 'demo-2', name: 'Jordan Chen',  city: 'San Francisco, CA', styles: ['neo-traditional','watercolor'], hourlyRate: 175, score: 0.91, profileImage: 'https://i.pravatar.cc/150?img=2', portfolioImages: ['https://images.unsplash.com/photo-1590246814883-57c511e76729?w=400'], specialties: ['color work','portraits'] },
    { id: 'demo-3', name: 'Sam Taylor',   city: 'Portland, OR',     styles: ['minimalist','linework'],    hourlyRate: 125, score: 0.87, profileImage: 'https://i.pravatar.cc/150?img=3', portfolioImages: [], specialties: ['fine line','botanical'] },
    { id: 'demo-4', name: 'Morgan Lee',   city: 'Seattle, WA',      styles: ['blackwork','dotwork'],      hourlyRate: 200, score: 0.84, profileImage: 'https://i.pravatar.cc/150?img=4', portfolioImages: [], specialties: ['large pieces','sleeves'] },
    { id: 'demo-5', name: 'Casey Brooks', city: 'Austin, TX',       styles: ['traditional','americana'],  hourlyRate: 140, score: 0.80, profileImage: 'https://i.pravatar.cc/150?img=5', portfolioImages: [], specialties: ['flash art','bold color'] },
];

export async function POST(req: NextRequest) {
    const reqLogger = createRequestLogger('match/semantic');

    // Auth check
    const authError = verifyApiAuth(req);
    if (authError) return authError;

    // ─── DEMO MODE ─────────────────────────────────────────────────────────
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        await new Promise(r => setTimeout(r, 800)); // Simulate latency
        return NextResponse.json({
            success: true,
            matches: DEMO_ARTISTS,
            total_candidates: DEMO_ARTISTS.length,
            query_info: { sources: ['demo'], demoMode: true },
            performance: { duration_ms: 800 }
        });
    }
    // ───────────────────────────────────────────────────────────────────────

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
