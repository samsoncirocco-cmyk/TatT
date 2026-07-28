import { describe, expect, it } from 'vitest';
import { planClaimApproval, type ClaimApprovalFacts } from './artist-claim';

const NOW = 2_000_000_000_000;

function facts(
  requestInstagram: string | null,
  artistInstagram: string | null,
): ClaimApprovalFacts {
  return {
    request: {
      id: 'CL-1234ABCD',
      artistId: 'artist_1',
      uid: 'uid_1',
      contactEmail: 'artist@example.com',
      instagram: requestInstagram,
      verificationCode: 'TATT-ABCD1234',
      status: 'pending_verification',
      issuedAtEpochMs: NOW - 1_000,
    },
    artist: {
      id: 'artist_1',
      instagram: artistInstagram,
      removedAt: null,
      claimedByUid: null,
      claimVerificationStatus: null,
    },
  };
}

const manualInput = {
  requestId: 'CL-1234ABCD',
  method: 'manual_review' as const,
  approvedBy: 'samson',
  reviewNote: 'Video call plus government ID matched the public studio identity.',
  now: NOW,
};

describe('manual artist claim approval', () => {
  it.each([
    ['@real.artist', '@real.artist'],
    ['@real.artist', null],
    [null, '@real.artist'],
  ])(
    'refuses the fallback while either Instagram snapshot is usable (%s, %s)',
    (requestInstagram, artistInstagram) => {
      const plan = planClaimApproval(facts(requestInstagram, artistInstagram), manualInput);
      expect(plan.blockers.join(' ')).toMatch(/both request and artist lack a usable Instagram/i);
    },
  );

  it('allows the fallback only when both snapshots are absent or unusable', () => {
    const plan = planClaimApproval(
      facts('not a usable handle', 'https://instagram.com/'),
      manualInput,
    );
    expect(plan.blockers).toEqual([]);
  });
});
