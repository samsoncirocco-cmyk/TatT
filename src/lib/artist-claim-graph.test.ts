import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runMock } = vi.hoisted(() => ({ runMock: vi.fn() }));
vi.mock('neo4j-driver', () => ({ default: { int: (value: number) => value } }));
vi.mock('@/lib/neo4j', () => ({
  NEO4J_DATABASE: null,
  NEO4J_QUERY_TIMEOUT: 5000,
  getNeo4jDriver: () => ({
    session: () => ({
      executeWrite: (work: (tx: unknown) => unknown) => work({ run: runMock }),
      close: vi.fn(),
    }),
  }),
}));

import { requestArtistClaim } from './artist-claim-graph';

describe('pending artist claim persistence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records only a request and never binds ownership or payout state', async () => {
    runMock.mockResolvedValue({
      records: [
        {
          toObject: () => ({
            artistId: 'artist_1',
            name: 'Nadia',
            instagram: '@nadia',
            claimedByUid: null,
            claimVerificationStatus: null,
            stripeAccountId: null,
            chargesEnabled: false,
            requestId: 'CL-1',
            requestUid: 'uid_1',
            contactEmail: 'nadia@example.com',
            verificationCode: 'TATT-ABCD1234',
            requestStatus: 'pending_verification',
            issuedAtEpochMs: 123,
          }),
        },
      ],
    });

    await requestArtistClaim({
      id: 'CL-1',
      artistId: 'artist_1',
      uid: 'uid_1',
      contactEmail: 'nadia@example.com',
      verificationCode: 'TATT-ABCD1234',
    });
    const [query] = runMock.mock.calls[0];
    expect(query).toContain('ArtistClaimRequest');
    expect(query).not.toMatch(/SET\s+a\.claimedByUid/i);
    expect(query).not.toContain('stripeAccountId =');
  });
});
