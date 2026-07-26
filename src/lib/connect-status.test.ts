// The three states an artist can actually be left in by Stripe onboarding —
// never started, stopped partway, finished — plus the review limbo in between.
//
// Getting `enabled` wrong in either direction costs real money: too eager and
// we tell an artist they're set up while their deposit ticks toward an
// auto-refund; too strict and we withhold from someone Stripe already cleared.
// The account fixtures mirror live Stripe payloads (an Express account with
// charges_enabled, and a bare account with details_submitted false).
import { describe, expect, it } from 'vitest';
import {
  canReceivePayouts,
  deriveOnboardingStatus,
  formatRequirement,
  formatRequirements,
  noAccountStatus,
  type ConnectAccountLike,
} from './connect-status';

/** Shape of a freshly created account nobody has onboarded yet. */
const NEVER_STARTED: ConnectAccountLike = {
  charges_enabled: false,
  payouts_enabled: false,
  details_submitted: false,
  requirements: {
    currently_due: ['business_profile.url', 'external_account', 'tos_acceptance.date'],
    past_due: ['external_account'],
    disabled_reason: 'requirements.past_due',
  },
};

/** Artist filled the form, Stripe came back wanting an ID document. */
const ABANDONED_MIDWAY: ConnectAccountLike = {
  charges_enabled: false,
  payouts_enabled: false,
  details_submitted: true,
  requirements: {
    currently_due: ['individual.verification.document'],
    past_due: [],
    disabled_reason: 'requirements.currently_due',
  },
};

/** Everything submitted, nothing owed, Stripe still deciding. */
const UNDER_REVIEW: ConnectAccountLike = {
  charges_enabled: false,
  payouts_enabled: false,
  details_submitted: true,
  requirements: {
    currently_due: [],
    past_due: [],
    pending_verification: ['individual.verification.document'],
    disabled_reason: null,
  },
};

/** Fully onboarded Express account. */
const FULLY_ONBOARDED: ConnectAccountLike = {
  charges_enabled: true,
  payouts_enabled: true,
  details_submitted: true,
  requirements: { currently_due: [], past_due: [], disabled_reason: null },
};

describe('deriveOnboardingStatus', () => {
  it('reports a never-onboarded account as not started, not as "requirements due"', () => {
    // A brand-new account always carries currently_due items. Calling that
    // "you left something behind" would misdescribe an artist who has never
    // seen the form.
    const status = deriveOnboardingStatus(NEVER_STARTED, 'acct_new');
    expect(status.state).toBe('not_started');
    expect(status.chargesEnabled).toBe(false);
    expect(status.accountId).toBe('acct_new');
    expect(canReceivePayouts(status)).toBe(false);
  });

  it('reports an abandoned-midway account as requirements_due and lists what is owed', () => {
    const status = deriveOnboardingStatus(ABANDONED_MIDWAY, 'acct_half');
    expect(status.state).toBe('requirements_due');
    expect(status.detailsSubmitted).toBe(true);
    expect(status.requirementsDue).toEqual(['individual.verification.document']);
    expect(status.disabledReason).toBe('requirements.currently_due');
    expect(canReceivePayouts(status)).toBe(false);
  });

  it('reports a submitted account with nothing outstanding as pending_verification', () => {
    const status = deriveOnboardingStatus(UNDER_REVIEW, 'acct_review');
    expect(status.state).toBe('pending_verification');
    expect(status.requirementsDue).toEqual([]);
    expect(canReceivePayouts(status)).toBe(false);
  });

  it('reports a fully onboarded account as enabled', () => {
    const status = deriveOnboardingStatus(FULLY_ONBOARDED, 'acct_live');
    expect(status.state).toBe('enabled');
    expect(status.chargesEnabled).toBe(true);
    expect(status.payoutsEnabled).toBe(true);
    expect(canReceivePayouts(status)).toBe(true);
  });

  it('treats charges_enabled as decisive even while other requirements linger', () => {
    // Stripe routinely leaves eventually-due items on a live account. Money can
    // still move, so the artist must not be told they are blocked.
    const status = deriveOnboardingStatus({
      ...FULLY_ONBOARDED,
      payouts_enabled: false,
      requirements: { currently_due: ['individual.id_number'], disabled_reason: null },
    });
    expect(status.state).toBe('enabled');
    expect(status.payoutsEnabled).toBe(false);
  });

  it('merges and dedupes currently_due with past_due', () => {
    const status = deriveOnboardingStatus(NEVER_STARTED);
    expect(status.requirementsDue).toEqual([
      'business_profile.url',
      'external_account',
      'tos_acceptance.date',
    ]);
  });

  it('survives an account with no requirements block at all', () => {
    const status = deriveOnboardingStatus({ charges_enabled: false, details_submitted: false });
    expect(status.state).toBe('not_started');
    expect(status.requirementsDue).toEqual([]);
    expect(status.disabledReason).toBeNull();
  });
});

describe('noAccountStatus', () => {
  it('is a blocked state, never a payable one', () => {
    const status = noAccountStatus();
    expect(status.state).toBe('no_account');
    expect(status.accountId).toBeNull();
    expect(canReceivePayouts(status)).toBe(false);
  });
});

describe('formatRequirement', () => {
  it('maps known Stripe keys to plain English', () => {
    expect(formatRequirement('external_account')).toBe('Bank account for payouts');
    expect(formatRequirement('individual.verification.document')).toBe('Photo ID');
  });

  it('humanizes unknown keys rather than dropping them', () => {
    // An unnamed blocker is still a blocker the artist has to clear.
    expect(formatRequirement('company.owners.some_new_field')).toBe('Owners some new field');
  });

  it('collapses duplicate labels (both tos_acceptance keys are one action)', () => {
    expect(formatRequirements(['tos_acceptance.date', 'tos_acceptance.ip'])).toEqual([
      'Accept the Stripe agreement',
    ]);
  });
});
