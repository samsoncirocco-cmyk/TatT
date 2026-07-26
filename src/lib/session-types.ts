/**
 * SessionType — Cal.com EventType equivalent for tattoo booking.
 *
 * An artist defines what they offer (consultation, half-day, full-day, etc.).
 * Each session type carries its own duration, deposit rules, buffer times,
 * minimum booking notice, and intake field configuration.
 *
 * Persisted as a Neo4j :SessionType node linked to the artist via OFFERS.
 * Why Neo4j and not Supabase: the booking relay, artist-stripe mapping, and
 * claim flow all already use Neo4j nodes + executeWrite. Supabase may be
 * deleted (per next-gen-ux.md Appendix D). Keeping everything on Neo4j
 * avoids a dependency that might not exist yet.
 */

export type DepositType = "flat" | "percentage" | "none";

export interface SessionType {
  id: string;
  artistId: string;
  name: string;
  slug: string;
  durationMinutes: number;
  description: string | null;
  depositType: DepositType;
  /** For 'flat': cents. For 'percentage': basis points (2000 = 20%). */
  depositAmount: number;

  // Scheduling rules (Cal.com EventType pattern)
  requiresApproval: boolean;
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
  minimumBookingNoticeHours: number;

  // Tattoo-specific intake fields (Cal.com bookingFields pattern)
  // [{key, label, type, required, options?}]
  intakeFields: unknown[];

  // Cancellation policy (configurable per session type)
  cancellationPolicyHoursFullRefund: number;
  cancellationPolicyHoursPartialRefund: number;
  /** Basis points for partial refund (5000 = 50%). */
  cancellationPolicyPartialRefundBps: number;

  isActive: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionTypeInput {
  artistId: string;
  name: string;
  slug: string;
  durationMinutes: number;
  description?: string | null;
  depositType?: DepositType;
  depositAmount?: number;
  requiresApproval?: boolean;
  beforeBufferMinutes?: number;
  afterBufferMinutes?: number;
  minimumBookingNoticeHours?: number;
  intakeFields?: unknown[];
  cancellationPolicyHoursFullRefund?: number;
  cancellationPolicyHoursPartialRefund?: number;
  cancellationPolicyPartialRefundBps?: number;
}

// ─── Deposit calculation ──────────────────────────────────────────────

/**
 * Compute the deposit amount in CENTS for a given session type and
 * estimated session price. For 'flat' deposits the session price is
 * irrelevant. For 'percentage' the price must be provided.
 *
 * Unit contract: every money value that crosses this module's boundary is
 * integer cents, matching Stripe and `depositCentsForSize` in ./booking.
 * `depositDollarsForSize` is the only dollars-valued helper in the codebase
 * and exists purely for display. Never mix the two — see ADR 0023.
 */
export function computeDepositCents(
  sessionType: Pick<SessionType, "depositType" | "depositAmount">,
  estimatedPriceCents?: number,
): number {
  switch (sessionType.depositType) {
    case "flat":
      return Math.max(0, sessionType.depositAmount);
    case "percentage":
      if (!estimatedPriceCents || estimatedPriceCents <= 0) return 0;
      return Math.round(
        (estimatedPriceCents * sessionType.depositAmount) / 10_000,
      );
    case "none":
    default:
      return 0;
  }
}

// ─── Validation ────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9-]+$/;

export function validateSessionTypeSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length >= 2 && slug.length <= 60;
}

/** Fields an update may carry, on top of the create fields. */
export type UpdateSessionTypeInput = Partial<CreateSessionTypeInput> & {
  isActive?: boolean;
};

export type SessionTypeValidation<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * Field-level rules shared by create and update. Every rule fires only when
 * the field is actually present, so one function covers a full create payload
 * and a partial patch — create and update can never drift apart.
 *
 * Returns an error string, or null when every present field is in range.
 */
