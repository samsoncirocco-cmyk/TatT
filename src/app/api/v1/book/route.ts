import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { validateBookingRequest } from '@/lib/booking';

// In-memory rate limiter: ip -> list of timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => now - t < RATE_WINDOW);
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

export async function POST(request: NextRequest) {
  const authError = await verifyApiAuth(request);
  if (authError) return authError;

  // Owner uid — booking_requests docs are readable only by this user
  // (see firestore.rules). verifyApiAuth already accepted the token,
  // so this resolves to the same verified user.
  const user = await verifyFirebaseToken(request);

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: 'Too many booking requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = validateBookingRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }

  // Validate the canonical artist id against the Neo4j graph (Artist.id is the
  // platform's canonical artist id). Fail-CLOSED on a definitive "not found"
  // (return 400) but fail-OPEN on infra error — a Neo4j outage must never drop
  // real bookings. artistId is optional; absent means allow (some flows omit it).
  if (parsed.value.artistId) {
    try {
      const { executeServerCypherQuery } = await import(
        '@/features/match-pulse/services/neo4jService'
      );
      const records = await executeServerCypherQuery(
        'MATCH (a:Artist {id: $id}) RETURN a.id LIMIT 1',
        { id: parsed.value.artistId }
      );
      if (!records.length) {
        return NextResponse.json({ success: false, error: 'Unknown artist.' }, { status: 400 });
      }
    } catch (err) {
      // Lookup itself failed (graph unreachable) — log and fall through to allow.
      console.warn(
        `[book] artist existence check failed for ${parsed.value.artistId} — allowing booking (fail-open):`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // Attach the design-session Brief (the artist-facing deliverable — see
  // CONTEXT.md "Brief") when the booking arrived from a completed design
  // session. Fail-OPEN like the artist check above: a missing, incomplete,
  // or erroring session must never drop a real booking — capture without
  // the brief and log it.
  let brief: Record<string, unknown> | undefined;
  if (parsed.value.designSessionId) {
    const dsId = parsed.value.designSessionId;
    try {
      const { getSession } = await import('@/services/designSession');
      const session = await getSession(dsId);
      if (session?.phase === 'complete' && session.brief) {
        // Strip undefined optionals (finalImageUrl, rejectedAxisPosition) —
        // Firestore rejects undefined fields even inside nested maps.
        brief = Object.fromEntries(
          Object.entries(session.brief).filter(([, v]) => v !== undefined)
        );
      } else {
        console.warn(
          `[book] design session ${dsId} has no brief (phase: ${session?.phase ?? 'unknown'}) — capturing booking without it`
        );
      }
    } catch (err) {
      console.warn(
        `[book] design session lookup failed for ${dsId} — capturing booking without brief (fail-open):`,
        err instanceof Error ? err.message : err
      );
    }
  }

  const bookingId = `BK-${randomUUID().slice(0, 8).toUpperCase()}`;
  // Strip undefined values — Firestore rejects any document containing an
  // `undefined` field (e.g. optional clientPhone), throwing a validation error
  // that previously dropped the booking to the ephemeral file fallback and lost
  // it. Only real (defined) fields are persisted.
  const booking = Object.fromEntries(
    Object.entries({
      bookingId,
      ...parsed.value,
      brief,
      uid: user?.uid ?? null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ip,
    }).filter(([, v]) => v !== undefined)
  );

  // Try Firestore (if configured)
  let savedToFirestore = false;
  const credSource = ensureAdminApp();
  try {
    if (credSource) {
      const { getFirestore } = await import('firebase-admin/firestore');
      await getFirestore().collection('booking_requests').doc(bookingId).set(booking);
      savedToFirestore = true;
    } else {
      console.error(`[book] ${bookingId}: Firebase Admin unconfigured — using file fallback`);
    }
  } catch (err) {
    // Fall back to file, but never silently: a lost prod booking is real money
    console.error(
      `[book] ${bookingId}: Firestore write failed (cred source: ${credSource}) — using file fallback:`,
      err instanceof Error ? err.message : err
    );
  }

  // Fallback: append to local file
  if (!savedToFirestore) {
    try {
      const dir = '/tmp/tatt-data';
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(join(dir, 'bookings.jsonl'), JSON.stringify(booking) + '\n');
    } catch {
      // Even file write failed — still return success (booking captured in memory)
    }
  }

  return NextResponse.json({
    success: true,
    bookingId,
    message: `Booking request received! Your confirmation number is ${bookingId}. The artist will contact you within 24 hours.`,
  });
}
