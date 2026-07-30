/**
 * SMS ↔ conversation-engine channel adapter (TAT-49).
 *
 * Maps inbound texts onto the EXISTING design-session machinery — the same
 * brain as the web chat, consumed only via '@/services/designSession''s
 * public entry — with the SMS channel's own identity (phone → profile),
 * rendering (render.ts), and the REQUIRED spend guardrails:
 *
 *   1. per-phone daily reveal cap   SKETCHBOT_SMS_REVEALS_PER_DAY (2/day)
 *      — consumed ATOMICALLY before generation (profileStore.tryConsumeReveal)
 *   2. account-link gate            SKETCHBOT_SMS_FREE_REVEALS (2 lifetime)
 *      — an unlinked number can never pass this many reveals, ever
 *   3. global budget                checkBudget/recordSpend, the exact same
 *      BUDGET_MAX_SPEND_CENTS pool and cost constants as /api/v1/generate
 *   4. per-phone message rate limit — enforced by the webhook route
 *      ('sms-inbound' in src/lib/rate-limit.ts)
 *
 * Every refusal is an in-voice SMS reply (honest capacity, a judgment call,
 * an invitation) — never an HTTP status nobody reads and never silence.
 *
 * Worst case for an unknown number per UTC day:
 *   min(SKETCHBOT_SMS_REVEALS_PER_DAY, remaining free reveals) × 4 images
 *   × per-image cost — with the defaults, 2 × 4 × VERTEX_IMAGEN_COST_CENTS
 *   = 32¢, and never more than 2 reveals lifetime without an account.
 */
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import {
  checkBudget,
  recordConversationTurnSpend,
} from '@/lib/budget-tracker';
// Route-layer helper reused deliberately: the SMS reveal must spend from the
// same pool with the same per-provider cost constants as the web reveal —
// duplicating them here is how two channels drift apart.
import {
  recordImageSpend,
} from '@/app/api/v1/design-session/shared';
import { resolveSharedDesignStore, type SharedDesign } from '@/lib/shared-design-store';
import {
  converse,
  confirmProposal,
  attachReference,
  DesignSessionError,
} from '@/services/designSession';
import {
  referenceFollowUpText,
  REFERENCE_UNREADABLE_TEXT,
  REFERENCE_BUDGET_TEXT,
  type ReferenceAnalysis,
} from '@/services/vision';
// One yes-vocabulary for every channel: the same deterministic gate the web
// chat uses to decide "advance to confirm vs. keep talking". A drifted SMS
// copy of this list is a real bug class — a phrase that reveals on the web
// but argues over SMS.
import { isConfirmationIntent } from '@/features/design-session/services/confirmationIntent';
import type { InboundSms, InboundOutcome, RevealDelivery, SmsProfile } from '../types';
import { resolveProfileStore, newProfile } from './profileStore';
import { analyzeInboundMedia, type MediaIngest } from './media';
import {
  renderSmsReply,
  REVEAL_ACK,
  BUDGET_EXHAUSTED_TEXT,
  REVEAL_FAILED_TEXT,
  capReachedText,
  linkGateText,
  unavailableText,
  revealClosingText,
  cutCaption,
  referenceAckText,
} from './render';

/** After this long, an unreported in-flight reveal is presumed dead. */
const REVEAL_PENDING_STALE_MS = 10 * 60 * 1000;

/** Per-phone reveal cap per UTC day. REQUIRED guardrail, env-tunable. */
export function revealsPerDay(): number {
  return Number(process.env.SKETCHBOT_SMS_REVEALS_PER_DAY) || 2;
}

/** Lifetime reveals before an unlinked number hits the account-link gate. */
export function freeReveals(): number {
  return Number(process.env.SKETCHBOT_SMS_FREE_REVEALS) || 2;
}

/**
 * Public base for links texted to users. tatttester.com is the brand domain
 * (ADR-0004) — a localhost fallback in an SMS would be a dead link, so the
 * fallback is the public site, and NEXT_PUBLIC_APP_URL overrides per env.
 */
function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://tatttester.com'
  ).replace(/\/$/, '');
}

function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/** Last 4 digits — enough to correlate log lines, never a full number. */
function phoneLast4(phone: string): string {
  return phone.slice(-4);
}

