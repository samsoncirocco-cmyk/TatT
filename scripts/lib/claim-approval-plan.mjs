/**
 * Dry-run-first artist claim approval. The public claim route cannot call this.
 * Every uncertainty is a blocker because successful execution creates the
 * ownership fact that gates profile writes and real-money movement.
 */

export const CLAIM_VERIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The write rechecks every proof fact inside the same transaction that creates
 * ownership. A safe dry-run can become stale; this query must not.
 */
export const APPROVE_CLAIM_CYPHER = `
  MATCH (r:ArtistClaimRequest {
    id: $requestId,
    artistId: $artistId,
    uid: $uid,
    status: 'pending_verification'
  })
  MATCH (a:Artist {id: $artistId})
  WHERE a.removedAt IS NULL
    AND r.issuedAtEpochMs = $issuedAtEpochMs
    AND r.issuedAtEpochMs > timestamp() - $verificationTtlMs
    AND coalesce(r.verificationCode, '') = coalesce($verificationCode, '')
    AND coalesce(r.instagram, '') = coalesce($requestInstagram, '')
    AND coalesce(a.instagram, '') = coalesce($artistInstagram, '')
    AND (a.claimedByUid IS NULL OR (
      a.claimedByUid = $uid
      AND coalesce(a.claimVerificationStatus, '') <> 'verified'
    ))
  SET a.claimedByUid = $uid,
      a.claimVerificationStatus = 'verified',
      a.claimVerificationMethod = $method,
      a.claimVerificationNote = $reviewNote,
      a.claimVerifiedBy = $approvedBy,
      a.claimVerifiedAtEpochMs = timestamp(),
      r.status = 'approved',
      r.verificationMethod = $method,
      r.reviewNote = $reviewNote,
      r.approvedBy = $approvedBy,
      r.closedAtEpochMs = timestamp()
  RETURN a.id AS artistId
`;

const handle = (value) => {
  if (!value) return null;
  const normalized = String(value)
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(normalized) ? normalized : null;
};

export function planClaimApproval(
  facts,
  {
    requestId,
    method = 'instagram',
    approvedBy = null,
    handleVerified = false,
    reviewNote = null,
    now = Date.now(),
  } = {},
) {
  const request = facts.request ?? null;
  const artist = facts.artist ?? null;
  const blockers = [];
  const warnings = [];
  const approver = approvedBy?.trim() || null;
  const note = reviewNote?.trim() || null;

  if (!requestId) blockers.push('A claim request id is required.');
  if (!approver || approver.length < 3) {
    blockers.push('The approving operator identity is required.');
  }
  if (!request) blockers.push('No pending claim request exists with that id.');
  if (!artist) blockers.push('The artist profile no longer exists.');
  if (request && requestId && request.id !== requestId) blockers.push('Loaded the wrong request.');
  if (request && now - Number(request.issuedAtEpochMs) > CLAIM_VERIFICATION_TTL_MS) {
    blockers.push('The verification request expired; require a fresh request and proof.');
  }
  if (artist?.removedAt) blockers.push('The artist is removed; claim cannot bypass reinstatement.');
  if (request && artist && request.artistId !== artist.id) {
    blockers.push('The request points at a different artist.');
  }
  if (
    request &&
    artist?.claimedByUid &&
    (artist.claimedByUid !== request.uid || artist.claimVerificationStatus === 'verified')
  ) {
    blockers.push('The profile already has an owner; approval never replaces ownership.');
  }

  if (method === 'instagram') {
    if (!handle(request?.instagram) || handle(request?.instagram) !== handle(artist?.instagram)) {
      blockers.push('Request and artist do not share one usable Instagram handle.');
    }
    if (!request?.verificationCode) blockers.push('The request has no verification code.');
    if (!handleVerified) blockers.push('Instagram control has not been confirmed by an operator.');
  } else if (method === 'manual') {
    if (!note || note.length < 20) {
      blockers.push('Manual review requires a specific note of at least 20 characters.');
    }
    warnings.push('Manual review is the fallback when Instagram proof is unavailable.');
  } else {
    blockers.push(`Unknown verification method: ${method}.`);
  }

  return {
    requestId: requestId ?? null,
    method,
    approvedBy: approver,
    reviewNote: note,
    request,
    artist,
    blockers,
    warnings,
  };
}
export async function executeClaimApproval(deps, plan, { execute = false, confirm = null } = {}) {
  const wouldChange = {
    artistId: plan.artist?.id ?? null,
    bindToUid: plan.request?.uid ?? null,
    verificationMethod: plan.method,
  };
  if (!execute) return { dryRun: true, executed: false, ok: true, wouldChange };
  if (confirm !== plan.requestId) {
    return {
      dryRun: false,
      executed: false,
      ok: false,
      wouldChange,
      error: '--confirm must exactly match the request id.',
    };
  }
  if (plan.blockers.length) {
    return {
      dryRun: false,
      executed: false,
      ok: false,
      wouldChange,
      error: `Refusing to approve: ${plan.blockers.join(' ')}`,
    };
  }
  try {
    const approved = await deps.approveAtomically({
      requestId: plan.request.id,
      artistId: plan.artist.id,
      uid: plan.request.uid,
      method: plan.method === 'instagram' ? 'instagram_code' : 'manual_review',
      approvedBy: plan.approvedBy,
      reviewNote: plan.reviewNote,
      issuedAtEpochMs: plan.request.issuedAtEpochMs,
      verificationCode: plan.request.verificationCode,
      requestInstagram: plan.request.instagram,
      artistInstagram: plan.artist.instagram,
      verificationTtlMs: CLAIM_VERIFICATION_TTL_MS,
    });
    if (!approved) throw new Error('The guarded write matched no pending request/unowned artist.');
    return { dryRun: false, executed: true, ok: true, wouldChange };
  } catch (error) {
    return {
      dryRun: false,
      executed: false,
      ok: false,
      wouldChange,
      error: error?.message || String(error),
    };
  }
}
