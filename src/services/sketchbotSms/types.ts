// Shared contract for the SketchBot SMS channel (TAT-49). The webhook route
// and the channel adapter build against these types.

/** One media attachment on an inbound MMS (TAT-50). */
export interface InboundMediaItem {
  /** Twilio media URL (`MediaUrl{N}`) — fetched server-side, never echoed. */
  url: string;
  /** Declared MIME type (`MediaContentType{N}`), lowercase. */
  contentType: string;
}

/** One inbound SMS/MMS, already signature-verified by the webhook route. */
export interface InboundSms {
  /** Sender in E.164 (Twilio's `From`). */
  phone: string;
  /** Message text (Twilio's `Body`), may be empty on media-only MMS. */
  body: string;
  /** MMS attachments, in Twilio's order (TAT-50). */
  media?: InboundMediaItem[];
}

/**
 * What the adapter decided to do with an inbound message. The route renders
 * this as TwiML (and, for a reveal, schedules the async MMS delivery).
 *
 * 'silent'  — say nothing (opted-out sender, empty body). Silence is only
 *             ever used where a reply would itself be the harm; every
 *             guardrail refusal is an in-voice 'reply', never silence.
 * 'reply'   — one SMS-shaped bot turn.
 * 'reveal'  — the user said yes to the proposal and every spend guardrail
 *             passed: reply with `text` (the ack) now, then run
 *             executeReveal() after the response — generation takes minutes,
 *             far beyond Twilio's webhook timeout.
 */
export type InboundOutcome =
  | { kind: 'silent' }
  | { kind: 'reply'; text: string }
  | { kind: 'reveal'; text: string; sessionId: string; phone: string }
  | { kind: 'critique'; text: string; sessionId: string; phone: string; message: string }
  | { kind: 'refine'; text: string; sessionId: string; phone: string; answer: string };

/** What executeReveal() hands back for MMS delivery. */
export interface RevealDelivery {
  /** One entry per cut, sent as sequential MMS (see route docs for why). */
  cuts: Array<{ caption: string; mediaUrl: string }>;
  /** Final text turn: the web link into the session (AR/booking). */
  closingText: string;
}

/**
 * Per-phone profile — the identity + taste anchor of the SMS channel
 * (ADR-0022 lane). Keyed by E.164 number; `uid` is set when the number
 * matches a verified-phone Firebase account (existing-user linking) and the
 * guest profile upgrades in place — sessions and reveal history carry over.
 */
export interface SmsProfile {
  phone: string;
  /** Linked Firebase account, when the phone matches a verified user. */
  uid?: string | null;
  /** Twilio STOP honored — never send this number anything. */
  optedOut: boolean;
  /** The design session the conversation is currently threaded onto. */
  activeSessionId?: string | null;
  /**
   * Conversation stage after the last turn. Engine stages ('chatting',
   * 'proposal', 'handoff') plus the channel-owned ones:
   *
   *   'reveal-pending'   — four renders in flight; a second yes must not re-fire
   *   'revealed'         — cuts delivered; critique and the pick are both live
   *   'critique-running' — one re-cut in flight
   *   'pick-pending'     — pick captured, awaiting the most-not-you tap
   *   'refine-pending'   — pick recorded, awaiting the refinement answer
   *   'refine-running'   — the final regen in flight
   *   'complete'         — Brief exists; the session is closed (ADR-0013)
   */
  lastStage?: string | null;
  /** When the in-flight render was armed — stale-recovery for the *-running stages. */
  revealArmedAt?: string | null;
  /**
   * Variation id chosen at 'revealed', held until the most-not-you tap
   * arrives — recordPick needs both ids at once and refuses a pair that
   * names the same cut twice.
   */
  pendingPickId?: string | null;
  /** Lifetime reveals — drives the account-link gate. */
  totalReveals: number;
  /** Rolling per-day reveal counter (UTC date), reset on date change. */
  dailyReveals: { date: string; count: number };
  /** Every design session this phone has driven — the taste-signal trail. */
  sessionIds: string[];
  createdAt: string;
  updatedAt: string;
}
