/**
 * Design-session orchestrator — the reveal + refinement round
 * (ADR-0012, ADR-0013, ADR-0016).
 *
 * Drives the one-way phase machine intake → revealed → picked → complete
 * over the frozen DesignSession contract, consuming intake, council, and
 * generation strictly through their public entry points.
 */
import { randomUUID } from 'crypto';
import { DEMO_MOCK_IMAGES } from '@/lib/demo-images';
import { extractIntake } from '../../intake';
import type { IntakeRecord } from '../../intake/types';
import { enhanceStructured } from '../../council';
import { generate, routeGeneration } from '../../generation';
import type { AspectRatio, GenerationRequest } from '../../generation';
import { resolveFixAllowance } from '@/lib/studio-fix-allowance';
import type {
  Variation,
  StartSessionRequest,
  PickRequest,
  RefineRequest,
  CritiqueRequest,
  CritiqueResult,
} from '../types';
import { resolveSessionStore } from './store';
import type { SessionStore, StoredSession } from './store';
import { deriveRefinementQuestion, adjustPromptForAnswer } from './refinement';
import { derivePlacementNotes } from './placementNotes';
import { durableRender } from './durableImage';
import { recordImageSpend } from './spend';
import {
  allCuts,
  adjustPromptForCritique,
  cutLabel,
  isFixRequest,
  resolveCritiqueTarget,
} from './critique';
import {
  ALLOWANCE_SPENT_LINE,
  CHATTER_LINE,
  WHICH_CUT_LINE,
  fixLandedLine,
  fixesLeftLine,
} from './critiqueVoice';

export type DesignSessionErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'INVALID_PHASE'
  | 'INVALID_VARIATION'
  | 'REFINEMENT_CLOSED'
  | 'CONVERSATION_UNAVAILABLE';

const ERROR_STATUS: Record<DesignSessionErrorCode, number> = {
  SESSION_NOT_FOUND: 404,
  INVALID_PHASE: 409,
  INVALID_VARIATION: 400,
  REFINEMENT_CLOSED: 409,
  // Every conversation provider is down — the route maps this to 503 and
  // the UI downgrades to the scripted intake (ADR-0019 degraded mode).
  CONVERSATION_UNAVAILABLE: 503,
};

/** Domain error — carries a stable code and the HTTP status routes should map it to. */
export class DesignSessionError extends Error {
  readonly code: DesignSessionErrorCode;
  readonly status: number;

  constructor(code: DesignSessionErrorCode, message: string) {
    super(message);
    this.name = 'DesignSessionError';
    this.code = code;
    this.status = ERROR_STATUS[code];
  }
}

/**
 * Demo mode swaps every paid render for a stock demo image while everything
 * else — intake, council, route resolution/pinning, the phase machine, the
 * ADR-0013 hard stop, persistence — runs the real code paths. Read lazily
 * per call, same as the store seam in ./store.
 */
function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/** Load a stored session or throw SESSION_NOT_FOUND (shared with ./conversation). */
export async function loadSession(store: SessionStore, sessionId: string): Promise<StoredSession> {
  const session = await store.get(sessionId);
  if (!session) {
    throw new DesignSessionError('SESSION_NOT_FOUND', `No design session '${sessionId}'.`);
  }
  return session;
}

/**
 * A generation request pinned to the session's resolved model (ADR-0016).
 * Passing modelId explicitly skips routing, and provider fallback is off:
 * a failed render must surface, never silently cross providers mid-session
 * and poison the pick signal.
 */
function pinnedRequest(
  pin: { modelId: string; aspectRatio?: AspectRatio },
  prompt: string,
  negativePrompt?: string
): GenerationRequest {
  return {
    prompt,
    negativePrompt,
    numImages: 1,
    modelId: pin.modelId,
    aspectRatio: pin.aspectRatio,
    allowProviderFallback: false,
  };
}

/** The image-generation tier: detailed, degrading only if the Council dropped it. */
function generationPrompt(prompts: { simple?: string; detailed?: string; ultra?: string }): string {
  return prompts.detailed ?? prompts.simple ?? prompts.ultra ?? '';
}

/**
 * Start a session from the two scripted intake answers: extraction, then
 * the shared reveal path. This IS the ADR-0019 degraded mode — it stays
 * load-bearing as the LLM-down fallback for the conversational intake.
 */
export async function startSession(request: StartSessionRequest): Promise<StoredSession> {
  const intake = await extractIntake({
    placementAnswer: request.placementAnswer,
    meaningAnswer: request.meaningAnswer,
  });
  return startFromRecord(intake);
}