function checkPresentFields(input: UpdateSessionTypeInput): string | null {
  if (
    input.name !== undefined &&
    (!input.name.trim() || input.name.length > 100)
  ) {
    return "name is required (max 100 chars)";
  }
  if (
    input.slug !== undefined &&
    (!input.slug.trim() || !validateSessionTypeSlug(input.slug.trim()))
  ) {
    return "slug must be 2-60 chars, lowercase, hyphens only";
  }
  if (
    input.durationMinutes !== undefined &&
    (input.durationMinutes < 15 || input.durationMinutes > 720)
  ) {
    return "durationMinutes must be 15-720";
  }

  const { depositType, depositAmount } = input;
  if (
    depositType !== undefined &&
    depositType !== "flat" &&
    depositType !== "percentage" &&
    depositType !== "none"
  ) {
    return "depositType must be flat, percentage, or none";
  }
  // depositAmount's UNIT is decided by depositType — cents for 'flat', basis
  // points for 'percentage'. Accepting an amount without its type would mean
  // range-checking a number whose unit we do not know, which is exactly the
  // 100x mistake this module exists to prevent. Demand both together.
  if (depositAmount !== undefined && depositType === undefined) {
    return "depositType must be supplied alongside depositAmount (the amount's unit depends on it)";
  }
  if (
    depositType === "flat" &&
    depositAmount !== undefined &&
    (depositAmount < 0 || depositAmount > 100000)
  ) {
    return "flat deposit must be 0-100000 cents ($0-$1000)";
  }
  if (
    depositType === "percentage" &&
    depositAmount !== undefined &&
    (depositAmount < 0 || depositAmount > 10000)
  ) {
    return "percentage deposit must be 0-10000 bps (0-100%)";
  }

  if (
    input.minimumBookingNoticeHours !== undefined &&
    input.minimumBookingNoticeHours < 0
  ) {
    return "minimumBookingNoticeHours must be >= 0";
  }
  if (input.beforeBufferMinutes !== undefined && input.beforeBufferMinutes < 0) {
    return "beforeBufferMinutes must be >= 0";
  }
  if (input.afterBufferMinutes !== undefined && input.afterBufferMinutes < 0) {
    return "afterBufferMinutes must be >= 0";
  }

  if (
    input.cancellationPolicyHoursFullRefund !== undefined &&
    input.cancellationPolicyHoursFullRefund < 0
  ) {
    return "cancellationPolicyHoursFullRefund must be >= 0";
  }
  if (
    input.cancellationPolicyHoursPartialRefund !== undefined &&
    input.cancellationPolicyHoursPartialRefund < 0
  ) {
    return "cancellationPolicyHoursPartialRefund must be >= 0";
  }
  // Upper bound matters more than the lower one: >10000 bps is a refund
  // larger than the deposit, which Stripe would happily attempt. Reject
  // rather than clamp — silently paying out 100% when the artist typed
  // 50000 would be a money bug that never surfaces. See ADR 0023.
  if (
    input.cancellationPolicyPartialRefundBps !== undefined &&
    (input.cancellationPolicyPartialRefundBps < 0 ||
      input.cancellationPolicyPartialRefundBps > 10000)
  ) {
    return "cancellationPolicyPartialRefundBps must be 0-10000 bps (0-100%)";
  }

  return null;
}

/**
 * Validate a partial update. Only the fields present are checked; nothing is
 * defaulted, so an update never silently rewrites a field the caller left
 * alone. Used by `updateSessionType` so patches face the same rules as create.
 */
export function validateSessionTypeUpdate(
  updates: UpdateSessionTypeInput,
): SessionTypeValidation<UpdateSessionTypeInput> {
  const error = checkPresentFields(updates);
  if (error) return { ok: false, error };
  return { ok: true, value: updates };
}

export function validateSessionTypeInput(
  input: Partial<CreateSessionTypeInput>,
): SessionTypeValidation<CreateSessionTypeInput> {
  if (!input.artistId?.trim()) {
    return { ok: false, error: "artistId is required" };
  }
  // Create additionally requires these three to be present at all.
  if (!input.name?.trim()) {
    return { ok: false, error: "name is required (max 100 chars)" };
  }
  if (!input.slug?.trim()) {
    return {
      ok: false,
      error: "slug must be 2-60 chars, lowercase, hyphens only",
    };
  }
  if (!input.durationMinutes) {
    return { ok: false, error: "durationMinutes must be 15-720" };
  }

  const error = checkPresentFields(input);
  if (error) return { ok: false, error };

  const depositType = input.depositType ?? "none";
  const depositAmount = input.depositAmount ?? 0;
  const minimumBookingNoticeHours = input.minimumBookingNoticeHours ?? 24;
  const beforeBufferMinutes = input.beforeBufferMinutes ?? 30;
  const afterBufferMinutes = input.afterBufferMinutes ?? 30;

  return {
    ok: true,
    value: {
      artistId: input.artistId.trim(),
      name: input.name.trim(),
      slug: input.slug.trim(),
      durationMinutes: input.durationMinutes,
      description: input.description?.trim().slice(0, 500) ?? undefined,
      depositType,
      depositAmount,
      requiresApproval: input.requiresApproval ?? false,
      beforeBufferMinutes,
      afterBufferMinutes,
      minimumBookingNoticeHours,
      intakeFields: input.intakeFields ?? [],
      cancellationPolicyHoursFullRefund:
        input.cancellationPolicyHoursFullRefund ?? 72,
      cancellationPolicyHoursPartialRefund:
        input.cancellationPolicyHoursPartialRefund ?? 48,
      cancellationPolicyPartialRefundBps:
        input.cancellationPolicyPartialRefundBps ?? 5000,
    },
  };
}
