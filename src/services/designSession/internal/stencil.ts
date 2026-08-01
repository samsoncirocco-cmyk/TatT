/**
 * Deriving the artist's stencil from the design the customer approved.
 *
 * A session produces two artifacts for two different readers. The customer
 * approves a rendered design — colour if they asked for colour. The artist
 * needs black line art they can trace, resize, and rearrange. Those are not
 * the same file, and the customer's one is not usable as the artist's.
 *
 * The stencil is derived from the approved IMAGE, not re-prompted from the
 * session's text. Re-prompting produces a different tattoo — different pose,
 * different arrangement — and handing an artist a stencil of something the
 * customer never approved is worse than handing them nothing. Image-to-image
 * is what keeps the composition fixed while only the rendering changes.
 *
 * Deliberately NOT the browser stencil path (src/features/stencil): running
 * Sobel + threshold over a shaded colour render reads every shading boundary
 * as a line, which is where broken, noisy linework comes from. It is also
 * browser-only, so no server channel — SMS included — can reach it.
 */
import { generate } from '../../generation';
import { STENCIL_SHIELD_TOKENS } from '../../generation';
import { logger } from '@/lib/logger';

/**
 * Only flux-dev accepts an image-to-image input (see the generation
 * module's model catalog), so the stencil pass pins it explicitly rather
 * than inheriting the session's provider. This does not violate ADR-0016:
 * that pin exists so the four reveal variations stay comparable as a pick
 * signal, and the stencil is a derived deliverable, not a variation.
 */
const STENCIL_MODEL_ID = 'flux-dev';

/**
 * How far the prompt may pull away from the approved design. Lower keeps
 * more of the source composition; flux-dev's own default is 0.8, which is
 * tuned for reinterpreting an image rather than restyling it.
 *
 * UNVALIDATED: this value has not been measured against real output. It is
 * a starting point chosen to favour composition fidelity over stylistic
 * obedience, on the reasoning that a faithful-but-grey stencil is fixable
 * and a clean stencil of the wrong composition is not. Tune it against
 * actual renders before treating it as settled.
 */
const DEFAULT_PROMPT_STRENGTH = 0.65;

export function stencilPromptStrength(): number {
  const raw = Number(process.env.STENCIL_PROMPT_STRENGTH);
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : DEFAULT_PROMPT_STRENGTH;
}

/** Stencil derivation costs one render per session — off unless asked for. */
export function stencilDerivationEnabled(): boolean {
  return process.env.STENCIL_DERIVATION_ENABLED === 'true';
}

/**
 * The positive specification, which is the half the existing stencil shield
 * was missing. The shield lists what to avoid; a model still needs telling
 * what a stencil line IS — uniform weight, closed contours, flat black on
 * white — and that the source's layout must survive the restyle.
 */
const STENCIL_PROMPT =
  'Convert this design into a black and white tattoo stencil. ' +
  'Clean vector-style outlines only, uniform line weight, closed continuous contours, ' +
  'flat pure black lines on a pure white background. ' +
  'Preserve the exact composition, pose, proportions and placement of every element in the source image, ' +
  'with clear negative space between elements so the linework can be separated and rearranged.';

/** Colour is the one thing a stencil must not inherit from the source. */
const STENCIL_NEGATIVES = `color, colour ink, saturated hues, ${STENCIL_SHIELD_TOKENS}`;

export interface DerivedStencil {
  imageUrl: string;
  prompt: string;
}

/**
 * Render the stencil for an approved design. Returns null when derivation
 * is disabled or the render fails — a session that reaches an artist with
 * a colour design and no stencil is diminished, not broken, so this never
 * throws into the caller's flow.
 */
export async function deriveStencil(
  sessionId: string,
  sourceImageUrl: string
): Promise<DerivedStencil | null> {
  if (!stencilDerivationEnabled()) return null;

  try {
    const result = await generate({
      prompt: STENCIL_PROMPT,
      negativePrompt: STENCIL_NEGATIVES,
      modelId: STENCIL_MODEL_ID,
      numImages: 1,
      sourceImage: sourceImageUrl,
      sourceStrength: stencilPromptStrength(),
      isStencilMode: true,
      // Only flux-dev can honor sourceImage; falling back to a model that
      // cannot would silently return a stencil of a different design.
      allowProviderFallback: false,
    });

    const raw = result.images[0];
    if (!raw) return null;

    return {
      imageUrl: await durableStencilUrl(raw, sessionId),
      prompt: STENCIL_PROMPT,
    };
  } catch (error) {
    logger.warn({
      event_type: 'design_session.stencil_failed',
      session_id: sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Re-host the stencil in GCS unconditionally — including provider-hosted
 * URLs, which the reveal path deliberately passes through untouched.
 *
 * The reveal can afford that: its images are looked at within minutes.
 * The stencil is the file an artist opens at a consult days later, and
 * Replicate removes prediction outputs about an hour after they are
 * created (docs/research/2026-07-31-replicate-output-retention.md). A link
 * that dies before the appointment is not a handoff.
 */
async function durableStencilUrl(imageUrl: string, sessionId: string): Promise<string> {
  const { uploadToGCS } = await import('../../gcs-service');
  const destination = `design-sessions/${sessionId}/stencil-${Date.now()}.png`;

  if (imageUrl.startsWith('data:')) {
    const base64 = imageUrl.slice(imageUrl.indexOf(',') + 1);
    const upload = await uploadToGCS(Buffer.from(base64, 'base64'), destination);
    return upload.url;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch stencil for re-hosting: ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const upload = await uploadToGCS(bytes, destination);
  return upload.url;
}
