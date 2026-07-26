/**
 * The artist's own availability write path — the windows they offer TatT.
 *
 * This is the route ADR 0027 named as missing: `scheduling-engine.ts` has read
 * `WeeklySchedule` and `AvailabilityOverride` since PR #112, but nothing could
 * ever write one. `firestore.rules` forbids client writes to
 * `artist_availability/{artistId}` and that stays true — the write goes through
 * here, where ownership is proven first.
 *
 * Ops deliberately cannot use this route on an artist's behalf: the guard is
 * `claimedByUid === caller`, not a role. A schedule entered by someone other
 * than the artist is exactly the "fake open slots" the honest default existed
 * to prevent.
 *
 * The existing `status` field on the same document is untouched. An artist can
 * have both, and the status path keeps working for every artist who never
 * publishes hours.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { isArtistOwner } from '@/lib/artist-ownership';
import {
  validateArtistSchedule,
  normalizeArtistSchedule,
} from '@/lib/artist-availability';

export const runtime = 'nodejs';

const COLLECTION = 'artist_availability';

export async function GET(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  const artistId = req.nextUrl.searchParams.get('artistId') ?? '';
  const user = await verifyFirebaseToken(req);
  if (!(await isArtistOwner(user?.uid, artistId))) {
    return NextResponse.json({ error: 'Not your artist profile.' }, { status: 403 });
  }
  if (!ensureAdminApp()) {
    return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 });
  }

  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    const snap = await getFirestore().collection(COLLECTION).doc(artistId).get();
    return NextResponse.json({
      // null means "nothing published yet", which the editor renders as an
      // empty week rather than inventing default opening hours.
      schedule: normalizeArtistSchedule(snap.exists ? snap.data() : null),
    });
  } catch (err) {
    console.error(`[availability] read failed for ${artistId}:`, err);
    return NextResponse.json({ error: 'Could not read your schedule.' }, { status: 503 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  const user = await verifyFirebaseToken(req);
  let body: { artistId?: string; schedule?: unknown; overrides?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const artistId = body.artistId ?? '';
  if (!(await isArtistOwner(user?.uid, artistId))) {
    return NextResponse.json({ error: 'Not your artist profile.' }, { status: 403 });
  }

  // Rejects rather than repairs: a guessed timezone or a silently dropped
  // window would show the artist a schedule that is not the one they saved.
  const parsed = validateArtistSchedule({
    schedule: body.schedule,
    overrides: body.overrides,
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!ensureAdminApp()) {
    return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 });
  }
  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    await getFirestore()
      .collection(COLLECTION)
      .doc(artistId)
      // merge: the `status` field on this document belongs to the existing
      // availability model and is not ours to clear.
      .set(
        {
          schedule: parsed.value.schedule,
          overrides: parsed.value.overrides,
          scheduleUpdatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    return NextResponse.json({ saved: true, schedule: parsed.value });
  } catch (err) {
    console.error(`[availability] write failed for ${artistId}:`, err);
    return NextResponse.json({ error: 'Could not save your schedule.' }, { status: 503 });
  }
}
