/**
 * Durable capture of a rendered design-session image (TAT-57).
 *
 * A provider image URL is transport, never storage. Replicate serves the
 * output of an API-created prediction from replicate.delivery and deletes it
 * about an hour later; Vertex Imagen hands back multi-megabyte inline base64
 * that a ~1MB Firestore document cannot hold at all. Either way the URL that
 * reaches the session — and from there the Brief and "My Designs" — has to be
 * a product-owned object in our own bucket.
 *
 * The object path is the idempotency key. It is derived from the session id,
 * the slot tag, and a fingerprint of the exact render inputs, so:
 *   - a retry of the same render reuses the staged object instead of paying
 *     the provider again, and never accumulates duplicate objects;
 *   - a retry whose prompt changed (the Council is not deterministic) gets its
 *     own object rather than silently serving the previous attempt's picture
 *     next to the new attempt's prompt.
 */
import { createHash } from 'crypto';
import {
  copyImageToPath,
  recoverImageAtPath,
  uploadImageToPath,
} from '@/services/storage';

export interface RenderIdentity {
  sessionId: string;
  /** Slot within the session: 'v1'…'v4', or '<pick>-refined'. */
  tag: string;
  prompt: string;
  negativePrompt?: string;
  modelId: string;
  /**
   * STABLE storage paths of attached reference photos (ADR-0050) — never
   * the signed URLs, which change on every mint and would defeat staged
   * recovery. Photos change what the image looks like, so two renders
   * differing only in attached photos must not collide on one object.
   */
  referenceImagePaths?: string[];
}

/** Short, stable digest of everything that decides what the image looks like. */
function renderFingerprint(identity: RenderIdentity): string {
  return createHash('sha256')
    .update(
      [
        identity.prompt,
        identity.negativePrompt ?? '',
        identity.modelId,
        ...(identity.referenceImagePaths ?? []),
      ].join('\0')
    )
    .digest('hex')
    .slice(0, 16);
}

/** Deterministic bucket path for one rendered image. */
export function durableObjectPath(identity: RenderIdentity): string {
  return `design-sessions/${identity.sessionId}/${identity.tag}-${renderFingerprint(identity)}.png`;
}

/** What one paid render produced, plus facts about HOW it was produced. */
export interface RenderOutput {
  /** Hosted provider URL or inline data URL. */
  image: string;
  /**
   * Facts that must survive a retry, staged INTO the object's metadata at
   * write time. The motivating fact is a downgrade (ADR-0048): the staging
   * fingerprint keys on the REQUESTED modelId, so without this a staged
   * fallback render recovered by a later confirm attempt is indistinguishable
   * from a clean one — the downgrade would go undisclosed and unrefunded,
   * and the information would be gone, not just delayed.
   */
  metadata?: Record<string, string>;
}

export interface DurableRenderResult {
  imageUrl: string;
  /**
   * The render facts, whether this call paid for the render or recovered a
   * previous attempt's staged copy. Storage metadata values not written by
   * a RenderOutput (e.g. sourceHost, uploadedAt) appear here too.
   */
  metadata: Record<string, string>;
}

/**
 * Produce one durable image for `identity`, returning a product-owned URL
 * plus the render facts staged with it.
 *
 * `render` is the paid provider call; it is invoked only when nothing is
 * already staged at the deterministic path. Anything it returns — a hosted
 * provider URL or an inline data URL — is copied into our bucket before this
 * resolves, together with its metadata, so a retry that reuses the staged
 * object recovers the facts of the render it is reusing.
 *
 * Failure to make the copy is a failed generation, and it throws. There is no
 * degrade-to-provider-URL fallback on purpose: handing back a link that dies
 * within the hour looks like success to every caller, persists into the
 * session and "My Designs", and only surfaces later as a design the customer
 * can no longer see. A visible failure they can retry is the better outcome.
 */
export async function durableRender(
  identity: RenderIdentity,
  render: () => Promise<RenderOutput>
): Promise<DurableRenderResult> {
  const objectPath = durableObjectPath(identity);

  // A previous attempt may have paid for and staged this exact render before
  // failing further along (another variation threw, or the session write did).
  // Reusing it is what stops a retry from re-buying the generation — and the
  // staged metadata is what stops the reuse from erasing how that render
  // was actually produced.
  const staged = await recoverImageAtPath(objectPath);
  if (staged) return { imageUrl: staged.imageUrl, metadata: staged.metadata };

  const { image: rendered, metadata = {} } = await render();
  if (!rendered) {
    throw new Error(`Generation returned no image for ${identity.tag}`);
  }

  const imageUrl = rendered.startsWith('data:')
    ? await uploadImageToPath(objectPath, decodeDataUrl(rendered), metadata)
    : await copyImageToPath(objectPath, rendered, metadata);
  return { imageUrl, metadata };
}

function decodeDataUrl(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
}
