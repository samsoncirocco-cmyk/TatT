import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
// @ts-ignore
import { getHybridArtistMatches } from '@/services/matchService';
// @ts-ignore
import { updateMatches } from '@/services/firebase-match-service';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { createRequestLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const reqLogger = createRequestLogger('match/update');

    const authError = verifyApiAuth(req);
    if (authError) return authError;

    const rateResult = await checkRateLimit(req, 'matching');
    if (!rateResult.allowed) {
        return rateLimitResponse(rateResult);
    }

    try {
        const body = await req.json();
        const {
            userId,
            designId,
            prompt,
            style,
            bodyPart,
            location,
            budget,
            embeddingVector
        } = body;

        if (!userId || !designId) {
            return NextResponse.json({ error: 'Missing required fields: userId, designId' }, { status: 400 });
        }

        // Log match update start
        reqLogger.start('match.updated', {
            match_id: designId,
            user_id: userId,
            has_embedding: !!embeddingVector,
            has_style: !!style,
            has_location: !!location,
        });

        const context = {
            style,
            bodyPart,
            location,
            budget,
            layerCount: 0,
            embeddingVector
        };

        const matchResults = await getHybridArtistMatches(context, {
            embeddingVector,
            limit: 20
        });

        // Map to MatchedArtist format for Firebase
        const artists = (matchResults.matches || []).map((artist: { id: string | number; name: string; score?: number; [key: string]: unknown }) => ({
            id: artist.id,
            name: artist.name,
            score: artist.score,
            ...artist
        }));

        const payload = {
            designId,
            artists
        };

        await updateMatches(userId, payload);

        // Log match update completion
        reqLogger.complete('match.updated', {
            match_id: designId,
            artist_count: matchResults.matches?.length || 0,
        });

        return NextResponse.json({
            matchId: designId,
            artists: matchResults.matches || [],
            firebasePath: `/matches/${userId}/current`,
            processingTime: (matchResults as { processingTime?: number }).processingTime ?? null
        });

    } catch (error: any) {
        // Log match update failure
        reqLogger.error('match.updated', error);
        return NextResponse.json({ error: 'Match update failed', message: error.message }, { status: 500 });
    }
}
