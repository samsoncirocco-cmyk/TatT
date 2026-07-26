/**
 * Reinstatement — planner and executor. See docs/adr/0026.
 *
 * The counterpart to takedown-plan.mjs, and built with the same refusals:
 *
 *   - `executeReinstatement` is a DRY RUN unless explicitly told otherwise, and
 *     even then requires the caller to echo back the handle.
 *   - Every doubt is a blocker, not a warning. This path ends in someone owning
 *     a profile that can receive real money.
 *   - The operator must assert handle control on the command line. No code here
 *     can read Instagram, and pretending otherwise would be the lie that makes
 *     this unsafe.
 *   - A partial failure is reported as a failure. Never "mostly reinstated".
 *
 * ## What it does NOT do, and this is the design
 *
 * **It does not delete the tombstone, and it does not make the ingest gate let
 * the artist through.** `TOMBSTONE_KEYS_CYPHER` keeps returning the key and
 * `filterTombstoned` keeps rejecting it, permanently, after a successful
 * reinstatement. A tombstone means "never re-add this person from a scrape",
 * which stays true — truer, in fact, once the artist owns the profile, because
 * a later crawl must not overwrite what they wrote with scraped data.
 *
 * What it does instead is mark the tombstone as reinstated (an audit fact the
 * gate ignores), clear `removedAt` on the scrubbed husk, and bind the profile to
 * the verified account.
 *
 * ## It restores nothing
 *
 * The photographs were hard-deleted from GCS, the embedding from Supabase, and
 * the node was scrubbed (ADR 0025 §1–2). Clearing `removedAt` yields an EMPTY
 * profile the artist fills in themselves. There is no code path by which
 * reinstatement can bring scraped content back, because it no longer exists.
 * That is what makes offering reinstatement safe at all.
 */

/** Normalize "@Foo", an instagram URL, or "foo/" to a bare lowercase handle. */
export function normalizeInstagramHandle(raw) {
  if (!raw) return null;
  const clean = String(raw)
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .trim()
    .toLowerCase();
  return clean || null;
}

/** How long a published verification code stays actionable. Mirrors src/lib/reinstatement.ts. */
export const VERIFICATION_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Describe what a reinstatement WOULD change. Read-only — calling this never
 * mutates anything, which is what makes the dry run trustworthy.
 */
export async function planReinstatement(deps, { instagram, handleVerified = false, now = Date.now() } = {}) {
  const handle = normalizeInstagramHandle(instagram);

  const plan = {
    handle,
    tombstoneKey: handle ? `instagram:${handle}` : null,
    handleVerified,
    tombstone: null,
    artist: null,
    request: null,
    /** Always true. Stated in the plan so the operator reads it every time. */
    ingestStaysBlocked: true,
    blockers: [],
    warnings: [],
  };

  if (!handle) {
    plan.blockers.push('No usable Instagram handle supplied — nothing to look up.');
    return plan;
  }

  plan.tombstone = (await deps.readTombstone(plan.tombstoneKey)) ?? null;
  plan.request = (await deps.readPendingRequest(handle)) ?? null;

  // The tombstone names the node; fall back to the request's own record when the
  // tombstone predates that field.
  const artistId = plan.tombstone?.artistId ?? plan.request?.artistId ?? null;
  plan.artist = artistId ? ((await deps.readArtist(artistId)) ?? null) : null;

  if (!plan.tombstone) {
    plan.blockers.push(
      `No takedown tombstone exists for ${plan.tombstoneKey}. There is nothing to reinstate — ` +
        'if this artist was never removed they should sign up normally.',
    );
  } else if (plan.tombstone.reinstatedAt) {
    plan.blockers.push(
      `${handle} was already reinstated at ${new Date(Number(plan.tombstone.reinstatedAt)).toISOString()}. ` +
        'Re-running would re-bind ownership; a locked-out artist is an account recovery ' +
        'question, not a reinstatement.',
    );
  }

  if (!plan.request) {
    plan.blockers.push(
      `No pending reinstatement request found for ${handle}. Reinstatement is ONLY ever ` +
        'actioned against a request the artist submitted themselves while signed in — there ' +
        'is deliberately no admin path that skips this.',
    );
  } else if (now - Number(plan.request.issuedAtEpochMs) > VERIFICATION_CODE_TTL_MS) {
    plan.blockers.push(
      'The verification code on this request has expired. Ask the artist to submit a new one; ' +
        'an old code proves control of the handle at some point in the past, not now.',
    );
  }

  if (!handleVerified) {
    plan.blockers.push(
      `Handle control has NOT been confirmed. Check that the code below is published on ` +
        `instagram.com/${handle}, then re-run with --handle-verified. This is the only ` +
        'identity check in this flow; nothing else performs one.',
    );
  }

  if (!plan.artist) {
    plan.blockers.push(
      'The artist node this tombstone points at no longer exists, so there is nothing to ' +
        'unsuppress. The artist can sign up fresh — reinstatement is not needed for that.',
    );
  } else {
    // Issue #192, surfacing exactly where it matters. The husk retains
    // stripeAccountId by design, so re-pointing ownership could hand one
    // person's connected account to another.
    if (
      plan.artist.claimedByUid &&
      plan.request &&
      plan.artist.claimedByUid !== plan.request.uid
    ) {
      plan.blockers.push(
        `Artist ${plan.artist.id} is already claimed by a DIFFERENT account ` +
          `(${plan.artist.claimedByUid}) than the one requesting reinstatement ` +
          `(${plan.request.uid}). That binding was made with no identity check (issue #192) ` +
          'on a profile that may hold a connected Stripe account. Resolve who the artist ' +
          'actually is out of band — do not let this script decide.',
      );
    }

    if (!plan.artist.removedAt) {
      plan.warnings.push(
        `Artist ${plan.artist.id} is not currently suppressed (removedAt is unset), so the ` +
          'takedown may have been scope=images. The node needs no unsuppression; the ' +
          'ownership binding and the tombstone audit record still apply.',
      );
    }
  }

  if (plan.request?.uid) {
    plan.warnings.push(
      `On approval, artist ${plan.artist?.id ?? '(unknown)'} will be bound to Firebase uid ` +
        `${plan.request.uid}. This account will be able to receive deposits for the profile.`,
    );
  }

  plan.warnings.push(
    'Reinstatement restores NOTHING. The photographs, the embedding and the scraped profile ' +
      'details were permanently destroyed. The artist gets an empty profile they fill in ' +
      'themselves.',
  );
  plan.warnings.push(
    'The ingest tombstone is NOT removed and NOT weakened. Scrapers stay permanently blocked ' +
      'from re-adding this handle, which is what keeps their own profile authoritative.',
  );

  return plan;
}

