/**
 * Design-session orchestrator — the reveal + refinement round
 * (ADR-0012, ADR-0013, ADR-0016).
 *
 * Drives the one-way phase machine intake → revealed → picked → complete
 * over the frozen DesignSession contract, consuming intake, council, and
 * generation strictly through their public entry points.
 */
import { randomUUID } from 'crypto';
import { extractIntake } from '../../intake';
import { enhanceStructured } from '../../council';
import { generate, routeGeneration } from '../../generation';
import type { AspectRatio, GenerationRequest } from '../../generation';
import type {
  DesignSession,
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
  | 'REFINEMENT_CLOSED';

const ERROR_STATUS: Record<DesignSessionErrorCode, number> = {
  SESSION_NOT_FOUND: 404,
  INVALID_PHASE: 409,
  INVALID_VARIATION: 400,
  REFINEMENT_CLOSED: 409,
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

async function loadSession(store: SessionStore, sessionId: string): Promise<StoredSession> {
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
 * Start a session: intake extraction → Council structured enhancement →
 * four renders on ONE provider resolved once and pinned for the whole
 * session (ADR-0016). Persists and returns the session in phase 'revealed'.
 */
export async function startSession(request: StartSessionRequest): Promise<DesignSession> {
  const store = resolveSessionStore();

  const intake = await extractIntake({
    placementAnswer: request.placementAnswer,
    meaningAnswer: request.meaningAnswer,
  });
  const enhanced = await enhanceStructured(intake);

  // ADR-0016: resolve the route exactly once. Every render in this session
  // — the four reveal variations AND the later refinement regen — uses this
  // model; the pin is persisted so the regen never re-routes.
  const route = routeGeneration({
    prompt: '',
    style: intake.styleTags[0],
    bodyPart: intake.placement,
  });

  const variations: Variation[] = await Promise.all(
    enhanced.variations.map(async (structured, index) => {
      const prompt = generationPrompt(structured.prompts);
      const result = await generate(pinnedRequest(route, prompt, structured.negativePrompt));
      return {
        id: `v${index + 1}`,
        axisPosition: structured.axisPosition as Record<string, string>,
        prompt,
        negativePrompt: structured.negativePrompt,
        imageUrl: result.images[0],
      };
    })
  );

  const now = new Date().toISOString();
  const session: StoredSession = {
    id: randomUUID(),
    phase: 'revealed',
    intake,
    axisSelection: enhanced.axisSelection,
    provider: route.provider,
    pinnedModelId: route.modelId,
    pinnedAspectRatio: route.aspectRatio,
    variations,
    createdAt: now,
    updatedAt: now,
  };

  await store.save(session);
  return session;
}

/**
 * Record the pick + most-not-you tap, derive the ONE refinement question
 * from the picked variation's axis position, and move to phase 'picked'.
 */
export async function recordPick(sessionId: string, request: PickRequest): Promise<DesignSession> {
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
export async function refine(sessionId: string, request: RefineRequest): Promise<DesignSession> {
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
  // ADR-0016: the regen reuses the exact model pinned at session start.
  const result = await generate(
    pinnedRequest(
      { modelId: session.pinnedModelId, aspectRatio: session.pinnedAspectRatio },
      adjustedPrompt,
      picked.negativePrompt
    )
  );

  session.refinementAnswer = request.answer;
  session.refinedVariation = {
    id: `${picked.id}-refined`,
    axisPosition: picked.axisPosition,
    prompt: adjustedPrompt,
    negativePrompt: picked.negativePrompt,
    imageUrl: result.images[0],
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
export async function getSession(sessionId: string): Promise<DesignSession> {
  return loadSession(resolveSessionStore(), sessionId);
}