/**
 * Render one image and capture it durably (TAT-57). Nothing a provider hands
 * back is persistable as-is: Replicate URLs expire within the hour and Vertex
 * inline base64 blows past Firestore's ~1MB document cap. Every URL that
 * leaves this function is an object in our own bucket.
 *
 * `onPurchase` fires the moment the provider answers — before the durable
 * copy — because that is when the money is gone. A copy that then fails must
 * still be billed (see ./spend); a render reused from a previous attempt must
 * not be.
 */
async function renderDurably(
  session: { id: string },
  tag: string,
  request: GenerationRequest,
  onPurchase: () => void
): Promise<string> {
  return durableRender(
    {
      sessionId: session.id,
      tag,
      prompt: request.prompt,
      negativePrompt: request.negativePrompt,
      modelId: request.modelId ?? '',
    },
    async () => {
      const result = await generate(request);
      onPurchase();
      return result.images[0];
    }
  );
}

/**
 * INTERNAL shared reveal path — everything a start does once an
 * IntakeRecord exists: Council structured enhancement → one route resolved
 * and pinned for the whole session (ADR-0016) → four renders (demo mode:
 * free stock images) → persist at phase 'revealed'.
 *
 * `base` upgrades an existing stored session in place — the conversational
 * intake's confirm (ADR-0020) — preserving its id, createdAt, and internal
 * conversation logs (ADR-0022). Omitted, a fresh session is created (the
 * legacy scripted startSession).
 */
export async function startFromRecord(
  intake: IntakeRecord,
  base?: StoredSession
): Promise<StoredSession> {
  const store = resolveSessionStore();
  const enhanced = await enhanceStructured(intake);

  // ADR-0016: resolve the route exactly once. Every render in this session
  // — the four reveal variations AND the later refinement regen — uses this
  // model; the pin is persisted so the regen never re-routes.
  const route = routeGeneration({
    prompt: '',
    style: intake.styleTags[0],
    bodyPart: intake.placement,
  });

  const demo = isDemoMode();
  const now = new Date().toISOString();
  const shell = base ?? { id: randomUUID(), createdAt: now };

  // Settled in a finally: a render that succeeded before a sibling threw was
  // still paid for. allSettled (rather than all) so every in-flight render is
  // accounted for before the failure surfaces.
  let imagesPurchased = 0;
  let variations: Variation[];
  try {
    const results = await Promise.allSettled(
      enhanced.variations.map(async (structured, index): Promise<Variation> => {
        const prompt = generationPrompt(structured.prompts);
        const id = `v${index + 1}`;
        // Demo mode: repo-local stock image instead of a paid render. It is
        // already a permanent same-origin asset, so nothing to capture.
        let imageUrl: string;
        if (demo) {
          imageUrl = DEMO_MOCK_IMAGES[index % DEMO_MOCK_IMAGES.length];
        } else {
          imageUrl = await renderDurably(
            shell,
            id,
            pinnedRequest(route, prompt, structured.negativePrompt),
            () => { imagesPurchased += 1; }
          );
        }
        return {
          id,
          axisPosition: structured.axisPosition as Record<string, string>,
          prompt,
          negativePrompt: structured.negativePrompt,
          imageUrl,
        };
      })
    );
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw (failure as PromiseRejectedResult).reason;
    variations = results.map(result => (result as PromiseFulfilledResult<Variation>).value);
  } finally {
    await recordImageSpend(route.provider, imagesPurchased);
  }

  const session: StoredSession = {
    ...shell,
    phase: 'revealed',
    intake,
    axisSelection: enhanced.axisSelection,
    provider: route.provider,
    pinnedModelId: route.modelId,
    pinnedAspectRatio: route.aspectRatio,
    variations,
    updatedAt: now,
  };

  await store.save(session);
  return session;
}

/**
 * Record the pick + most-not-you tap, derive the ONE refinement question
 * from the picked variation's axis position, and move to phase 'picked'.
 */
export async function recordPick(sessionId: string, request: PickRequest): Promise<StoredSession> {
  const store = resolveSessionStore();
  const session = await loadSession(store, sessionId);

  if (session.phase !== 'revealed') {
    throw new DesignSessionError(
      'INVALID_PHASE',
      `Cannot record a pick while the session is '${session.phase}' — a pick is only valid on a revealed session.`
    );
  }

  const { pickId, mostNotYouId } = request;
  if (pickId === mostNotYouId) {
    throw new DesignSessionError(
      'INVALID_VARIATION',
      'pickId and mostNotYouId must be two different variations.'
    );
  }
  // Cuts the critique lane produced are pickable too (ADR-0039) — a re-cut
  // the user asked for is the likeliest thing they want to take forward.
  const cuts = allCuts(session);
  const picked = cuts.find(variation => variation.id === pickId);
  const rejected = cuts.find(variation => variation.id === mostNotYouId);
  if (!picked || !rejected) {
    throw new DesignSessionError(
      'INVALID_VARIATION',
      `Unknown variation id '${!picked ? pickId : mostNotYouId}' for session '${sessionId}'.`
    );
  }

  session.pickId = pickId;
  session.mostNotYouId = mostNotYouId;
  session.refinementQuestion = deriveRefinementQuestion(session, picked);
  session.phase = 'picked';
  session.updatedAt = new Date().toISOString();

  await store.save(session);
  return session;
}

