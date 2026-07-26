// Takedown suppression on POST /api/v1/connect/claim.
//
// A taken-down artist is soft-deleted to a scrubbed husk that deliberately
// RETAINS the money-bearing properties — stripeAccountId and claimedByUid
// (ADR 0025 §2) — so held deposits are never orphaned.
//
// This route performs NO identity check of any kind: first caller wins the
// binding (issue #192). Without a removedAt guard, anyone could therefore claim
// a removed artist's husk and inherit their connected Stripe account, and it
// would be a way around reinstatement (ADR 0026), which is meant to be the only
// door back in and which does verify identity.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { NOT_REMOVED_CLAUSE } from '@/lib/takedown';

const { verifyApiAuthMock, verifyFirebaseTokenMock, listPendingByArtistMock, runMock } = vi.hoisted(
  () => ({
    verifyApiAuthMock: vi.fn(),
    verifyFirebaseTokenMock: vi.fn(),
    listPendingByArtistMock: vi.fn(),
    runMock: vi.fn(),
  }),
);

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));
vi.mock('@/lib/auth-dal', () => ({ verifyFirebaseToken: verifyFirebaseTokenMock }));
vi.mock('@/lib/booking-relay', () => ({ listPendingByArtist: listPendingByArtistMock }));
vi.mock('neo4j-driver', () => ({
  default: { int: (n: number) => n },
}));
vi.mock('@/lib/neo4j', () => ({
  NEO4J_DATABASE: null,
  NEO4J_QUERY_TIMEOUT: 5000,
  getNeo4jDriver: () => ({
    session: () => ({
      executeWrite: (work: (tx: unknown) => unknown) => work({ run: runMock }),
      close: async () => {},
    }),
  }),
}));

import { POST } from './route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/v1/connect/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  });
}

/** Mirror Neo4j: a WHERE that excludes the node yields zero records. */
function graphReturns(rows: Array<Record<string, unknown>>) {
  runMock.mockResolvedValue({ records: rows.map((r) => ({ toObject: () => r })) });
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyApiAuthMock.mockResolvedValue(null);
  verifyFirebaseTokenMock.mockResolvedValue({ uid: 'uid_caller' });
  listPendingByArtistMock.mockResolvedValue([]);
});

describe('POST /api/v1/connect/claim — takedown suppression', () => {
  it('a removed artist reads as not found, not as claimable', async () => {
    // The husk exists in the graph; the WHERE clause filters it out, so the
    // driver returns no rows and the route must treat that as 404.
    graphReturns([]);

    const res = await POST(makeRequest({ artistId: 'artist_removed' }));

    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/not found/i);
  });

  it('never writes claimedByUid for a removed artist', async () => {
    graphReturns([]);

    await POST(makeRequest({ artistId: 'artist_removed' }));

    // One query ran, and it carried the suppression clause — so the SET inside
    // it could not have matched a removed node.
    expect(runMock).toHaveBeenCalledTimes(1);
    const [cypher] = runMock.mock.calls[0];
    expect(cypher).toContain(NOT_REMOVED_CLAUSE);
    expect(cypher).toContain('SET a.claimedByUid');
  });

  it('still claims a live, unclaimed artist', async () => {
    // The guard must not break the normal path.
    graphReturns([
      { claimedByUid: 'uid_caller', name: 'Ging', stripeAccountId: null, chargesEnabled: false },
    ]);

    const res = await POST(makeRequest({ artistId: 'artist_ging' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ claimed: true, artistId: 'artist_ging' });
  });

  it('still rejects a live artist already claimed by someone else', async () => {
    graphReturns([
      { claimedByUid: 'uid_other', name: 'Ging', stripeAccountId: null, chargesEnabled: false },
    ]);

    const res = await POST(makeRequest({ artistId: 'artist_ging' }));

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('ALREADY_CLAIMED');
  });
});
