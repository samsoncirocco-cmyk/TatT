/**
 * Honest onboarding state for an artist's Stripe connected account.
 *
 * The whole payout path hangs off ONE Stripe boolean: `charges_enabled`. Until
 * it flips true, `transferHeldDeposits` refuses (src/lib/booking-relay.ts) and
 * every held deposit eventually auto-refunds to the customer. So the claim UI
 * must never say "you're set up" on anything softer than that flag.
 *
 * This module is the single place that turns a Stripe Account into a state the
 * UI can render. It is PURE — no network, no Stripe client — so the three states
 * an artist can actually be in (never started, stopped partway, finished) are
 * unit-testable without touching Stripe.
 */

/** Minimal shape of the Stripe Account fields this derivation reads. */
export interface ConnectAccountLike {
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  details_submitted?: boolean | null;
  requirements?: {
    currently_due?: string[] | null;
    past_due?: string[] | null;
    pending_verification?: string[] | null;
    disabled_reason?: string | null;
  } | null;
}

export type ConnectOnboardingState =
  /** No connected account exists yet — nothing has been created for this artist. */
  | 'no_account'
  /** Account exists but the artist has never submitted the onboarding form. */
  | 'not_started'
  /** Artist stopped partway (or Stripe came back for more): items are outstanding. */
  | 'requirements_due'
  /** Everything submitted, nothing outstanding, Stripe is still reviewing. */
  | 'pending_verification'
  /** charges_enabled — money can actually move to this artist. */
  | 'enabled';

export interface ConnectOnboardingStatus {
  state: ConnectOnboardingState;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  /** Stripe requirement keys the artist still has to satisfy (deduped, sorted). */
  requirementsDue: string[];
  /** Stripe's machine reason the account is restricted, when it gives one. */
  disabledReason: string | null;
}

/** The state where held deposits can actually be released. */
export function canReceivePayouts(status: Pick<ConnectOnboardingStatus, 'state'>): boolean {
  return status.state === 'enabled';
}

/** Status for an artist who has no connected account at all yet. */
export function noAccountStatus(): ConnectOnboardingStatus {
  return {
    state: 'no_account',
    accountId: null,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    requirementsDue: [],
    disabledReason: null,
  };
}

/**
 * Derive the onboarding state from a live Stripe Account.
 *
 * Order matters and is deliberate:
 *  1. `charges_enabled` wins outright — it is the only flag that unblocks money.
 *  2. Otherwise, never-submitted is "not started" even though Stripe already
 *     lists requirements (a fresh account always has currently_due items;
 *     reporting those as "you left something behind" would be a lie).
 *  3. Outstanding items → the artist has work to do.
 *  4. Nothing outstanding but still not enabled → Stripe is reviewing.
 */
export function deriveOnboardingStatus(
  account: ConnectAccountLike,
  accountId: string | null = null
): ConnectOnboardingStatus {
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const detailsSubmitted = Boolean(account.details_submitted);
  const req = account.requirements ?? {};
  const requirementsDue = Array.from(
    new Set([...(req.currently_due ?? []), ...(req.past_due ?? [])])
  ).sort();
  const disabledReason = req.disabled_reason ?? null;

  let state: ConnectOnboardingState;
  if (chargesEnabled) {
    state = 'enabled';
  } else if (!detailsSubmitted) {
    state = 'not_started';
  } else if (requirementsDue.length > 0) {
    state = 'requirements_due';
  } else {
    state = 'pending_verification';
  }

  return {
    state,
    accountId,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    requirementsDue,
    disabledReason,
  };
}

/**
 * Turn a Stripe requirement key into something an artist can read.
 * `individual.verification.document` → "Identity document".
 * Unknown keys degrade to a humanized version of the key rather than being
 * dropped — an unnamed blocker is still a blocker the artist needs to see.
 */
const REQUIREMENT_LABELS: Record<string, string> = {
  external_account: 'Bank account for payouts',
  'business_profile.url': 'Business website or profile link',
  'business_profile.product_description': 'Description of what you sell',
  'business_profile.support_phone': 'Support phone number',
  'business_profile.mcc': 'Business category',
  'tos_acceptance.date': 'Accept the Stripe agreement',
  'tos_acceptance.ip': 'Accept the Stripe agreement',
  'individual.verification.document': 'Photo ID',
  'individual.id_number': 'Government ID number',
  'individual.ssn_last_4': 'Last 4 of your SSN',
  'individual.dob.day': 'Date of birth',
  'individual.dob.month': 'Date of birth',
  'individual.dob.year': 'Date of birth',
  'individual.address.line1': 'Home address',
  'individual.first_name': 'Legal first name',
  'individual.last_name': 'Legal last name',
  'individual.email': 'Email address',
  'individual.phone': 'Phone number',
};

export function formatRequirement(key: string): string {
  const known = REQUIREMENT_LABELS[key];
  if (known) return known;
  const tail = key.split('.').slice(-2).join(' ');
  const words = tail.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Deduped, human-readable list of what the artist still owes Stripe. */
export function formatRequirements(keys: string[]): string[] {
  return Array.from(new Set(keys.map(formatRequirement)));
}