/**
 * The single refinement round (ADR-0013 hard stop): adjust the picked
 * variation's prompt from the answer, regenerate ONE image on the pinned
 * model, assemble the Brief, and close the session at phase 'complete'.
 * Any call when the phase is not 'picked' is a domain error — there is
 * never a second regen.
 */
export async function refine(sessionId: string, request: RefineRequest): Promise<StoredSession> {
  const store = resolveSessionStore();
  const session = await loadSession(store, sessionId);

  if (session.phase !== 'picked') {
    if (session.phase === 'complete') {
      throw new DesignSessionError(
        'REFINEMENT_CLOSED',
        'This session already used its one refinement round (ADR-0013 hard stop) — the canvas and the artist consult own everything after.'
      );
    }
    throw new DesignSessionError(
      'INVALID_PHASE',
      `Cannot refine while the session is '${session.phase}' — refinement follows a recorded pick.`
    );
  }

  const cuts = allCuts(session);
  const picked = cuts.find(variation => variation.id === session.pickId);
  if (!picked) {
    throw new DesignSessionError(
      'INVALID_VARIATION',
      `Session '${sessionId}' pick no longer matches its variations.`
    );
  }
  const rejected = cuts.find(variation => variation.id === session.mostNotYouId);

  const adjustedPrompt = adjustPromptForAnswer(session, picked, request.answer);
  let imageUrl: string | undefined;
  if (isDemoMode()) {
    // Demo regen: the stock image after the picked one, so the refinement
    // visibly changes the design without a paid render.
    const pickedIndex = cuts.indexOf(picked);
    imageUrl = DEMO_MOCK_IMAGES[(pickedIndex + 1) % DEMO_MOCK_IMAGES.length];
  } else {
    let imagesPurchased = 0;
    try {
      // ADR-0016: the regen reuses the exact model pinned at session start.
      imageUrl = await renderDurably(
        session,
        `${picked.id}-refined`,
        pinnedRequest(
          { modelId: session.pinnedModelId, aspectRatio: session.pinnedAspectRatio },
          adjustedPrompt,
          picked.negativePrompt
        ),
        () => { imagesPurchased = 1; }
      );
    } finally {
      await recordImageSpend(session.provider, imagesPurchased);
    }
  }

  session.refinementAnswer = request.answer;
  session.refinedVariation = {
    id: `${picked.id}-refined`,
    axisPosition: picked.axisPosition,
    prompt: adjustedPrompt,
    negativePrompt: picked.negativePrompt,
    imageUrl,
  };
  session.brief = {
    placement: session.intake.placement,
    styleTags: session.intake.styleTags,
    // Verbatim from intake — the brief carries the user's own words (ADR-0010).
    meaning: session.intake.meaning,
    references: session.intake.references,
    finalImageUrl: session.refinedVariation.imageUrl,
    axisSelection: session.axisSelection,
    placementNotes: derivePlacementNotes(
      session.intake.placement,
      session.intake.styleTags,
      picked.axisPosition
    ),
    rejectedAxisPosition: rejected?.axisPosition,
  };
  session.phase = 'complete';
  session.updatedAt = new Date().toISOString();

  await store.save(session);
  return session;
}

/**
 * One post-reveal critique turn (ADR-0039): the chat that used to die at the
 * reveal, kept alive so plain criticism — "riku's missing", "too busy", "the
 * third one but less color" — lands somewhere useful.
 *
 * Deterministic throughout (see ./critique): resolve which cut the critique is
 * about, fold the user's own words into that cut's prompt, and regenerate ONE
 * image on the session's pinned model (ADR-0016). Three turns spend nothing —
 * chatter, an unresolvable target, and a spent allowance — and each says so in
 * voice (ADR-0038's rule: the ceiling is spoken and ends in an artist).
 *
 * Open at phases 'revealed' and 'picked' only. At 'complete' the ADR-0013
 * round has fired and produced the Brief; the Studio and the artist own
 * everything after.
 */