/**
 * Existing-user linking: a Firebase account whose VERIFIED phone matches
 * the texter upgrades the guest profile in place. Best-effort — no account
 * (or no Admin creds) just means the profile stays phone-first guest.
 */
async function lookupUidByPhone(phone: string): Promise<string | null> {
  try {
    // getAuth() throws on an uninitialized app (creds-less dev) — that and
    // "no user with this phone" both land in the catch: guest profile.
    const { getAuth } = await import('firebase-admin/auth');
    const user = await getAuth().getUserByPhoneNumber(phone);
    return user.uid;
  } catch {
    return null;
  }
}

async function loadOrCreateProfile(phone: string): Promise<SmsProfile> {
  const store = resolveProfileStore();
  const existing = await store.get(phone);
  if (existing) return existing;
  const profile = newProfile(phone);
  // First contact: check for an existing account with this verified phone.
  profile.uid = await lookupUidByPhone(phone);
  await store.save(profile);
  logger.info({
    event_type: 'sketchbot_sms.profile_created',
    phone_last4: phoneLast4(phone),
    linked: !!profile.uid,
  });
  return profile;
}

/**
 * Twilio opt-out bookkeeping. Twilio's advanced opt-out already sent the
 * compliance auto-reply before we see the message — this only records the
 * state so no code path (especially the async reveal MMS) ever messages an
 * opted-out number again. START re-opens; HELP changes nothing.
 */
export async function recordOptOut(phone: string, optOutType: string): Promise<void> {
  const type = optOutType.toUpperCase();
  if (type !== 'STOP' && type !== 'START') return;
  const store = resolveProfileStore();
  const profile = (await store.get(phone)) ?? newProfile(phone);
  profile.optedOut = type === 'STOP';
  profile.updatedAt = new Date().toISOString();
  await store.save(profile);
  logger.info({
    event_type: 'sketchbot_sms.opt_out_recorded',
    phone_last4: phoneLast4(phone),
    opt_out_type: type,
  });
}

/** True when this number must never be messaged (STOP on record). */
export async function isOptedOut(phone: string): Promise<boolean> {
  const profile = await resolveProfileStore().get(phone);
  return profile?.optedOut === true;
}

/**
 * One inbound message → one outcome. Everything synchronous happens here
 * (conversation turn, guardrail checks); only image generation is deferred
 * to executeReveal because it outlives Twilio's webhook timeout.
 */
export async function handleInbound(inbound: InboundSms): Promise<InboundOutcome> {
  const phone = inbound.phone.trim();
  const body = inbound.body.trim();
  const media = inbound.media ?? [];
  const store = resolveProfileStore();
  const profile = await loadOrCreateProfile(phone);

  // Belt and braces with the route's OptOutType screen: an opted-out number
  // gets nothing, ever. Twilio suppresses our sends too (error 21610).
  if (profile.optedOut) return { kind: 'silent' };

  if (!body && media.length === 0) {
    // An empty ping with nothing attached — the engine needs words.
    return {
      kind: 'reply',
      text: 'Tell me in words first — what are you thinking, and where on your body would it go?',
    };
  }

  // ── Renders in flight: never double-fire on an impatient second yes ──
  // Media sent mid-render is deliberately NOT analyzed: no vision spend on
  // a message that cannot attach to anything yet.
  if (profile.lastStage === 'reveal-pending') {
    const armedAtMs = Date.parse(profile.revealArmedAt ?? '') || 0;
    if (Date.now() - armedAtMs < REVEAL_PENDING_STALE_MS) {
      return {
        kind: 'reply',
        text: 'Still sketching — your four cuts land here in a minute or two.',
      };
    }
    // The in-flight reveal died without reporting (crashed instance). The
    // slot was refunded only if the failure path ran, so recover to
    // 'proposal': a fresh "yes" re-arms through every guardrail again.
    profile.lastStage = 'proposal';
    profile.revealArmedAt = null;
    await store.save(profile);
  }

  // ── Reference photos (TAT-50): fetch → vision → attach, before routing ──
  // Vision spends from the global budget inside the analyzer; nothing here
  // touches the reveal caps. The ack names what was seen — SketchBot never
  // silently ingests an image.
  let ingest: MediaIngest | null = null;
  let ackText = '';
  if (media.length > 0) {
    ingest = await analyzeInboundMedia(media);
    ackText = await attachAnalyses(profile, store, ingest);
  }

  if (!body) {
    // Media-only MMS: the ack (or the honest failure line) IS the turn,
    // plus the one most useful follow-up when something was read.
    const followUp =
      ingest && ingest.analyses.length > 0
        ? referenceFollowUpText(ingest.analyses[0])
        : '';
    return {
      kind: 'reply',
      text: renderSmsReply([ackText, followUp].filter(Boolean).join(' ')),
    };
  }

  // ── The yes to a proposal: arm the reveal, guardrails first ──────────
  // Any references were attached above, so the confirm-time merge already
  // carries them into Council enhancement and the Brief.
  if (
    profile.activeSessionId &&
    profile.lastStage === 'proposal' &&
    isConfirmationIntent(body)
  ) {
    return withReferenceAck(await armReveal(profile, store), ackText);
  }

  // ── A regular conversation turn on the shared engine ─────────────────
  return withReferenceAck(
    await conversationTurn(profile, store, withMediaAnnotation(body, ingest)),
    ackText
  );
}

