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
import type {
  Variation,
  StartSessionRequest,
  PickRequest,
  RefineRequest,
} from '../types';
import { resolveSessionStore } from './store';
import type { SessionStore, StoredSession } from './store';
import { deriveRefinementQuestion, adjustPromptForAnswer } from './refinement';
import { derivePlacementNotes } from './placementNotes';

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
 * Firestore documents cap at ~1MB, but Vertex Imagen returns images as
 * inline base64 data URLs — megabytes each. Anything inline moves to GCS
 * before it can be persisted; hosted URLs (Replicate, demo stock) pass
 * through untouched.
 */
async function persistableImageUrl(
  imageUrl: string,
  sessionId: string,
  tag: string
): Promise<string> {
  if (!imageUrl.startsWith('data:')) return imageUrl;
  const base64 = imageUrl.slice(imageUrl.indexOf(',') + 1);
  const { uploadToGCS } = await import('../../gcs-service');
  const upload = await uploadToGCS(
    Buffer.from(base64, 'base64'),
    `design-sessions/${sessionId}/${tag}-${Date.now()}.png`
  );
  return upload.url;
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
  const variations: Variation[] = await Promise.all(
    enhanced.variations.map(async (structured, index) => {
      const prompt = generationPrompt(structured.prompts);
      // Demo mode: stock image instead of a paid render; everything else real.
      const imageUrl = demo
        ? DEMO_MOCK_IMAGES[index % DEMO_MOCK_IMAGES.length]
        : await persistableImageUrl(
            (await generate(pinnedRequest(route, prompt, structured.negativePrompt))).images[0],
            shell.id,
            `v${index + 1}`
          );
      return {
        id: `v${index + 1}`,
        axisPosition: structured.axisPosition as Record<string, string>,
        prompt,
        negativePrompt: structured.negativePrompt,
        imageUrl,
      };
    })
  );
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
  const picked = session.variations.find(variation => variation.id === pickId);
  const rejected = session.variations.find(variation => variation.id === mostNotYouId);
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

  const picked = session.variations.find(variation => variation.id === session.pickId);
  if (!picked) {
    throw new DesignSessionError(
      'INVALID_VARIATION',
      `Session '${sessionId}' pick no longer matches its variations.`
    );
  }
  const rejected = session.variations.find(variation => variation.id === session.mostNotYouId);

  const adjustedPrompt = adjustPromptForAnswer(session, picked, request.answer);
  let imageUrl: string | undefined;
  if (isDemoMode()) {
    // Demo regen: the stock image after the picked one, so the refinement
    // visibly changes the design without a paid render.
    const pickedIndex = session.variations.indexOf(picked);
    imageUrl = DEMO_MOCK_IMAGES[(pickedIndex + 1) % DEMO_MOCK_IMAGES.length];
  } else {
    // ADR-0016: the regen reuses the exact model pinned at session start.
    const result = await generate(
      pinnedRequest(
        { modelId: session.pinnedModelId, aspectRatio: session.pinnedAspectRatio },
        adjustedPrompt,
        picked.negativePrompt
      )
    );
    imageUrl = await persistableImageUrl(result.images[0], session.id, `${picked.id}-refined`);
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