/**
 * Carry out a plan.
 *
 * DRY RUN BY DEFAULT. To actually reinstate, the caller must pass BOTH
 * `execute: true` and `confirm` equal to the handle.
 */
export async function executeReinstatement(deps, plan, options = {}) {
  const { execute = false, confirm = null } = options;

  const wouldChange = {
    tombstoneMarkedReinstated: Boolean(plan.tombstone),
    nodeUnsuppressed: Boolean(plan.artist?.removedAt),
    boundToUid: plan.request?.uid ?? null,
    ingestStaysBlocked: true,
  };

  if (!execute) {
    return { dryRun: true, executed: false, ok: true, wouldChange, failures: [] };
  }

  if (confirm !== plan.handle) {
    return {
      dryRun: false, executed: false, ok: false, wouldChange, failures: [],
      error:
        `Refusing to execute: --confirm must exactly match the handle. ` +
        `Expected ${JSON.stringify(plan.handle)}, got ${JSON.stringify(confirm)}.`,
    };
  }

  if (plan.blockers.length) {
    return {
      dryRun: false, executed: false, ok: false, wouldChange, failures: [],
      error: `Refusing to execute — ${plan.blockers.join(' ')}`,
    };
  }

  const failures = [];
  const changed = { tombstoneMarkedReinstated: false, nodeUnsuppressed: false, boundToUid: null };

  // 1. The audit record FIRST, and permanently. If the run dies half way, the
  //    fact that a reinstatement was attempted survives — the same ordering
  //    principle as the takedown executor, which writes the tombstone first.
  //    This is also what makes a remove-then-relist pattern visible.
  try {
    const ok = await deps.markTombstoneReinstated(plan.tombstoneKey, {
      uid: plan.request.uid,
      requestId: plan.request.id,
      artistId: plan.artist.id,
    });
    changed.tombstoneMarkedReinstated = Boolean(ok);
    if (!ok) failures.push('Tombstone reinstatement marking reported failure.');
  } catch (err) {
    failures.push(`Tombstone reinstatement marking threw: ${err?.message || err}`);
  }

  if (failures.length) {
    // Without the audit mark, a second run would not see this as "already
    // reinstated" and the remove/relist history would be lost. Stop here rather
    // than hand over ownership untracked.
    return {
      dryRun: false, executed: false, ok: false, wouldChange, failures,
      error:
        'Refusing to continue: the reinstatement could not be recorded on the tombstone. ' +
        'Handing over a profile without a durable record of why would erase the history ' +
        'this mechanism exists to keep.',
    };
  }

  // 2. Unsuppress the husk and bind ownership to the verified account.
  try {
    const ok = await deps.reinstateArtist(plan.artist.id, { uid: plan.request.uid });
    changed.nodeUnsuppressed = Boolean(ok);
    changed.boundToUid = ok ? plan.request.uid : null;
    if (!ok) failures.push('Artist reinstatement reported failure.');
  } catch (err) {
    failures.push(`Artist reinstatement threw: ${err?.message || err}`);
  }

  // 3. Close the request so the same code cannot be actioned twice.
  try {
    await deps.closeRequest(plan.request.id);
  } catch (err) {
    failures.push(`Could not close request ${plan.request.id}: ${err?.message || err}`);
  }

  return {
    dryRun: false,
    executed: true,
    ok: failures.length === 0,
    changed,
    wouldChange,
    failures,
    warnings: plan.warnings,
  };
}
