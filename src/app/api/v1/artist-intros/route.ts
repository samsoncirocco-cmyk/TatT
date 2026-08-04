import { NextRequest, NextResponse } from 'next/server';
import { recordArtistIntroRequest } from '@/lib/artist-intro-graph';
import { validateArtistIntroRequest } from '@/lib/artist-intro';
import { notifyOpsOfArtistIntroRequest } from '@/lib/notify';

export const runtime = 'nodejs';

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 60 * 1000;

function allowed(ip: string): boolean {
  const now = Date.now();
  const recent = (rateLimitMap.get(ip) ?? []).filter((at) => now - at < RATE_WINDOW);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!allowed(ip)) {
    return NextResponse.json({ received: false, error: 'Too many intro requests. Please try again later.' }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ received: false, error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = validateArtistIntroRequest(body);
  if (!parsed.ok) return NextResponse.json({ received: false, error: parsed.error }, { status: 400 });

  // Attach the design-session Brief when the intro arrived from a completed
  // design session (same fail-open path as /api/v1/book).
  let brief: Record<string, unknown> | undefined;
  if (parsed.value.designSessionId) {
    const dsId = parsed.value.designSessionId;
    try {
      const { getSession } = await import('@/services/designSession');
      const session = await getSession(dsId);
      if (session?.phase === 'complete' && session.brief) {
        brief = Object.fromEntries(
          Object.entries(session.brief).filter(([, v]) => v !== undefined),
        );
      } else {
        console.warn(
          `[artist-intro] design session ${dsId} has no brief (phase: ${session?.phase ?? 'unknown'}) — recording intro without it`,
        );
      }
    } catch (err) {
      console.warn(
        `[artist-intro] design session lookup failed for ${dsId} — recording intro without brief (fail-open):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Kept stable by the mounted browser form. A retry reuses this graph record
  // rather than minting another introduction while re-attempting the relay.
  const requestId = `IN-${parsed.value.clientRequestId}`;
  let recorded: { artistName: string } | null;
  try {
    recorded = await recordArtistIntroRequest(parsed.value, requestId, brief);
  } catch (err) {
    console.error(`[artist-intro] graph write failed for ${requestId}:`, err);
    return NextResponse.json({ received: false, error: 'We could not verify this artist for an intro. No request was sent.' }, { status: 503 });
  }
  if (!recorded) {
    return NextResponse.json({ received: false, error: 'This artist is unavailable for an intro request.', code: 'INTRO_UNAVAILABLE' }, { status: 409 });
  }
  const delivery = await notifyOpsOfArtistIntroRequest(parsed.value, requestId, recorded.artistName, brief);
  // Graph write already succeeded — return 202 so the client does not retry
  // and mint a duplicate :ArtistIntroRequest. Surface the fallback email when
  // ops delivery failed.
  if (!delivery.delivered) {
    return NextResponse.json({
      received: true,
      requestId,
      artistName: recorded.artistName,
      delivered: false,
      status: 'Relay request recorded. Delivery to our relay team is pending — please also email us with this reference.',
      fallbackEmail: process.env.OPS_NOTIFY_EMAIL || 'support@tatttester.com',
    }, { status: 202 });
  }
  return NextResponse.json({ received: true, requestId, artistName: recorded.artistName, status: 'Relay request received. No deposit was taken.' }, { status: 202 });
}
