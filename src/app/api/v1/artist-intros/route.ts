import { randomUUID } from 'crypto';
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

  const requestId = `IN-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  let recorded: { artistName: string } | null;
  try {
    recorded = await recordArtistIntroRequest(parsed.value, requestId);
  } catch (err) {
    console.error(`[artist-intro] graph write failed for ${requestId}:`, err);
    return NextResponse.json({ received: false, error: 'We could not verify this artist for an intro. No request was sent.' }, { status: 503 });
  }
  if (!recorded) {
    return NextResponse.json({ received: false, error: 'This artist is unavailable for an intro request.', code: 'INTRO_UNAVAILABLE' }, { status: 409 });
  }
  const delivery = await notifyOpsOfArtistIntroRequest(parsed.value, requestId, recorded.artistName);
  if (!delivery.delivered) {
    return NextResponse.json({
      received: false,
      requestId,
      error: 'We recorded your request but could not deliver it to our relay team. Please email us directly with this reference.',
      fallbackEmail: process.env.OPS_NOTIFY_EMAIL || 'support@tatttester.com',
    }, { status: 502 });
  }
  return NextResponse.json({ received: true, requestId, artistName: recorded.artistName, status: 'Relay request received. No deposit was taken.' }, { status: 202 });
}
