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
 * Compute the deposit amount in cents for a given session type and
 * estimated session price. For 'flat' deposits the session price is
 * irrelevant. For 'percentage' the price must be provided.
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

export function validateSessionTypeInput(
  input: Partial<CreateSessionTypeInput>,
): { ok: true; value: CreateSessionTypeInput } | { ok: false; error: string } {
  if (!input.artistId?.trim()) {
    return { ok: false, error: "artistId is required" };
  }
  if (!input.name?.trim() || input.name.length > 100) {
    return { ok: false, error: "name is required (max 100 chars)" };
  }
  if (!input.slug?.trim() || !validateSessionTypeSlug(input.slug || "")) {
    return {
      ok: false,
      error: "slug must be 2-60 chars, lowercase, hyphens only",
    };
  }
  if (
    !input.durationMinutes ||
    input.durationMinutes < 15 ||
    input.durationMinutes > 720
  ) {
    return { ok: false, error: "durationMinutes must be 15-720" };
  }

  const depositType = input.depositType ?? "none";
  const depositAmount = input.depositAmount ?? 0;

  if (
    depositType !== "flat" &&
    depositType !== "percentage" &&
    depositType !== "none"
  ) {
    return {
      ok: false,
      error: "depositType must be flat, percentage, or none",
    };
  }
  if (depositType === "flat" && (depositAmount < 0 || depositAmount > 100000)) {
    return {
      ok: false,
      error: "flat deposit must be 0-100000 cents ($0-$1000)",
    };
  }
  if (
    depositType === "percentage" &&
    (depositAmount < 0 || depositAmount > 10000)
  ) {
    return {
      ok: false,
      error: "percentage deposit must be 0-10000 bps (0-100%)",
    };
  }

  const minimumBookingNoticeHours = input.minimumBookingNoticeHours ?? 24;
  if (minimumBookingNoticeHours < 0) {
    return { ok: false, error: "minimumBookingNoticeHours must be >= 0" };
  }

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
      beforeBufferMinutes: input.beforeBufferMinutes ?? 30,
      afterBufferMinutes: input.afterBufferMinutes ?? 30,
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
