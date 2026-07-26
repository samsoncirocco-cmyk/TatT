/**
 * Claim an Artist profile for the signed-in Firebase user.
 *
 * A tattoo artist who was seeded into the graph (and may already have held
 * deposits waiting for them) proves ownership by signing in with Google and
 * calling this route. We bind the verified Firebase uid to the Artist node via
 * `claimedByUid`. The bind is atomic and idempotent: the first caller wins, and
 * re-claiming by the same uid is a no-op success. A different uid trying to
 * claim an already-claimed artist gets 409.
 *
 * Response tells the client what to do next: whether a connected Stripe account
 * already exists (skip account creation) and how much held deposit is waiting.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { listPendingByArtist } from '@/lib/booking-relay';
import { NOT_REMOVED_CLAUSE } from '@/lib/takedown';

export const runtime = 'nodejs';

/** Small write helper that returns rows (the shared cypher helper is read-only). */
async function runWriteReturning(query: string, params: Record<string, unknown>) {
  const { getNeo4jDriver, NEO4J_DATABASE, NEO4J_QUERY_TIMEOUT } = await import('@/lib/neo4j');
  const neo4j = (await import('neo4j-driver')).default;
  const driver = getNeo4jDriver();
  if (!driver) {
    throw new Error('Neo4j driver not configured — cannot claim artist.');
  }
  const session = driver.session(NEO4J_DATABASE ? { database: NEO4J_DATABASE } : undefined);
  try {
    const result = await session.executeWrite(
      (tx: { run: (q: string, p: Record<string, unknown>) => Promise<{ records: Array<{ toObject(): Record<string, unknown> }> }> }) =>
        tx.run(query, params),
      { timeout: neo4j.int(NEO4J_QUERY_TIMEOUT) }
    );
    return result.records.map((rec: { toObject(): Record<string, unknown> }) => rec.toObject());
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  const user = await verifyFirebaseToken(req);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 });
  }
  const uid = user.uid;

  let artistId: string | undefined;
  try {
    ({ artistId } = (await req.json()) as { artistId?: string });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!artistId) {
    return NextResponse.json({ error: 'artistId is required.' }, { status: 400 });
  }

  // Atomic first-writer-wins claim. coalesce keeps an existing owner; the
  // returned claimedByUid tells us whether the binding is ours.
  //
  // `removedAt IS NULL` is load-bearing, not tidiness. A taken-down artist is
  // soft-deleted to a scrubbed husk that deliberately RETAINS the money-bearing
  // properties — stripeAccountId, claimedByUid (ADR 0025 §2). Without this
  // clause, anyone could claim a removed artist's husk through this route, which
  // performs no identity check whatsoever (issue #192), and inherit their
  // connected account. It would also be a way around reinstatement (ADR 0026),
  // which is supposed to be the only door back in and does verify identity.
  //
  // A removed artist reads as absent here, exactly as it does on the profile
  // page, the roster, the matcher and /api/v1/book.
  const rows = await runWriteReturning(
    `MATCH (a:Artist {id: $artistId})
     WHERE ${NOT_REMOVED_CLAUSE}
     SET a.claimedByUid = coalesce(a.claimedByUid, $uid)
     RETURN a.claimedByUid AS claimedByUid,
            a.name AS name,
            a.stripeAccountId AS stripeAccountId,
            coalesce(a.stripeChargesEnabled, false) AS chargesEnabled`,
    { artistId, uid }
  );

  if (!rows.length) {
    return NextResponse.json({ error: 'Artist not found.' }, { status: 404 });
  }

  const r = rows[0];
  const owner = (r.claimedByUid as string) ?? null;
  if (owner !== uid) {
    return NextResponse.json(
      { error: 'This profile has already been claimed by another account.', code: 'ALREADY_CLAIMED' },
      { status: 409 }
    );
  }

  const pending = await listPendingByArtist(artistId);
  const pendingDeposit = {
    count: pending.length,
    amountCents: pending.reduce((sum, p) => sum + p.amountCents, 0),
  };

  return NextResponse.json({
    claimed: true,
    artistId,
    name: (r.name as string) ?? null,
    hasConnectedAccount: Boolean(r.stripeAccountId),
    chargesEnabled: Boolean(r.chargesEnabled),
    pendingDeposit,
  });
}
