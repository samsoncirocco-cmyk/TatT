import { describe, expect, it, vi } from 'vitest';
import {
  APPROVE_CLAIM_CYPHER,
  executeClaimApproval,
  planClaimApproval,
} from './claim-approval-plan.mjs';

const NOW = 2_000_000_000_000;
const facts = (overrides = {}) => ({
  request: {
    id: 'CL-1234ABCD',
    artistId: 'artist_1',
    uid: 'uid_1',
    instagram: '@real.artist',
    verificationCode: 'TATT-ABCD1234',
    issuedAtEpochMs: NOW - 1_000,
  },
  artist: {
    id: 'artist_1',
    instagram: '@real.artist',
    removedAt: null,
    claimedByUid: null,
    claimVerificationStatus: null,
  },
  ...overrides,
});
describe('artist claim approval plan', () => {
  it('permits matching, current Instagram proof', () => {
    const plan = planClaimApproval(facts(), {
      requestId: 'CL-1234ABCD',
      method: 'instagram',
      approvedBy: 'samson',
      handleVerified: true,
      now: NOW,
    });
    expect(plan.blockers).toEqual([]);
  });

  it.each([
    ['proof not checked', {}, { handleVerified: false }],
    [
      'handle mismatch',
      { artist: { ...facts().artist, instagram: '@somebody.else' } },
      { handleVerified: true },
    ],
    [
      'removed artist',
      { artist: { ...facts().artist, removedAt: NOW - 1 } },
      { handleVerified: true },
    ],
    [
      'existing owner',
      { artist: { ...facts().artist, claimedByUid: 'uid_other', claimVerificationStatus: 'verified' } },
      { handleVerified: true },
    ],
  ])('refuses %s', (_label, factOverrides, input) => {
    const plan = planClaimApproval(facts(factOverrides), {
      requestId: 'CL-1234ABCD',
      method: 'instagram',
      approvedBy: 'samson',
      now: NOW,
      ...input,
    });
    expect(plan.blockers.length).toBeGreaterThan(0);
  });

  it('allows the no-Instagram fallback only with a durable review note', () => {
    const noHandle = facts({
      request: { ...facts().request, instagram: null, verificationCode: null },
      artist: { ...facts().artist, instagram: null },
    });
    expect(
      planClaimApproval(noHandle, {
        requestId: 'CL-1234ABCD',
        method: 'manual',
        approvedBy: 'samson',
        reviewNote: 'ID checked',
        now: NOW,
      }).blockers,
    ).not.toEqual([]);
    expect(
      planClaimApproval(noHandle, {
        requestId: 'CL-1234ABCD',
        method: 'manual',
        approvedBy: 'samson',
        reviewNote: 'Video call plus government ID matched the public studio identity.',
        now: NOW,
      }).blockers,
    ).toEqual([]);
  });

  it('requires a durable approving operator identity', () => {
    const plan = planClaimApproval(facts(), {
      requestId: 'CL-1234ABCD',
      method: 'instagram',
      handleVerified: true,
      now: NOW,
    });
    expect(plan.blockers.join(' ')).toMatch(/operator identity/i);
  });
});

describe('artist claim approval execution', () => {
  it('is a dry run unless execute and exact confirmation are both present', async () => {
    const approveAtomically = vi.fn();
    const plan = planClaimApproval(facts(), {
      requestId: 'CL-1234ABCD',
      method: 'instagram',
      approvedBy: 'samson',
      handleVerified: true,
      now: NOW,
    });
    expect((await executeClaimApproval({ approveAtomically }, plan)).dryRun).toBe(true);
    expect(
      (await executeClaimApproval({ approveAtomically }, plan, { execute: true, confirm: 'wrong' })).ok,
    ).toBe(false);
    expect(approveAtomically).not.toHaveBeenCalled();
  });

  it('performs one guarded atomic approval', async () => {
    const approveAtomically = vi.fn().mockResolvedValue(true);
    const plan = planClaimApproval(facts(), {
      requestId: 'CL-1234ABCD',
      method: 'instagram',
      approvedBy: 'samson',
      handleVerified: true,
      now: NOW,
    });
    const result = await executeClaimApproval(
      { approveAtomically },
      plan,
      { execute: true, confirm: 'CL-1234ABCD' },
    );
    expect(result.ok).toBe(true);
    expect(approveAtomically).toHaveBeenCalledTimes(1);
    expect(approveAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        approvedBy: 'samson',
        issuedAtEpochMs: NOW - 1_000,
        verificationCode: 'TATT-ABCD1234',
        requestInstagram: '@real.artist',
        artistInstagram: '@real.artist',
        verificationTtlMs: 7 * 24 * 60 * 60 * 1000,
      }),
    );
  });

  it('rechecks proof, expiry, and approver identity in the atomic write', () => {
    expect(APPROVE_CLAIM_CYPHER).toContain('r.issuedAtEpochMs > timestamp() - $verificationTtlMs');
    expect(APPROVE_CLAIM_CYPHER).toContain("coalesce(r.verificationCode, '')");
    expect(APPROVE_CLAIM_CYPHER).toContain("coalesce(r.instagram, '')");
    expect(APPROVE_CLAIM_CYPHER).toContain("coalesce(a.instagram, '')");
    expect(APPROVE_CLAIM_CYPHER).toContain('a.claimVerifiedBy = $approvedBy');
    expect(APPROVE_CLAIM_CYPHER).toContain('r.approvedBy = $approvedBy');
  });
});