/**
 * Attach a message's analyzed references to a session (creating one via
 * the free deterministic opener when the phone has no continuable
 * conversation) and return the in-voice acknowledgment. Attachment is
 * best-effort — a stale session must never eat the user's message.
 */
async function attachAnalyses(
  profile: SmsProfile,
  store: ProfileStoreT,
  ingest: MediaIngest
): Promise<string> {
  if (ingest.analyses.length === 0) {
    // Nothing readable: honest capacity when the budget gate refused,
    // honest failure otherwise — never silence, never a fake reading.
    return ingest.budgetExhausted ? REFERENCE_BUDGET_TEXT : REFERENCE_UNREADABLE_TEXT;
  }

  const sessionId = await ensureAttachableSession(profile, store);
  if (sessionId) {
    for (const analysis of ingest.analyses) {
      try {
        await attachReference(sessionId, analysis, 'sms');
      } catch (error) {
        logger.warn({
          event_type: 'sketchbot_sms.reference_attach_failed',
          phone_last4: phoneLast4(profile.phone),
          session_id: sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return referenceAckText(ingest.analyses, ingest.ignored, ingest.unreadable);
}

/**
 * The session a reference can attach to: the active conversational-intake
 * session, or a fresh one opened via the deterministic (free) opener call.
 */
async function ensureAttachableSession(
  profile: SmsProfile,
  store: ProfileStoreT
): Promise<string | null> {
  const continuable =
    profile.activeSessionId &&
    (profile.lastStage === 'chatting' || profile.lastStage === 'proposal');
  if (continuable) return profile.activeSessionId!;

  try {
    const opened = await converse({});
    profile.activeSessionId = opened.sessionId;
    profile.lastStage = opened.stage;
    if (!profile.sessionIds.includes(opened.sessionId)) {
      profile.sessionIds = [...profile.sessionIds, opened.sessionId];
    }
    profile.updatedAt = new Date().toISOString();
    await store.save(profile);
    return opened.sessionId;
  } catch (error) {
    logger.warn({
      event_type: 'sketchbot_sms.reference_session_failed',
      phone_last4: phoneLast4(profile.phone),
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Represent analyzed photos inside the engine turn as a bracketed textual
 * annotation on the user's message. Deliberate double coverage with the
 * structured merge: the annotation gives the MODEL the context (so its
 * reply and extraction can react to the photo), and naming the recognized
 * characters in text runs them through the exact TAT-47 subject-scan
 * machinery a typed mention would hit — while the stored reference entry
 * guarantees the signals deterministically either way.
 */
function withMediaAnnotation(body: string, ingest: MediaIngest | null): string {
  if (!ingest || ingest.analyses.length === 0) return body;
  const annotations = ingest.analyses
    .map((analysis: ReferenceAnalysis) => {
      const characters = analysis.characters
        .map((c) => (c.series ? `${c.name} (${c.series})` : c.name))
        .join(', ');
      return characters
        ? `[photo attached — ${analysis.summary}; recognizable characters: ${characters}]`
        : `[photo attached — ${analysis.summary}]`;
    })
    .join(' ');
  return `${body} ${annotations}`;
}

/** Prepend the reference ack to whatever the routed outcome replied. */
function withReferenceAck(outcome: InboundOutcome, ackText: string): InboundOutcome {
  if (!ackText || outcome.kind === 'silent') return outcome;
  return { ...outcome, text: renderSmsReply(`${ackText} ${outcome.text}`) };
}

type ProfileStoreT = ReturnType<typeof resolveProfileStore>;

async function armReveal(
  profile: SmsProfile,
  store: ProfileStoreT
): Promise<InboundOutcome> {
  const phone = profile.phone;
  const base = appBaseUrl();

  // Late upgrade: the texter may have created/linked an account since the
  // conversation started — re-check before the gate refuses them.
  if (!profile.uid) {
    profile.uid = await lookupUidByPhone(phone);
    if (profile.uid) await store.save(profile);
  }

  // Guardrail 2 — account-link gate: free reveals are lifetime, not daily.
  if (!profile.uid && profile.totalReveals >= freeReveals()) {
    logger.info({
      event_type: 'sketchbot_sms.link_gate',
      phone_last4: phoneLast4(phone),
      total_reveals: profile.totalReveals,
    });
    return { kind: 'reply', text: linkGateText(`${base}/signup`) };
  }

  // Guardrail 1 — atomic daily-cap reserve. Consumed BEFORE generation;
  // refunded only if generation later fails.
  const reserved = await store.tryConsumeReveal(phone, revealsPerDay());
  if (!reserved) {
    logger.info({
      event_type: 'sketchbot_sms.reveal_cap_hit',
      phone_last4: phoneLast4(phone),
    });
    return { kind: 'reply', text: capReachedText(`${base}/design`) };
  }

  // Guardrail 3 — the global pool. Demo mode renders free stock images, so
  // budget policy is skipped there, matching the web confirm route.
  if (!isDemoMode()) {
    const budget = await checkBudget();
    if (!budget.allowed) {
      await store.releaseReveal(phone);
      logger.warn({
        event_type: 'sketchbot_sms.budget_exhausted',
        phone_last4: phoneLast4(phone),
        spent_cents: budget.spentCents,
      });
      return { kind: 'reply', text: BUDGET_EXHAUSTED_TEXT };
    }
  }

  // Re-read before mutating: tryConsumeReveal just advanced the counters in
  // the store, and saving the pre-consume object here would silently roll
  // them back — the exact clobber the atomic reserve exists to prevent.
  const fresh = (await store.get(phone)) ?? profile;
  fresh.lastStage = 'reveal-pending';
  fresh.revealArmedAt = new Date().toISOString();
  fresh.updatedAt = fresh.revealArmedAt;
  await store.save(fresh);

  logger.info({
    event_type: 'sketchbot_sms.reveal_armed',
    phone_last4: phoneLast4(phone),
    session_id: profile.activeSessionId,
  });
  return {
    kind: 'reveal',
    text: REVEAL_ACK,
    sessionId: profile.activeSessionId!,
    phone,
  };
}

async function conversationTurn(
  profile: SmsProfile,
  store: ProfileStoreT,
  body: string
): Promise<InboundOutcome> {
  const base = appBaseUrl();
  // Thread onto the active session only while it is still in conversational
  // intake; after a reveal (or handoff) a new text starts a new design.
  const continuable =
    profile.activeSessionId &&
    (profile.lastStage === 'chatting' || profile.lastStage === 'proposal');

  let response;
  try {
    response = await converse({
      ...(continuable ? { sessionId: profile.activeSessionId! } : {}),
      message: body,
    });
  } catch (error) {
    if (error instanceof DesignSessionError) {
      if (error.code === 'CONVERSATION_UNAVAILABLE') {
        return { kind: 'reply', text: unavailableText(`${base}/design`) };
      }
      // Stale thread (session advanced past intake, closed at handoff, or
      // expired from the store) — start fresh with the same message.
      try {
        response = await converse({ message: body });
      } catch (retryError) {
        if (
          retryError instanceof DesignSessionError &&
          retryError.code === 'CONVERSATION_UNAVAILABLE'
        ) {
          return { kind: 'reply', text: unavailableText(`${base}/design`) };
        }
        throw retryError;
      }
    } else {
      throw error;
    }
  }

  // Same per-turn budget line item as the web converse route; demo turns
  // run the engine's free script — nothing to record.
  if (!isDemoMode()) await recordConversationTurnSpend();

  const isNewSession = response.sessionId !== profile.activeSessionId;
  profile.activeSessionId = response.sessionId;
  profile.lastStage = response.stage;
  if (isNewSession && !profile.sessionIds.includes(response.sessionId)) {
    // The taste trail (ADR-0022): every session this phone drives is
    // reachable from the profile, so signals accrue across conversations.
    profile.sessionIds = [...profile.sessionIds, response.sessionId];
  }

  let text = renderSmsReply(response.reply);
  if (response.stage === 'handoff') {
    // The warm handoff closes the conversation (ADR-0021) — the CTA link
    // rides after the reply so tightening can never drop it.
    text = `${text} ${base}${response.handoffUrl ?? '/smart-match'}`;
    profile.activeSessionId = null;
    profile.lastStage = null;
  }

  profile.updatedAt = new Date().toISOString();
  await store.save(profile);

  logger.info({
    event_type: 'sketchbot_sms.turn',
    phone_last4: phoneLast4(profile.phone),
    session_id: response.sessionId,
    stage: response.stage,
    turn: response.turn,
  });

  return { kind: 'reply', text };
}

/**
 * The deferred half of a reveal: runs AFTER the webhook already answered
 * (four renders take minutes; Twilio gives webhooks seconds). The daily-cap
 * slot was reserved in armReveal — a failure here refunds it, tells the
 * user honestly, and never leaves them waiting on nothing.
 */
export async function executeReveal(sessionId: string, phone: string): Promise<RevealDelivery> {
  const store = resolveProfileStore();
  const demo = isDemoMode();

  let session;
  try {
    session = await confirmProposal(sessionId);
  } catch (error) {
    // Refund the reserved cap slot and re-arm the proposal so a fresh
    // "yes" can retry — the failure text promises exactly that.
    await store.releaseReveal(phone);
    const profile = await store.get(phone);
    if (profile) {
      profile.lastStage = 'proposal';
      profile.revealArmedAt = null;
      profile.updatedAt = new Date().toISOString();
      await store.save(profile);
    }
    logger.error({
      event_type: 'sketchbot_sms.reveal_failed',
      phone_last4: phoneLast4(phone),
      session_id: sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { cuts: [], closingText: REVEAL_FAILED_TEXT };
  }

  // Same spend recording as the web confirm route (4 images, per-provider
  // constants); demo renders are free stock images.
  if (!demo) await recordImageSpend(session.provider, session.variations.length);

  const profile = (await store.get(phone)) ?? newProfile(phone);
  profile.lastStage = 'revealed';
  profile.revealArmedAt = null;
  profile.updatedAt = new Date().toISOString();
  await store.save(profile);

  const cutUrls = session.variations
    .map((variation) => variation.imageUrl)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);

  // The bridge into the web session: a durable public share of the four
  // cuts (/share/<id> — same store the web share flow writes). Falls back
  // to the design surface when no durable store is available.
  const link = await mintShareLink(session, profile, cutUrls);

  logger.info({
    event_type: 'sketchbot_sms.reveal_delivered',
    phone_last4: phoneLast4(phone),
    session_id: session.id,
    provider: session.provider,
    cuts: cutUrls.length,
  });

  return {
    cuts: cutUrls.map((mediaUrl, index) => ({
      caption: cutCaption(index, cutUrls.length),
      mediaUrl,
    })),
    closingText: revealClosingText(link),
  };
}

async function mintShareLink(
  session: Awaited<ReturnType<typeof confirmProposal>>,
  profile: SmsProfile,
  cutUrls: string[]
): Promise<string> {
  const base = appBaseUrl();
  const fallback = `${base}/design`;
  if (cutUrls.length === 0) return fallback;
  const shareStore = resolveSharedDesignStore();
  if (!shareStore) return fallback;
  try {
    const shareId = randomUUID().slice(0, 10);
    const now = new Date().toISOString();
    const share: SharedDesign = {
      shareId,
      imageUrl: cutUrls[0],
      imageUrls: cutUrls,
      prompt: session.intake.subject || session.intake.meaning || session.variations[0].prompt,
      style: session.intake.styleTags[0],
      bodyPart: session.intake.placement,
      uid: profile.uid ?? null,
      generatedAt: now,
      sharedAt: now,
      shareUrl: `${base}/share/${shareId}`,
      views: 0,
    };
    await shareStore.save(share);
    return share.shareUrl;
  } catch (error) {
    logger.warn({
      event_type: 'sketchbot_sms.share_mint_failed',
      session_id: session.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}
