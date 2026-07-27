/**
 * Pure rules for artist ownership claims.
 *
 * A Firebase login proves control of a TatT account. It does not prove that the
 * account belongs to the artist named on a scraped profile. Public claim
 * requests therefore stop in `pending_verification`; only the human-reviewed
 * operator path may write the money-bearing `claimedByUid` binding.
 */

export const CLAIM_VERIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ClaimVerificationMethod = 'instagram_code' | 'manual_review';

export type PendingArtistClaim = {
  id: string;
  artistId: string;
  uid: string;
  contactEmail: string | null;
  instagram: string | null;
  verificationCode: string | null;
  status: 'pending_verification';
  issuedAtEpochMs: number;
};

export function normalizeInstagramHandle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(value) ? value : null;
}
export function formatClaimVerificationCode(seed: string): string {
  const clean = seed.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8);
  return `TATT-${clean.padEnd(8, 'X')}`;
}

export type ClaimApprovalFacts = {
  request: PendingArtistClaim | null;
  artist: {
    id: string;
    instagram: string | null;
    removedAt: number | null;
    claimedByUid: string | null;
    claimVerificationStatus: string | null;
  } | null;
};

export type ClaimApprovalPlan = {
  requestId: string | null;
  method: ClaimVerificationMethod;
  reviewNote: string | null;
  facts: ClaimApprovalFacts;
  blockers: string[];
  warnings: string[];
};

/**
 * Build a fail-closed approval plan. The CLI supplies `handleVerified` only
 * after an operator has visibly checked the code on the profile's Instagram.
 * Artists without a reachable Instagram require a written manual-review note.
 */
export function planClaimApproval(
  facts: ClaimApprovalFacts,
  input: {
    requestId?: string | null;
    method?: ClaimVerificationMethod;
    handleVerified?: boolean;
    reviewNote?: string | null;
    now?: number;
  },
): ClaimApprovalPlan {
  const method = input.method ?? 'instagram_code';
  const reviewNote = input.reviewNote?.trim() || null;
  const blockers: string[] = [];
  const warnings: string[] = [];
  const request = facts.request;
  const artist = facts.artist;
  const now = input.now ?? Date.now();

  if (!input.requestId) blockers.push('A claim request id is required.');
  if (!request) blockers.push('No pending claim request exists with that id.');
  if (!artist) blockers.push('The artist profile no longer exists.');

  if (request && input.requestId && request.id !== input.requestId) {
    blockers.push('The loaded request does not match the requested id.');
  }
  if (request && now - request.issuedAtEpochMs > CLAIM_VERIFICATION_TTL_MS) {
    blockers.push('The verification request has expired. Ask the artist to submit a fresh claim.');
  }
  if (artist?.removedAt) {
    blockers.push('The artist is removed. Reinstatement is the only path back; a claim cannot bypass it.');
  }
  if (request && artist && request.artistId !== artist.id) {
    blockers.push('The claim request points at a different artist node.');
  }
  if (
    request &&
    artist?.claimedByUid &&
    (artist.claimedByUid !== request.uid || artist.claimVerificationStatus === 'verified')
  ) {
    blockers.push('The profile already has an owner. Do not replace an existing ownership binding.');
  }

  const requestHandle = normalizeInstagramHandle(request?.instagram);
  const artistHandle = normalizeInstagramHandle(artist?.instagram);
  if (method === 'instagram_code') {
    if (!requestHandle || !artistHandle || requestHandle !== artistHandle) {
      blockers.push('The request and artist do not share one usable Instagram handle.');
    }
    if (!request?.verificationCode) {
      blockers.push('The request has no verification code to check.');
    }
    if (!input.handleVerified) {
      blockers.push('Instagram control has not been confirmed by an operator.');
    }
  } else {
    if (!reviewNote || reviewNote.length < 20) {
      blockers.push('Manual review requires a specific note of at least 20 characters.');
    }
    warnings.push(
      'Manual review is the no-Instagram fallback. The note becomes part of the durable ownership audit.',
    );
  }

  return {
    requestId: input.requestId ?? null,
    method,
    reviewNote,
    facts,
    blockers,
    warnings,
  };
}
