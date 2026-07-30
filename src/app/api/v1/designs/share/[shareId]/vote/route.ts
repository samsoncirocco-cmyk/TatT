import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { isShareVote, VOTE_OPTIONS } from '@/lib/share-votes';
import {
  resolveSharedDesignStore,
  SHARE_VOTES_UNAVAILABLE,
} from '@/lib/shared-design-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/designs/share/[shareId]/vote — one friend's answer to
 * "should I get this?" (TAT-52, the Social Feedback Loop).
 *
 * Deliberately anonymous and unauthenticated: the whole point is that a
 * friend in the group chat can weigh in without signing up. That makes the
 * abuse posture explicit rather than accidental:
 *
 *  - one-vote-per-person is enforced in the BROWSER (localStorage), not
 *    here — a determined re-voter can clear storage and vote again;
 *  - the server's contribution is an IP rate limit (the shared rate-limit
 *    lib's `default` window), which caps how fast anyone can stuff the box;
 *  - the tally is a group-chat poll, not an election. Nothing downstream
 *    (pricing, matching, spend) reads it.
 *
 * Fail-closed on storage, same as the rest of the share lane: no durable
 * store means 503 SHARE_VOTES_UNAVAILABLE, never a vote "counted" in one
 * serverless instance's memory.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const limit = await rateLimit(request, 'default');
  if (!limit.allowed) return rateLimitResponse(limit);

  const { shareId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const vote = (body as { vote?: unknown })?.vote;
  if (!isShareVote(vote)) {
    return NextResponse.json(
      { success: false, error: `vote must be one of: ${VOTE_OPTIONS.join(', ')}` },
      { status: 400 }
    );
  }

  const store = resolveSharedDesignStore();
  if (!store) {
    console.error('[share] no durable store configured — cannot count votes');
    return NextResponse.json(SHARE_VOTES_UNAVAILABLE, { status: 503 });
  }

  let votes;
  try {
    votes = await store.recordVote(shareId, vote);
  } catch (err) {
    console.error(
      `[share] vote on ${shareId} failed:`,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(SHARE_VOTES_UNAVAILABLE, { status: 503 });
  }

  if (!votes) {
    return NextResponse.json({ success: false, error: 'Design not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, votes });
}