export async function critique(
  sessionId: string,
  request: CritiqueRequest
): Promise<{ session: StoredSession } & Omit<CritiqueResult, 'session'>> {
  const store = resolveSessionStore();
  const session = await loadSession(store, sessionId);

  if (session.phase !== 'revealed' && session.phase !== 'picked') {
    throw new DesignSessionError(
      'INVALID_PHASE',
      session.phase === 'complete'
        ? 'This session already closed with its Brief (ADR-0013 hard stop) — the Studio and the artist consult own everything after.'
        : `Cannot critique while the session is '${session.phase}' — there is nothing revealed to talk about yet.`
    );
  }

  const message = request.message.trim();
  const allowance = resolveFixAllowance();
  const used = session.fixesUsed ?? 0;
  const remainingBefore = Math.max(0, allowance - used);

  /** Record the turn and persist without spending anything. */
  const settle = async (
    reply: string,
    extra: { targetId?: string; cutId?: string } = {}
  ) => {
    const now = new Date().toISOString();
    session.critiqueTurns = [
      ...(session.critiqueTurns ?? []),
      { message, reply, ...extra, at: now },
    ];
    session.updatedAt = now;
    await store.save(session);
    const remaining = Math.max(0, allowance - (session.fixesUsed ?? 0));
    return {
      session,
      reply,
      fixesRemaining: remaining,
      exhausted: remaining <= 0,
      generated: false as boolean,
    };
  };

  if (!isFixRequest(message)) return settle(CHATTER_LINE);
  // Refused before any paid call, and spoken — never a silent no-op.
  if (remainingBefore <= 0) return settle(ALLOWANCE_SPENT_LINE);

  const target = resolveCritiqueTarget(session, message);
  if (!target) return settle(WHICH_CUT_LINE);

  const adjustedPrompt = adjustPromptForCritique(target, message);
  const cutId = `${target.id}-fix${used + 1}`;

  let imageUrl: string | undefined;
  if (isDemoMode()) {
    // Demo re-cut: the stock image after the target's, so the fix visibly
    // changes the design without a paid render.
    const index = allCuts(session).indexOf(target);
    imageUrl = DEMO_MOCK_IMAGES[(index + 1) % DEMO_MOCK_IMAGES.length];
  } else {
    // ADR-0016: the re-cut reuses the exact model pinned at session start.
    // It goes through renderDurably for the same reason every other render
    // does — a provider URL dies in an hour, and a re-cut is the image the
    // customer asked for by name, so it is the LAST one that may expire.
    let purchased = 0;
    try {
      imageUrl = await renderDurably(
        session,
        cutId,
        pinnedRequest(
          { modelId: session.pinnedModelId, aspectRatio: session.pinnedAspectRatio },
          adjustedPrompt,
          target.negativePrompt
        ),
        () => {
          purchased += 1;
        }
      );
    } finally {
      // Billed at the moment of purchase, so a copy that fails after a paid
      // render still records the money; a reuse records nothing.
      await recordImageSpend(session.provider, purchased);
    }
  }

  const cut: Variation = {
    id: cutId,
    axisPosition: target.axisPosition,
    prompt: adjustedPrompt,
    negativePrompt: target.negativePrompt,
    imageUrl,
  };
  session.critiqueCuts = [...(session.critiqueCuts ?? []), cut];
  // Only a render that came back counts against the allowance — same rule the
  // Studio's ledger follows.
  session.fixesUsed = used + 1;

  const remainingAfter = Math.max(0, allowance - session.fixesUsed);
  const settled = await settle(
    `${fixLandedLine(cutLabel(session, target))} ${fixesLeftLine(remainingAfter)}`,
    { targetId: target.id, cutId }
  );
  return { ...settled, cut, generated: true };
}

/** Fetch a session by id. Throws SESSION_NOT_FOUND when it doesn't exist. */
export async function getSession(sessionId: string): Promise<StoredSession> {
  return loadSession(resolveSessionStore(), sessionId);
}

/**
 * Attach the placement-preview screenshot URL to a completed session's
 * Brief. The preview is a canvas artifact, not a regen — it does not touch
 * the ADR-0013 hard stop, and re-placing overwrites the previous preview.
 * Only allowed at phase 'complete': the Brief is what carries it into the
 * booking record, and the Brief only exists after the refinement round.
 */
export async function attachPlacementPreview(
  sessionId: string,
  previewUrl: string
): Promise<StoredSession> {
  const store = resolveSessionStore();
  const session = await loadSession(store, sessionId);

  if (session.phase !== 'complete' || !session.brief) {
    throw new DesignSessionError(
      'INVALID_PHASE',
      `Cannot attach a placement preview while the session is '${session.phase}' — the preview belongs to the finished Brief.`
    );
  }

  session.brief.placementPreviewUrl = previewUrl;
  session.updatedAt = new Date().toISOString();

  await store.save(session);
  return session;
}
